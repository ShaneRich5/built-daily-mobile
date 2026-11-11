import { addDays, dateKey, startOfWeek } from '@/lib/date-keys';
import { goalWeekStreak, sessionDayKey, workoutsByDay, workoutsInWeek } from '@/lib/workout-days';
import { GROUP_LIMITS, type MemberUpcomingPlan } from '@/types/group';
import type { WeeklyGoalTarget } from '@/types/progress';
import type { WorkoutSession } from '@/types/workout';

/**
 * What a lifter's groups see of them, worked out from their own history —
 * ported from the web's `lib/workout-signals.ts` and the signal half of
 * `bumpGroupWorkoutSignals`. Always recomputed from source, never
 * incremented, so a deleted, moved or reopened workout heals the roster on
 * the next sync instead of leaving drift.
 *
 * An activity (a walk, a ride) counts as showing up, as it does for the
 * lifter's own consistency.
 */

/** An activity reduced to what signals need. */
export type ActivityDay = {
  activityDate: string;
  /** For picking the latest: its end, start or creation time. */
  at: Date;
  /** "Run" */
  label: string;
};

/** The fields a member doc's self-update carries, minus the name and the plans. */
export type MemberSignals = {
  lastWorkoutDateKey: string | null;
  lastWorkoutAt: Date | null;
  currentStreak: number;
  workoutsThisWeek: number;
  weeklyGoal: WeeklyGoalTarget;
  trainedDays: string[];
  lastWorkoutLabel: string | null;
};

export function memberSignals(
  sessions: readonly WorkoutSession[],
  activities: readonly ActivityDay[],
  weeklyGoal: WeeklyGoalTarget,
  todayKey: string,
): MemberSignals {
  const completed = sessions.filter((session) => session.status === 'completed');
  const byDay = workoutsByDay(completed);
  for (const activity of activities) {
    byDay.set(activity.activityDate, (byDay.get(activity.activityDate) ?? 0) + 1);
  }

  let last: { key: string; at: Date; label: string | null } | null = null;
  const consider = (key: string, at: Date, label: string | null) => {
    if (!last || key > last.key || (key === last.key && at > last.at)) {
      last = { key, at, label: label?.trim() || null };
    }
  };
  for (const session of completed) {
    consider(sessionDayKey(session), session.endedAt ?? session.startedAt, session.title);
  }
  for (const activity of activities) consider(activity.activityDate, activity.at, activity.label);

  // Last week's Sunday through today: the days a groupmate's week grid can show.
  const from = addDays(startOfWeek(todayKey), -7);
  const trainedDays = [...byDay.entries()]
    .filter(([key, n]) => n > 0 && key >= from && key <= todayKey)
    .map(([key]) => key)
    .sort()
    .slice(-GROUP_LIMITS.trainedDaysMax);

  const latest = last as { key: string; at: Date; label: string | null } | null;

  return {
    lastWorkoutDateKey: latest?.key ?? null,
    lastWorkoutAt: latest?.at ?? null,
    // Weeks meeting the lifter's own goal, not days in a row: three a week on
    // schedule is a streak, not a reset every rest day.
    currentStreak: goalWeekStreak(byDay, weeklyGoal, todayKey).current,
    workoutsThisWeek: workoutsInWeek(byDay, startOfWeek(todayKey)),
    weeklyGoal,
    trainedDays,
    lastWorkoutLabel: latest?.label?.slice(0, GROUP_LIMITS.workoutLabel) ?? null,
  };
}

/** Planner rows → what a member doc carries: open plans in the next seven days, soonest first. */
export function upcomingPlansFromEntries(
  entries: readonly { dateKey: string | null; label: string; status?: string }[],
  todayKey: string,
): MemberUpcomingPlan[] {
  const endKey = addDays(todayKey, GROUP_LIMITS.upcomingPlanDays - 1);

  return entries
    .filter(
      (entry): entry is { dateKey: string; label: string; status?: string } =>
        entry.dateKey !== null &&
        entry.dateKey >= todayKey &&
        entry.dateKey <= endKey &&
        entry.status !== 'completed' &&
        entry.status !== 'skipped',
    )
    .map((entry) => ({ dateKey: entry.dateKey, label: entry.label.trim().slice(0, GROUP_LIMITS.workoutLabel) }))
    .filter((plan) => plan.label.length > 0)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    .slice(0, GROUP_LIMITS.upcomingPlansMax);
}

/**
 * A member's streak only updates when they sync, so someone who stops
 * training would keep their old number forever. It reads as 0 once their
 * last workout is older than last week.
 */
export function effectiveStreak(
  member: { currentStreak: number; lastWorkoutDateKey: string | null },
  todayKey: string,
): number {
  if (!member.lastWorkoutDateKey) return 0;
  const lastWeek = startOfWeek(member.lastWorkoutDateKey);
  const thisWeek = startOfWeek(todayKey);
  return lastWeek === thisWeek || lastWeek === addDays(thisWeek, -7) ? member.currentStreak : 0;
}

/** Today, as a key, for callers outside React. */
export function todayKeyNow(): string {
  return dateKey(new Date());
}
