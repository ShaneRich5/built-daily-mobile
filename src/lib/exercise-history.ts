import type { ExerciseMetric, SetLog, WorkoutSession } from '@/types/workout';

/**
 * What an exercise looked like the last time it was done.
 *
 * Built by scanning sessions the app has already read, not by querying: a
 * session's exercises live in an embedded `lines` array, and Firestore cannot
 * filter on a field inside an array of maps. Asking "when did I last bench"
 * would need a denormalized `exerciseIds` array on every session document,
 * written by both clients — so until that exists, the recent workouts already
 * on hand are the lookup.
 *
 * That bounds the window: an exercise not done within the sessions provided
 * has no history here, and the hint is simply absent rather than wrong.
 */
export type ExercisePerformance = {
  sessionId: string;
  performedAt: Date;
  /** The day the lifter filed it under, when they set one. */
  workoutDate: string | null;
  metric: ExerciseMetric;
  /** Only the sets that recorded something. */
  sets: SetLog[];
};

/** Whether a set recorded anything at all, in any of the fields a metric uses. */
export function isLoggedSet(set: SetLog): boolean {
  return (
    set.weight !== null ||
    set.reps !== null ||
    set.durationSec !== null ||
    set.timedSetSec !== null ||
    set.paceMph !== null ||
    set.inclinePercent !== null ||
    set.resistanceLevel !== null ||
    set.distanceMiles !== null
  );
}

/**
 * Whether a set is checked off.
 *
 * `done` was added to the document late. A set without it — logged before the
 * field existed, or written by the MCP server — counts as done when it recorded
 * something, which is how the web app reads the same documents
 * (`isSetLogDone`). An explicit `false` is respected: that is a set with
 * numbers typed in but not yet ticked.
 */
export function isSetDone(set: SetLog): boolean {
  return set.done ?? isLoggedSet(set);
}

/** When a workout happened, for ranking one against another. */
function performedAt(session: WorkoutSession): Date {
  return session.endedAt ?? session.startedAt;
}

/**
 * The most recent performance of each exercise, keyed by `exerciseId`.
 *
 * Only completed workouts count: a session still in progress is a workout
 * being typed, and half-entered numbers are a poor thing to start the next one
 * from. `excludeSessionId` keeps the workout on screen out of its own history,
 * which matters when an already-completed one is reopened for editing.
 */
export function lastPerformanceByExercise(
  sessions: readonly WorkoutSession[],
  excludeSessionId?: string,
): Map<string, ExercisePerformance> {
  const latest = new Map<string, ExercisePerformance>();

  for (const [exerciseId, performances] of performancesByExercise(sessions, excludeSessionId)) {
    latest.set(exerciseId, performances[0]);
  }

  return latest;
}

/**
 * Every time each exercise was done within the sessions given, newest first,
 * keyed by `exerciseId`. The same rules as above: completed workouts only, the
 * one on screen left out, and only sets that recorded something.
 *
 * An exercise that appears twice in one workout contributes both lines, in the
 * order they were done.
 */
export function performancesByExercise(
  sessions: readonly WorkoutSession[],
  excludeSessionId?: string,
): Map<string, ExercisePerformance[]> {
  const byExercise = new Map<string, ExercisePerformance[]>();

  const newestFirst = sessions
    .filter((session) => session.status === 'completed' && session.id !== excludeSessionId)
    .map((session) => ({ session, when: performedAt(session) }))
    .sort((a, b) => b.when.getTime() - a.when.getTime());

  for (const { session, when } of newestFirst) {
    for (const line of session.lines) {
      const sets = line.sets.filter(isLoggedSet);
      if (sets.length === 0) continue;

      const performance: ExercisePerformance = {
        sessionId: session.id,
        performedAt: when,
        workoutDate: session.workoutDate,
        metric: line.metric,
        sets,
      };

      const known = byExercise.get(line.exerciseId);
      if (known) {
        known.push(performance);
      } else {
        byExercise.set(line.exerciseId, [performance]);
      }
    }
  }

  return byExercise;
}

/**
 * The sets to open an exercise with, copied from last time.
 *
 * Numbers carry over — that is the point, a lifter repeats or nudges the last
 * weight — but notes do not: a note described the set it was written for, and
 * "failed last rep" on a set nobody has done yet is a lie to notice and
 * delete. The same reasoning as `nextDraftSet` in `session-edit`.
 */
export function startingSetsFrom(performance: ExercisePerformance): SetLog[] {
  return performance.sets.map(asFreshSet);
}

/**
 * A copy of a set to do again: the numbers, without what was particular to the
 * time it was done — its note, and the tick that says it is finished. Leaving
 * `done` on would open a new workout with every set already checked off.
 */
export function asFreshSet(set: SetLog): SetLog {
  const fresh: SetLog = { ...set, note: null };
  delete fresh.done;
  return fresh;
}
