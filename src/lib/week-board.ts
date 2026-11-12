import { activityTypeName } from '@/lib/activity-catalog';
import {
  addDays,
  daysBetween,
  endOfWeek,
  monthDayLabel,
  shortDayLabel,
  startOfWeek,
  weekdayShort,
} from '@/lib/date-keys';
import { isMissed } from '@/lib/home-model';
import { sessionDayKey, workoutsByDay } from '@/lib/workout-days';
import type { Activity } from '@/types/activity';
import type { DatedScheduledWorkout, ScheduledWorkout } from '@/types/planner';
import type { WorkoutSession } from '@/types/workout';

/**
 * The week board: one row per day, an Unscheduled tray, and the moves behind
 * "tap a handle, tap a day". Ported from the web app's
 * `features/planner/week-board-model.ts`.
 */

/** A planned workout (or reminder) that can be moved. */
export type BoardCard = {
  id: string;
  title: string;
  meta: string;
  /** null = Unscheduled. */
  dateKey: string | null;
  entry: ScheduledWorkout;
  /** Planned for a day that has passed with no workout logged. */
  slid: boolean;
};

/** Something already logged that day. Not movable. */
export type BoardDone = {
  id: string;
  kind: 'workout' | 'activity';
  title: string;
};

export type BoardDay = {
  dateKey: string;
  /** "TUE" */
  dow: string;
  dayOfMonth: number;
  isToday: boolean;
  isPast: boolean;
  /** "Tue, Nov 10" */
  label: string;
  cards: BoardCard[];
  done: BoardDone[];
};

export type WeekBoard = {
  /** "Nov 8 – 14" */
  title: string;
  /** "1 done · 2 planned · goal 3" */
  subtitle: string;
  days: BoardDay[];
};

/** What tapping a day does while a card is picked up. */
export type BoardTarget = 'Move' | 'Swap' | 'Add';

export type BoardMove = { id: string; dateKey: string | null };

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** A planned entry as a movable card. */
export function toBoardCard(entry: ScheduledWorkout, todayKey: string): BoardCard {
  const isWorkout = entry.exerciseIds.length > 0;
  const slid = entry.dateKey !== null && entry.dateKey < todayKey;
  const what = isWorkout
    ? plural(entry.exerciseIds.length, 'exercise')
    : entry.dateKey === null
      ? 'Idea'
      : 'Reminder';

  return {
    id: entry.id,
    title: entry.label.trim() || 'Workout',
    meta: slid ? `Slid past · ${what}` : what,
    dateKey: entry.dateKey,
    entry,
    slid,
  };
}

/** Days with at least one finished workout. */
export function workoutDayKeys(sessions: readonly WorkoutSession[]): Set<string> {
  return new Set(workoutsByDay(sessions).keys());
}

type BuildWeekBoardInput = {
  weekStartKey: string;
  todayKey: string;
  /** Dated entries for the week. */
  scheduled: readonly DatedScheduledWorkout[];
  sessions: readonly WorkoutSession[];
  activities: readonly Activity[];
  weeklyGoal: number;
};

/** "Nov 8 – 14", or "Oct 25 – Nov 1" across a month end. */
function weekTitle(start: string, end: string): string {
  const sameMonth = start.slice(5, 7) === end.slice(5, 7);
  return `${monthDayLabel(start)} – ${sameMonth ? Number(end.slice(8)) : monthDayLabel(end)}`;
}

export function buildWeekBoard({
  weekStartKey,
  todayKey,
  scheduled,
  sessions,
  activities,
  weeklyGoal,
}: BuildWeekBoardInput): WeekBoard {
  const start = startOfWeek(weekStartKey);
  const workoutDays = workoutDayKeys(sessions);

  const days: BoardDay[] = Array.from({ length: 7 }, (_, i) => {
    const key = addDays(start, i);
    const isPast = key < todayKey;

    const cards = scheduled
      .filter((entry) => entry.status === 'planned' && entry.dateKey === key)
      // On past days only real misses stay; done days and old reminders drop off.
      .filter((entry) => !isPast || isMissed(entry, todayKey, workoutDays))
      .map((entry) => toBoardCard(entry, todayKey));

    const done: BoardDone[] = [
      ...sessions
        .filter((session) => session.status === 'completed' && sessionDayKey(session) === key)
        .map((session) => ({
          id: session.id,
          kind: 'workout' as const,
          title: session.title || 'Workout',
        })),
      ...activities
        .filter((activity) => activity.activityDate === key)
        .map((activity) => ({
          id: activity.id,
          kind: 'activity' as const,
          title: activityTypeName(activity.activityTypeId),
        })),
    ];

    return {
      dateKey: key,
      dow: weekdayShort(key).toUpperCase(),
      dayOfMonth: Number(key.slice(8)),
      isToday: key === todayKey,
      isPast,
      label: shortDayLabel(key),
      cards,
      done,
    };
  });

  const doneCount = days.reduce(
    (total, day) => total + day.done.filter((item) => item.kind === 'workout').length,
    0,
  );
  const plannedCount = days.reduce(
    (total, day) =>
      total + day.cards.filter((card) => !card.slid && card.entry.exerciseIds.length > 0).length,
    0,
  );

  return {
    title: weekTitle(start, endOfWeek(start)),
    subtitle: [doneCount > 0 ? `${doneCount} done` : null, `${plannedCount} planned`, `goal ${weeklyGoal}`]
      .filter(Boolean)
      .join(' · '),
    days,
  };
}

/** What dropping the picked card on this day would do, or null when it cannot go there. */
export function targetFor(day: BoardDay, picked: BoardCard, todayKey: string): BoardTarget | null {
  if (day.isPast || picked.dateKey === day.dateKey) return null;
  if (day.cards.length === 0) return 'Move';

  // Swapping would push the other workout into the past (or into the tray), so
  // a missed or unscheduled card just joins the day.
  const canSwap = picked.dateKey !== null && picked.dateKey >= todayKey;
  return canSwap ? 'Swap' : 'Add';
}

/** The writes for dropping `picked` on `day`. */
export function movesForDrop(day: BoardDay, picked: BoardCard, todayKey: string): BoardMove[] {
  const target = targetFor(day, picked, todayKey);
  if (!target) return [];

  const moves: BoardMove[] = [{ id: picked.id, dateKey: day.dateKey }];
  if (target === 'Swap') {
    for (const card of day.cards) moves.push({ id: card.id, dateKey: picked.dateKey });
  }
  return moves;
}

/** "today", "tomorrow" or "Thu". */
function relativeWeekday(key: string, todayKey: string): string {
  if (key === todayKey) return 'today';
  if (key === addDays(todayKey, 1)) return 'tomorrow';
  return weekdayShort(key);
}

/**
 * "Push the rest of the week back": this card and everything still open after
 * it in its week slide later together. A missed card lands on today, and the
 * rest keep their spacing.
 */
export function pushBackPlan(
  card: BoardCard,
  open: readonly DatedScheduledWorkout[],
  todayKey: string,
): { moves: BoardMove[]; summary: string } | null {
  if (card.dateKey === null) return null;

  const from = card.dateKey;
  const shift = from < todayKey ? daysBetween(from, todayKey) : 1;
  const weekEnd = endOfWeek(from);
  const affected = [
    { id: card.id, label: card.title, dateKey: from },
    ...open
      .filter(
        (entry) =>
          entry.id !== card.id &&
          entry.status === 'planned' &&
          entry.dateKey >= from &&
          entry.dateKey <= weekEnd,
      )
      .map((entry) => ({ id: entry.id, label: entry.label.trim() || 'Workout', dateKey: entry.dateKey })),
  ].sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  return {
    moves: affected.map((entry) => ({ id: entry.id, dateKey: addDays(entry.dateKey, shift) })),
    summary: affected
      .map((entry) => `${entry.label} → ${relativeWeekday(addDays(entry.dateKey, shift), todayKey)}`)
      .join(', '),
  };
}

/** "Planned for Tue, Nov 10", "Planned for today", "Slid past Tue, Nov 10" or "Unscheduled". */
export function whenLabel(card: BoardCard, todayKey: string): string {
  if (card.dateKey === null) return 'Unscheduled';
  if (card.dateKey === todayKey) return 'Planned for today';
  if (card.dateKey < todayKey) return `Slid past ${shortDayLabel(card.dateKey)}`;
  return `Planned for ${shortDayLabel(card.dateKey)}`;
}
