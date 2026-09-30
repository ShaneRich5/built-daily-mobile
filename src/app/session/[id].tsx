import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';

import { ExerciseLineCard } from '@/components/exercise-line-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useWorkoutSession } from '@/hooks/use-workout-session';
import {
  isUnfinished,
  sessionDayLabel,
  sessionDurationLabel,
  sessionVolumeLabel,
} from '@/lib/session-format';

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
          {isUnfinished(session.status) ? (
            <ThemedText type="small" themeColor="tint">
              In progress
            </ThemedText>
          ) : null}
        </ThemedView>

        {session.workoutNote ? (
          <ThemedView type="backgroundElement" style={styles.note}>
            <ThemedText type="small">{session.workoutNote}</ThemedText>
          </ThemedView>
        ) : null}

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
  note: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
});
