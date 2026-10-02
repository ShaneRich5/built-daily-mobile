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

  for (const session of sessions) {
    if (session.status !== 'completed' || session.id === excludeSessionId) continue;

    const when = performedAt(session);

    for (const line of session.lines) {
      const sets = line.sets.filter(isLoggedSet);
      if (sets.length === 0) continue;

      const known = latest.get(line.exerciseId);
      if (known && known.performedAt >= when) continue;

      latest.set(line.exerciseId, {
        sessionId: session.id,
        performedAt: when,
        metric: line.metric,
        sets,
      });
    }
  }

  return latest;
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
  return performance.sets.map((set) => ({ ...set, note: null }));
}
