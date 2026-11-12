import { addDays, dateKey, startOfWeek } from '@/lib/date-keys';
import type { WorkoutSession } from '@/types/workout';

/**
 * Which days had a workout, and what that makes of the weeks — ported from the
 * web app's `lib/workout-activity.ts` and `goalWeekStreak` in
 * `lib/progress-insights.ts`, so both apps count a streak the same way.
 */

type SessionDay = Pick<WorkoutSession, 'status' | 'workoutDate' | 'endedAt' | 'startedAt'>;

/** Completed workouts per local calendar day (`YYYY-MM-DD` → count). */
export type WorkoutsByDay = ReadonlyMap<string, number>;

/**
 * The calendar day a workout belongs to: the day the lifter filed it under,
 * else the day it ended, else the day it started.
 */
export function sessionDayKey(session: SessionDay): string {
  return session.workoutDate ?? dateKey(session.endedAt ?? session.startedAt);
}

/** Counts completed workouts by day. Unfinished ones are not workouts yet. */
export function workoutsByDay(sessions: readonly SessionDay[]): Map<string, number> {
  const byDay = new Map<string, number>();

  for (const session of sessions) {
    if (session.status !== 'completed') continue;

    const key = sessionDayKey(session);
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }

  return byDay;
}

/** Workouts in the seven days starting at `weekStartKey`. */
export function workoutsInWeek(byDay: WorkoutsByDay, weekStartKey: string): number {
  let count = 0;
  for (let i = 0; i < 7; i++) count += byDay.get(addDays(weekStartKey, i)) ?? 0;
  return count;
}

/** How far back the current streak is walked: about three years of weeks. */
const MAX_STREAK_WEEKS = 160;

/**
 * Weeks in a row (Sunday–Saturday) that reached the weekly goal.
 *
 * The week in progress only counts once it has reached the goal — and until
 * then it does not break the streak either. So the number never drops on a
 * Monday: it holds through the week and only resets if the week ends short.
 *
 * `longest` is the best run anywhere in the history given.
 */
export function goalWeekStreak(
  byDay: WorkoutsByDay,
  weeklyGoal: number,
  todayKey: string,
): { current: number; longest: number } {
  const thisWeek = startOfWeek(todayKey);
  const thisWeekMet = workoutsInWeek(byDay, thisWeek) >= weeklyGoal;

  let current = 0;
  let cursor = thisWeekMet ? thisWeek : addDays(thisWeek, -7);
  for (let i = 0; i < MAX_STREAK_WEEKS; i++) {
    if (workoutsInWeek(byDay, cursor) < weeklyGoal) break;
    current += 1;
    cursor = addDays(cursor, -7);
  }

  let longest = current;
  let earliest: string | null = null;
  for (const [key, count] of byDay) {
    if (count > 0 && (earliest === null || key < earliest)) earliest = key;
  }

  if (earliest) {
    let run = 0;
    for (let week = startOfWeek(earliest); week <= thisWeek; week = addDays(week, 7)) {
      if (workoutsInWeek(byDay, week) >= weeklyGoal) {
        run += 1;
        longest = Math.max(longest, run);
      } else {
        run = 0;
      }
    }
  }

  return { current, longest };
}
