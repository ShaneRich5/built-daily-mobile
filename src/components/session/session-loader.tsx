import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { useWorkoutSession } from '@/hooks/use-workout-session';
import type { WorkoutSession } from '@/types/workout';

type SessionLoaderProps = {
  sessionId: string | undefined;
  /** Rendered once the workout has loaded. */
  children: (session: WorkoutSession) => ReactNode;
};

/**
 * Loads one workout for a route, and covers the three ways that can go without
 * a workout to show: still loading, failed, or not there (deleted, or a link
 * to someone else's).
 */
export function SessionLoader({ sessionId, children }: SessionLoaderProps) {
  const { session, isLoading, notFound, error } = useWorkoutSession(sessionId);

  if (session) return children(session);

  return (
    <Screen scroll={false} edges={['top', 'bottom']}>
      <View style={styles.centered}>
        {isLoading ? (
          <ActivityIndicator />
        ) : (
          <>
            <ThemedText type="small" themeColor={error ? 'danger' : 'textSecondary'}>
              {error ?? (notFound ? 'This workout no longer exists.' : 'Could not load this workout.')}
            </ThemedText>
            <Button
              label="Back to Home"
              variant="secondary"
              onPress={() => router.replace('/')}
            />
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    flex: 1,
    gap: 16,
    justifyContent: 'center',
    padding: 24,
  },
});
