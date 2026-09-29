import { ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccountCard } from '@/components/account-card';
import { SessionRow } from '@/components/session-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useRecentSessions } from '@/hooks/use-recent-sessions';

export default function HomeScreen() {
  const { sessions, isLoading, error } = useRecentSessions();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <FlatList
          data={sessions}
          keyExtractor={(session) => session.id}
          renderItem={({ item }) => <SessionRow session={item} />}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <ThemedView style={styles.header}>
              <AccountCard />
              <ThemedText type="subtitle">Recent workouts</ThemedText>
            </ThemedView>
          }
          ListEmptyComponent={<EmptyState isLoading={isLoading} error={error} />}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

function EmptyState({ isLoading, error }: { isLoading: boolean; error: string | null }) {
  if (isLoading) {
    return <ActivityIndicator style={styles.empty} />;
  }

  if (error) {
    return (
      <ThemedText type="small" themeColor="danger" style={styles.empty}>
        {error}
      </ThemedText>
    );
  }

  return (
    <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
      No workouts yet. Anything you log on the website will show up here.
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  listContent: {
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    paddingBottom: BottomTabInset + Spacing.four,
    paddingHorizontal: Spacing.three,
    width: '100%',
  },
  header: {
    gap: Spacing.three,
    paddingBottom: Spacing.two,
  },
  empty: {
    paddingVertical: Spacing.four,
    textAlign: 'center',
  },
});
