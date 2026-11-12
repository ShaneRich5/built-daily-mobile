import { router } from 'expo-router';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ListRow } from '@/components/ui/list-row';
import { PageHeader } from '@/components/ui/page-header';
import { screenContentStyle } from '@/components/ui/screen';
import { useRecentSessions } from '@/hooks/use-recent-sessions';
import { useTheme } from '@/hooks/use-theme';
import { sessionDayLabel, sessionVolumeLabel } from '@/lib/session-format';

/**
 * Every recent workout, newest first, with any still in progress pinned to the
 * top. Home shows the last few; this is "See all".
 */
export default function HistoryScreen() {
  const theme = useTheme();
  const { sessions, isLoading, isRefreshing, refresh, error } = useRecentSessions();

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
        ListHeaderComponent={<PageHeader title="Workout history" />}
        renderItem={({ item }) => (
          <ListRow
            title={item.title || 'Untitled workout'}
            meta={`${sessionDayLabel(item)} · ${sessionVolumeLabel(item)}`}
            trailing={item.status === 'in_progress' ? <StatusBadge status={item.status} /> : undefined}
            onPress={() => router.push(`/session/${item.id}`)}
          />
        )}
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
  empty: {
    alignItems: 'center',
    paddingVertical: 32,
  },
});
