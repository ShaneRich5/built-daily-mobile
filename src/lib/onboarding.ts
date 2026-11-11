import { addDays, endOfWeek, weekdayShort } from '@/lib/date-keys';
import { STARTER_TEMPLATES } from '@/lib/starter-templates';
import type { NewScheduledWorkout } from '@/services/firestore/planner-mappers';
import type { UserProfile } from '@/types/user-profile';

/**
 * The pure parts of the first-run flow, ported from the web app's
 * `components/onboarding-flow.tsx`: pick a weekly goal, pick days this week,
 * pick a starter workout for each.
 */

/**
 * Whether to show onboarding. Only a profile that exists and has never been
 * stamped counts: while the profile is loading, or before its first write
 * after sign-up, the answer is no — showing it to someone who already did it
 * on the web would be worse than showing it a moment late.
 */
export function needsOnboarding(profile: UserProfile | null): boolean {
  return profile !== null && profile.onboardingCompletedAt === null;
}

/** "3x a week", or "Every day" for 7. */
export function goalLabel(goal: number): string {
  return goal === 7 ? 'Every day' : `${goal}x a week`;
}

/** Today through Saturday: the days still left to plan this week. */
export function remainingDaysThisWeek(todayKey: string): string[] {
  const days: string[] = [];
  for (let key = todayKey; key <= endOfWeek(todayKey); key = addDays(key, 1)) days.push(key);
  return days;
}

/** "Today", else "Thu 12". */
export function onboardingDayLabel(key: string, todayKey: string): string {
  return key === todayKey ? 'Today' : `${weekdayShort(key)} ${Number(key.slice(8))}`;
}

/**
 * Adds or removes a day, keeping the picks in order and never more than the
 * goal allows (or than the days left in the week).
 */
export function toggleDay(picked: readonly string[], key: string, max: number): string[] {
  if (picked.includes(key)) return picked.filter((day) => day !== key);
  if (picked.length >= max) return [...picked];
  return [...picked, key].sort();
}

/** The planner entries to create: one per picked day that was given a starter. */
export function onboardingEntries(
  days: readonly string[],
  starterByDay: Readonly<Record<string, string>>,
): NewScheduledWorkout[] {
  return days.flatMap((dateKey) => {
    const starter = STARTER_TEMPLATES.find((candidate) => candidate.id === starterByDay[dateKey]);
    return starter
      ? [{ dateKey, label: starter.name, planId: starter.id, exerciseIds: [...starter.exerciseIds] }]
      : [];
  });
}
