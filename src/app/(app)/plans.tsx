import { ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlanRow } from '@/components/plan-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { usePlans } from '@/hooks/use-plans';
import { useStartWorkout } from '@/hooks/use-start-workout';

/**
 * The saved templates, newest edit first. Plans are built on the web and only
 * read here — what mobile adds is starting a workout from one.
 */
export default function PlansScreen() {
  const { plans, isLoading, error } = usePlans();
  const { start, startingPlanId, error: startError } = useStartWorkout();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <FlatList
          data={plans}
          keyExtractor={(plan) => plan.id}
          renderItem={({ item }) => (
            <PlanRow plan={item} onStart={start} busy={startingPlanId === item.id} />
          )}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <>
              <ThemedText type="subtitle">Plans</ThemedText>
              {startError ? (
                <ThemedText type="small" themeColor="danger">
                  {startError}
                </ThemedText>
              ) : null}
            </>
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
      No plans yet. Templates you save on the website will show up here.
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    marginBottom: BottomTabInset,
  },
  listContent: {
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    padding: Spacing.three,
    width: '100%',
  },
  empty: {
    paddingTop: Spacing.three,
  },
});
