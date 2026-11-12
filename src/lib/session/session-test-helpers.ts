import type { CatalogExercise } from '@/lib/exercise-catalog';
import { EMPTY_SET } from '@/lib/session-edit';
import type { SessionExercise } from '@/lib/session/session-model';
import type { SessionState } from '@/lib/session/session-reducer';
import { emptySetRow, type SetRow } from '@/lib/session/set-row';
import type { SessionLine, SessionStatus, SetLog, WorkoutSession } from '@/types/workout';

/**
 * Builders shared by the session tests. Not a test file itself — the name ends
 * in `-helpers` rather than `.test` so Jest does not try to run it.
 */

export const bench: CatalogExercise = { id: 'custom-bench', name: 'Bench', metric: 'weight_reps' };
export const fly: CatalogExercise = { id: 'custom-fly', name: 'Cable fly', metric: 'weight_reps' };
export const dips: CatalogExercise = { id: 'custom-dips', name: 'Dips', metric: 'bodyweight_reps' };
export const plank: CatalogExercise = { id: 'custom-plank', name: 'Plank', metric: 'duration' };

export const row = (overrides: Partial<SetRow> = {}): SetRow => ({
  ...emptySetRow(),
  ...overrides,
});

export const log = (overrides: Partial<SetLog> = {}): SetLog => ({ ...EMPTY_SET, ...overrides });

export const doneRow = (weight = '135', reps = '8'): SetRow => row({ weight, reps, done: true });

export function item(
  exercise: CatalogExercise,
  overrides: Partial<SessionExercise> = {},
): SessionExercise {
  return {
    lineId: `line-${exercise.id}`,
    exercise,
    sets: [emptySetRow()],
    note: '',
    section: 'plan',
    alternates: [],
    ...overrides,
  };
}

export function state(
  exercises: SessionExercise[],
  overrides: Partial<SessionState> = {},
): SessionState {
  return {
    title: 'Push day',
    workoutDate: '2026-11-10',
    workoutTime: '18:10',
    workoutNote: '',
    exercises,
    openLineId: null,
    ...overrides,
  };
}

export function line(exercise: CatalogExercise, sets: SetLog[]): SessionLine {
  return {
    lineId: `line-${exercise.id}`,
    exerciseId: exercise.id,
    nameSnapshot: exercise.name,
    metric: exercise.metric,
    sets,
  };
}

export function session(
  id: string,
  lines: SessionLine[],
  overrides: Partial<WorkoutSession> = {},
): WorkoutSession {
  const status: SessionStatus = overrides.status ?? 'completed';

  return {
    id,
    status,
    title: 'Push day',
    planId: null,
    workoutDate: '2026-11-10',
    workoutTime: '18:10',
    startedAt: new Date(2026, 10, 10, 18, 10),
    endedAt: status === 'completed' ? new Date(2026, 10, 10, 19, 0) : null,
    activeDurationSec: null,
    workoutNote: null,
    exerciseNotesByLineId: null,
    lines,
    exerciseCount: lines.length,
    setCount: lines.reduce((total, l) => total + l.sets.length, 0),
    previewExerciseNames: lines.map((l) => l.nameSnapshot),
    ...overrides,
  };
}
