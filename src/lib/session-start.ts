import type { CatalogExercise } from '@/lib/exercise-catalog';
import { deriveCounters, EMPTY_SET, MAX_SESSION_LINES } from '@/lib/session-edit';
import type { SessionLine, SetLog, WorkoutPlan, WorkoutSession } from '@/types/workout';

/** A session that has not been written yet, so it has no id of its own. */
export type NewSession = Omit<WorkoutSession, 'id'>;

/** Mints the id for a line. Passed in so this module stays deterministic. */
export type LineIdFactory = () => string;

/**
 * How many empty sets a planned line opens with. A plan that asks for four sets
 * puts four rows on screen ready to be filled; anything outside this range is
 * treated as unset and opens with one, so a stray `targetSets: 500` cannot
 * build a session nobody can scroll.
 */
const MAX_PLANNED_SETS = 20;

/** The user's own local calendar day, `YYYY-MM-DD` — never UTC. */
export function localWorkoutDate(now: Date): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Local wall clock, `HH:mm` on a 24-hour clock. */
export function localWorkoutTime(now: Date): string {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

/** What an unnamed workout is called, matching the web app's `Workout on {date}`. */
export function defaultSessionTitle(now: Date): string {
  return `Workout on ${localWorkoutDate(now)}`;
}

/**
 * A workout that is starting now: in progress, dated today, and with no end.
 *
 * `endedAt` stays null for exactly as long as the session is in progress — the
 * recent-sessions query orders on it — and the counters are written from the
 * start so the list screens never have to fall back to counting lines.
 */
export function blankSession(now: Date, title?: string): NewSession {
  return sessionWithLines([], now, title?.trim() || defaultSessionTitle(now), null);
}

/**
 * A workout built from a saved plan: the plan's exercises, each opened with as
 * many empty sets as it asks for, and the plan's per-line notes carried over as
 * the session's exercise notes.
 *
 * The plan is copied, not referenced: `nameSnapshot` and `metric` are taken as
 * they read today, so editing the template later cannot rewrite this workout's
 * history. `planId` records where it came from.
 */
export function sessionFromPlan(
  plan: WorkoutPlan,
  now: Date,
  newLineId: LineIdFactory,
): NewSession {
  const lines: SessionLine[] = plan.lines.slice(0, MAX_SESSION_LINES).map((planLine) => ({
    lineId: newLineId(),
    exerciseId: planLine.exerciseId,
    nameSnapshot: planLine.nameSnapshot,
    metric: planLine.metric,
    sets: emptySets(planLine.targetSets),
  }));

  const notes = Object.fromEntries(
    plan.lines
      .slice(0, MAX_SESSION_LINES)
      .map((planLine, index) => [lines[index].lineId, planLine.notes])
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );

  const session = sessionWithLines(lines, now, plan.name.trim() || defaultSessionTitle(now), plan.id);

  return {
    ...session,
    exerciseNotesByLineId: Object.keys(notes).length > 0 ? notes : null,
  };
}

/** One more exercise to log, picked from the catalog or named by the user. */
export function newSessionLine(exercise: CatalogExercise, lineId: string): SessionLine {
  return {
    lineId,
    exerciseId: exercise.id,
    nameSnapshot: exercise.name,
    metric: exercise.metric,
    sets: [{ ...EMPTY_SET }],
  };
}

function emptySets(targetSets: number | null): SetLog[] {
  const count =
    targetSets !== null && targetSets >= 1 && targetSets <= MAX_PLANNED_SETS
      ? Math.floor(targetSets)
      : 1;

  return Array.from({ length: count }, emptySet);
}

function emptySet(): SetLog {
  return { ...EMPTY_SET };
}

function sessionWithLines(
  lines: SessionLine[],
  now: Date,
  title: string,
  planId: string | null,
): NewSession {
  return {
    status: 'in_progress',
    title,
    planId,
    workoutDate: localWorkoutDate(now),
    workoutTime: localWorkoutTime(now),
    startedAt: now,
    endedAt: null,
    activeDurationSec: null,
    workoutNote: null,
    exerciseNotesByLineId: null,
    lines,
    ...deriveCounters(lines),
  };
}
