import type { WorkoutSession } from '@/types/workout';

/**
 * The recent-workouts list: anything still in progress first, then the finished
 * ones as the query ordered them.
 *
 * The two groups are read separately rather than in one query. A single query
 * ordered by `endedAt` cannot do this: `endedAt` is null exactly while a
 * workout is in progress, Firestore sorts nulls last on a descending order, and
 * the limit then cuts them off before they are ever read — so a lifter with
 * more completed workouts than the page size could never see the one they are
 * in the middle of. Ordering by `endedAt` also drops any document missing the
 * field outright, which is how the web app has written some in-progress
 * sessions.
 *
 * Unfinished workouts are sorted here, newest start first, because their own
 * query cannot order on `startedAt` without excluding documents that predate
 * the field for the same reason.
 */
export function orderRecentSessions(
  inProgress: readonly WorkoutSession[],
  completed: readonly WorkoutSession[],
): WorkoutSession[] {
  const unfinished = [...inProgress].sort(
    (a, b) => b.startedAt.getTime() - a.startedAt.getTime(),
  );

  return [...unfinished, ...completed];
}
