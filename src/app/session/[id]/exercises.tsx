import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { ExerciseLineEditor } from '@/components/exercise-line-editor';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSessionSave } from '@/hooks/use-session-save';
import { useWorkoutSession } from '@/hooks/use-workout-session';
import {
  type DraftLine,
  deriveCounters,
  fromDraftLines,
  MAX_SESSION_LINES,
  pruneExerciseNotes,
  toDraftLines,
} from '@/lib/session-edit';
import type { WorkoutSession } from '@/types/workout';

export default function EditSessionExercisesScreen() {
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

  return <ExercisesForm key={session.id} session={session} />;
}

function ExercisesForm({ session }: { session: WorkoutSession }) {
  const { save, isSaving, error } = useSessionSave(session.id);

  // Seeded once from the loaded session. The live subscription keeps running
  // underneath, but re-seeding on every snapshot would overwrite what is being
  // typed — including this screen's own save echoing back.
  const [lines, setLines] = useState<DraftLine[]>(() => toDraftLines(session.lines));
  const [notes, setNotes] = useState<Record<string, string>>(
    () => session.exerciseNotesByLineId ?? {},
  );

  const overLimit = lines.length > MAX_SESSION_LINES;

  async function handleSave() {
    if (overLimit || isSaving) return;

    const nextLines = fromDraftLines(lines);

    const saved = await save({
      lines: nextLines,
      exerciseNotesByLineId: pruneExerciseNotes(notes, nextLines),
      // Denormalized counters the list screens read; stale ones make the list lie.
      ...deriveCounters(nextLines),
    });

    if (saved) router.back();
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {lines.map((line, index) => (
          <ExerciseLineEditor
            key={line.lineId}
            line={line}
            note={notes[line.lineId] ?? ''}
            disabled={isSaving}
            onChangeLine={(next) =>
              setLines((current) => current.map((l, i) => (i === index ? next : l)))
            }
            onChangeNote={(note) => setNotes((current) => ({ ...current, [line.lineId]: note }))}
            onRemove={() => setLines((current) => current.filter((_, i) => i !== index))}
          />
        ))}

        {lines.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            This workout has no exercises left. Saving now will empty it.
          </ThemedText>
        ) : null}

        {overLimit ? (
          <ThemedText type="small" themeColor="danger">
            A workout can hold at most {MAX_SESSION_LINES} exercises.
          </ThemedText>
        ) : null}

        {error ? (
          <ThemedText type="small" themeColor="danger">
            {error}
          </ThemedText>
        ) : null}

        <ActionButton label="Save" onPress={handleSave} disabled={overLimit} busy={isSaving} />
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
});
