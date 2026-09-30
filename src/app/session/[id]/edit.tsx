import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { FormField } from '@/components/form-field';
import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSessionSave } from '@/hooks/use-session-save';
import { useWorkoutSession } from '@/hooks/use-workout-session';
import {
  applyStatusTransition,
  blankToNull,
  isValidWorkoutDate,
  isValidWorkoutTime,
} from '@/lib/session-edit';
import { sessionStatusLabel } from '@/lib/session-format';
import type { SessionStatus, WorkoutSession } from '@/types/workout';

/** Where each status can go next. A discarded workout is reopened, not finished. */
const NEXT_STATUSES: Record<SessionStatus, readonly SessionStatus[]> = {
  in_progress: ['completed', 'discarded'],
  completed: ['in_progress', 'discarded'],
  discarded: ['in_progress'],
};

export default function EditSessionDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, isLoading, notFound, error } = useWorkoutSession(id);

  if (isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (error || notFound || !session) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="small" themeColor={error ? 'danger' : 'textSecondary'}>
          {error ?? 'This workout no longer exists.'}
        </ThemedText>
      </ThemedView>
    );
  }

  // Keyed on the session id so the form state is rebuilt, not reused, if the
  // screen is ever reached for a different workout.
  return <DetailsForm key={session.id} session={session} />;
}

function DetailsForm({ session }: { session: WorkoutSession }) {
  const { save, isSaving, error } = useSessionSave(session.id);

  const [title, setTitle] = useState(session.title);
  const [workoutDate, setWorkoutDate] = useState(session.workoutDate ?? '');
  const [workoutTime, setWorkoutTime] = useState(session.workoutTime ?? '');
  const [workoutNote, setWorkoutNote] = useState(session.workoutNote ?? '');

  // Both fields are optional; only a non-empty value has to parse.
  const dateError =
    workoutDate.trim().length > 0 && !isValidWorkoutDate(workoutDate.trim())
      ? 'Use YYYY-MM-DD, e.g. 2026-09-29.'
      : null;
  const timeError =
    workoutTime.trim().length > 0 && !isValidWorkoutTime(workoutTime.trim())
      ? 'Use HH:mm on a 24-hour clock, e.g. 18:30.'
      : null;

  const canSave = !dateError && !timeError && !isSaving;

  async function handleSave() {
    if (!canSave) return;

    const saved = await save({
      title: title.trim(),
      workoutDate: blankToNull(workoutDate),
      workoutTime: blankToNull(workoutTime),
      workoutNote: blankToNull(workoutNote),
    });

    if (saved) router.back();
  }

  async function handleStatus(next: SessionStatus) {
    const saved = await save(applyStatusTransition(session, next));
    if (saved) router.back();
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <FormField
          label="Title"
          value={title}
          onChangeText={setTitle}
          placeholder="Untitled workout"
          editable={!isSaving}
        />

        <FormField
          label="Date"
          value={workoutDate}
          onChangeText={setWorkoutDate}
          placeholder="YYYY-MM-DD"
          error={dateError}
          hint="Leave blank to keep this workout off a specific day."
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
          editable={!isSaving}
        />

        <FormField
          label="Time"
          value={workoutTime}
          onChangeText={setWorkoutTime}
          placeholder="HH:mm"
          error={timeError}
          hint="24-hour clock."
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
          editable={!isSaving}
        />

        <FormField
          label="Workout note"
          value={workoutNote}
          onChangeText={setWorkoutNote}
          placeholder="How did it go?"
          multiline
          numberOfLines={4}
          style={styles.noteInput}
          editable={!isSaving}
        />

        <View style={styles.statusBlock}>
          <ThemedText type="small" themeColor="textSecondary">
            Status
          </ThemedText>
          <StatusBadge status={session.status} />

          {NEXT_STATUSES[session.status].map((next) => (
            <ActionButton
              key={next}
              label={`Mark ${sessionStatusLabel(next).toLowerCase()}`}
              variant={next === 'discarded' ? 'danger' : 'secondary'}
              onPress={() => handleStatus(next)}
              busy={isSaving}
            />
          ))}
        </View>

        {error ? (
          <ThemedText type="small" themeColor="danger">
            {error}
          </ThemedText>
        ) : null}

        <ActionButton label="Save" onPress={handleSave} disabled={!canSave} busy={isSaving} />
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
  noteInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  statusBlock: {
    gap: Spacing.two,
  },
});
