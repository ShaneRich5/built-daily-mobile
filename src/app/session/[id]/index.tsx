import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { ExerciseLineCard } from '@/components/exercise-line-card';
import { MuscleChart } from '@/components/muscle-chart';
import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useWorkoutSession } from '@/hooks/use-workout-session';
import { sessionDayLabel, sessionDurationLabel, sessionVolumeLabel } from '@/lib/session-format';

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, isLoading, notFound, error } = useWorkoutSession(id);

  if (isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (error || notFound) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="small" themeColor={error ? 'danger' : 'textSecondary'}>
          {error ?? 'This workout no longer exists.'}
        </ThemedText>
      </ThemedView>
    );
  }

  if (!session) return null;

  const duration = sessionDurationLabel(session.activeDurationSec);

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedView style={styles.heading}>
          <ThemedText type="subtitle">{session.title || 'Untitled workout'}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {[sessionDayLabel(session), session.workoutTime, duration].filter(Boolean).join(' · ')}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {sessionVolumeLabel(session)}
          </ThemedText>
          <StatusBadge status={session.status} />

          <View style={styles.actions}>
            <ActionButton
              label="Edit details"
              variant="secondary"
              onPress={() => router.push(`/session/${session.id}/edit`)}
              style={styles.action}
            />
            <ActionButton
              label="Edit exercises"
              variant="secondary"
              onPress={() => router.push(`/session/${session.id}/exercises`)}
              style={styles.action}
            />
          </View>
        </ThemedView>

        {session.workoutNote ? (
          <ThemedView type="backgroundElement" style={styles.note}>
            <ThemedText type="small">{session.workoutNote}</ThemedText>
          </ThemedView>
        ) : null}

        {session.lines.length > 0 ? <MuscleChart lines={session.lines} /> : null}

        {session.lines.map((line) => (
          <ExerciseLineCard
            key={line.lineId}
            line={line}
            note={session.exerciseNotesByLineId?.[line.lineId] ?? null}
          />
        ))}

        {session.lines.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            No exercises were recorded for this workout.
          </ThemedText>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  content: {
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    padding: Spacing.three,
    width: '100%',
  },
  heading: {
    gap: Spacing.one,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  action: {
    flex: 1,
  },
  note: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
});
