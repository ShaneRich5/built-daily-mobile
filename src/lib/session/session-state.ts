import { findCatalogExercise, type CatalogExercise } from '@/lib/exercise-catalog';
import { alternateFromExercise, exerciseFromAlternate } from '@/lib/line-grouping';
import { deriveCounters, isValidWorkoutDate, isValidWorkoutTime } from '@/lib/session-edit';
import { defaultSessionTitle } from '@/lib/session-start';
import {
  exerciseProgress,
  isUntouchedMaybe,
  type SessionExercise,
} from '@/lib/session/session-model';
import type { SessionState } from '@/lib/session/session-reducer';
import {
  emptySetRow,
  NOTE_MAX,
  setLogToSetRow,
  setRowHasMeasurements,
  setRowToSetLog,
} from '@/lib/session/set-row';
import type { SessionLine, WorkoutSession } from '@/types/workout';

/**
 * The fields of a session the workout screen owns. Everything else on the
 * document — status, `startedAt`, `endedAt`, `planId`, `activeDurationSec` — is
 * left alone by a content save.
 */
export type SessionContent = Pick<
  WorkoutSession,
  | 'title'
  | 'workoutDate'
  | 'workoutTime'
  | 'workoutNote'
  | 'exerciseNotesByLineId'
  | 'lines'
  | 'exerciseCount'
  | 'setCount'
  | 'previewExerciseNames'
>;

/**
 * The exercise a stored line refers to: the catalog's entry when the id is one
 * it knows and the metric still matches, else the line's own snapshot — which
 * is all there is for a custom move.
 */
export function exerciseFromLine(
  line: Pick<SessionLine, 'exerciseId' | 'nameSnapshot' | 'metric'>,
): CatalogExercise {
  const fromCatalog = findCatalogExercise(line.exerciseId);
  if (fromCatalog && fromCatalog.metric === line.metric) {
    // The name as it was logged, so history reads the way it was written.
    return { ...fromCatalog, name: line.nameSnapshot || fromCatalog.name };
  }

  return { id: line.exerciseId, name: line.nameSnapshot, metric: line.metric };
}

/** A stored session → the state the workout screen edits. */
export function sessionStateFrom(session: WorkoutSession): SessionState {
  const exercises: SessionExercise[] = session.lines.map((line) => ({
    lineId: line.lineId,
    exercise: exerciseFromLine(line),
    // An exercise always has a row to type into.
    sets: line.sets.length > 0 ? line.sets.map(setLogToSetRow) : [emptySetRow()],
    note: session.exerciseNotesByLineId?.[line.lineId] ?? '',
    section: line.section ?? 'plan',
    alternates: (line.alternates ?? []).map(exerciseFromAlternate),
  }));

  return {
    title: session.title,
    workoutDate: session.workoutDate ?? '',
    workoutTime: session.workoutTime ?? '',
    workoutNote: session.workoutNote ?? '',
    exercises,
    // Resume where you left off: the first planned exercise with sets still to do.
    openLineId:
      exercises.find((item) => item.section === 'plan' && exerciseProgress(item.sets) !== 'done')
        ?.lineId ?? null,
  };
}

function lineFromExercise(item: SessionExercise, finished: boolean): SessionLine {
  const line: SessionLine = {
    lineId: item.lineId,
    exerciseId: item.exercise.id,
    nameSnapshot: item.exercise.name,
    metric: item.exercise.metric,
    sets: item.sets.map((row) =>
      setRowToSetLog(
        finished && setRowHasMeasurements(row) ? { ...row, done: true } : row,
        item.exercise.metric,
      ),
    ),
  };

  // Stored only when they say something, as the web app writes them.
  if (item.section === 'maybe') line.section = 'maybe';
  if (item.alternates.length > 0) line.alternates = item.alternates.map(alternateFromExercise);

  return line;
}

/**
 * The state → what a save writes.
 *
 * Shaped to pass the Firestore rules on its own: a title is never empty (an
 * unnamed workout is "Workout on {date}", as on the web), a date or time that
 * is not valid is stored as null rather than as typed, notes are trimmed to
 * their limits, and the denormalized counters are rewritten with the lines.
 *
 * `finished` is for editing a workout that is already complete. There the
 * screen has no ticks to press, so a set with numbers in it is stored as done:
 * a set added while correcting an old workout was done back then. An empty row
 * stays not done either way.
 */
export function sessionContent(
  state: SessionState,
  startedAt: Date,
  { finished = false }: { finished?: boolean } = {},
): SessionContent {
  const lines = state.exercises.map((item) => lineFromExercise(item, finished));

  const notes = Object.fromEntries(
    state.exercises
      .map((item) => [item.lineId, item.note.trim().slice(0, NOTE_MAX.exercise)] as const)
      .filter(([, note]) => note.length > 0),
  );

  const date = state.workoutDate.trim();
  const time = state.workoutTime.trim();

  return {
    title: state.title.trim().slice(0, NOTE_MAX.title) || defaultSessionTitle(startedAt),
    workoutDate: isValidWorkoutDate(date) ? date : null,
    workoutTime: isValidWorkoutTime(time) ? time : null,
    workoutNote: state.workoutNote.trim().slice(0, NOTE_MAX.workout) || null,
    exerciseNotesByLineId: Object.keys(notes).length > 0 ? notes : null,
    lines,
    ...deriveCounters(lines),
  };
}

/** What Finish saves: everything except maybes that were never started. */
export function finishState(state: SessionState): SessionState {
  return { ...state, exercises: state.exercises.filter((item) => !isUntouchedMaybe(item)) };
}
