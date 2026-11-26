import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { CheckIcon } from '@/components/ui/icons';
import { ListRow } from '@/components/ui/list-row';
import { PageHeader } from '@/components/ui/page-header';
import { screenContentStyle } from '@/components/ui/screen';
import { Radius } from '@/constants/theme';
import { useSession } from '@/contexts/session';
import { useRecentSessions } from '@/hooks/use-recent-sessions';
import { useTheme } from '@/hooks/use-theme';
import { sessionDayLabel, sessionVolumeLabel } from '@/lib/session-format';
import { confirm } from '@/services/confirm';
import { deleteSessions } from '@/services/firestore/workout-repository';
import { syncGroups } from '@/services/group-sync';

/**
 * Every recent workout, newest first, with any still in progress pinned to the
 * top. Home shows the last few; this is "See all". "Select" picks several to
 * delete at once, as History does on the web.
 */
export function HistoryScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const { sessions, isLoading, isRefreshing, refresh, error } = useRecentSessions();
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Only ids still in the list count, so a workout deleted elsewhere drops out.
  const pickedIds = sessions.filter((session) => picked.has(session.id)).map((s) => s.id);

  const toggle = (id: string) =>
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const stopSelecting = () => {
    setSelecting(false);
    setPicked(new Set());
    setDeleteError(null);
  };

  const deletePicked = async () => {
    if (!user || pickedIds.length === 0) return;
    const count = pickedIds.length;
    const ok = await confirm({
      title: `Delete ${count} ${count === 1 ? 'workout' : 'workouts'}?`,
      message: 'They’re gone for good, here and on the website.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;

    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteSessions(user.uid, pickedIds);
      // The days trained are what groups see; keep them in step.
      syncGroups(user);
      stopSelecting();
    } catch {
      setDeleteError('Couldn’t delete them all. Check your connection and try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: theme.background }]}>
      <FlatList
        data={sessions}
        keyExtractor={(session) => session.id}
        contentContainerStyle={[screenContentStyle, styles.list]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            // The default spinner is near-invisible on a dark background.
            tintColor={theme.textSecondary}
            colors={[theme.tint]}
            progressBackgroundColor={theme.surface}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <PageHeader title="Workout history" />
            {sessions.length > 0 ? (
              <Button
                label={selecting ? 'Done' : 'Select'}
                variant="ghost"
                size="sm"
                onPress={selecting ? stopSelecting : () => setSelecting(true)}
              />
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          const isPicked = picked.has(item.id);
          const title = item.title || 'Untitled workout';
          return (
            <ListRow
              title={title}
              meta={`${sessionDayLabel(item)} · ${sessionVolumeLabel(item)}`}
              accessibilityLabel={selecting ? `${title}${isPicked ? ', selected' : ''}` : undefined}
              leading={
                selecting ? (
                  <View
                    style={[
                      styles.ring,
                      isPicked
                        ? { backgroundColor: theme.tint, borderColor: theme.tint }
                        : { borderColor: theme.borderStrong },
                    ]}>
                    {isPicked ? <CheckIcon size={14} color={theme.onTint} strokeWidth={3} /> : null}
                  </View>
                ) : undefined
              }
              trailing={
                selecting ? (
                  <View />
                ) : item.status === 'in_progress' ? (
                  <StatusBadge status={item.status} />
                ) : undefined
              }
              onPress={() => (selecting ? toggle(item.id) : router.push(`/session/${item.id}`))}
            />
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            {isLoading ? (
              <ActivityIndicator />
            ) : (
              <ThemedText type="small" themeColor={error ? 'danger' : 'textSecondary'}>
                {error ?? 'No workouts yet. Anything you log here or on the website shows up here.'}
              </ThemedText>
            )}
          </View>
        }
      />

      {selecting ? (
        <View
          style={[
            styles.bar,
            {
              backgroundColor: theme.surface,
              borderTopColor: theme.border,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}>
          {deleteError ? (
            <ThemedText type="small" themeColor="danger" accessibilityRole="alert">
              {deleteError}
            </ThemedText>
          ) : null}
          <Button
            label={
              pickedIds.length === 0
                ? 'Pick workouts to delete'
                : `Delete ${pickedIds.length} ${pickedIds.length === 1 ? 'workout' : 'workouts'}`
            }
            variant="danger"
            size="lg"
            busy={deleting}
            disabled={pickedIds.length === 0}
            onPress={() => void deletePicked()}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  list: {
    gap: 8,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ring: {
    alignItems: 'center',
    borderRadius: Radius.full,
    borderWidth: 2,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  bar: {
    borderTopWidth: 1,
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
});
