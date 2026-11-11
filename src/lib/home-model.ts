import { activityTypeName } from '@/lib/activity-catalog';
import {
  addDays,
  clockLabel,
  monthDayLabel,
  shortDayLabel,
  startOfWeek,
  weekdayIndex,
  weekdayShort,
} from '@/lib/date-keys';
import { exerciseProgress } from '@/lib/session/session-model';
import { sessionStateFrom } from '@/lib/session/session-state';
import {
  goalWeekStreak,
  sessionDayKey,
  workoutsByDay,
  workoutsInWeek,
} from '@/lib/workout-days';
import type { Activity } from '@/types/activity';
import type { DatedScheduledWorkout } from '@/types/planner';
import type { WorkoutPlan, WorkoutSession } from '@/types/workout';

/**
 * Pure builders that turn Firestore data into what the Home screen shows.
 * Ported from the web app's `features/home/home-model.ts` (and its open
 * split-Start-button branch), so both apps say the same thing about the same
 * week.
 *
 * Where the web's builders return links, these return ids: starting a workout
 * on mobile creates a session document rather than opening a URL.
 */

export type HomeTemplate = {
  id: string;
  name: string;
  /** "5 exercises · last done Mon" */
  meta: string;
  /** False for a template with no exercises: there is nothing to start. */
  canStart: boolean;
};

export type HomeDayState = 'workout' | 'activity' | 'planned' | 'empty';

export type HomeWeekDay = {
  dateKey: string;
  /** "S", "M", "T", … */
  weekday: string;
  dayOfMonth: number;
  isToday: boolean;
  isPast: boolean;
  state: HomeDayState;
  /** Screen-reader label, e.g. "Tue, Nov 10: Leg day planned". */
  label: string;
  /** The planned entry a tap would start; null on a day with nothing planned. */
  planned: DatedScheduledWorkout | null;
};

export type HomePlanned = {
  entry: DatedScheduledWorkout;
  label: string;
};

export type HomeInProgress = {
  id: string;
  title: string;
  /** "Started 6:10 PM" */
  started: string;
  /** "Up next: Cable fly · 3 of 5 exercises · 8 sets done" */
  meta: string;
  /** One per planned exercise, in order, for the progress bar. */
  segments: ('done' | 'in_progress' | 'not_started')[];
};

export type HomeRecentItem = {
  id: string;
  kind: 'workout' | 'activity';
  title: string;
  meta: string;
};

export type HomeWeekGoal = { completed: number; target: number };

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** "today", "yesterday", "Thu" (within the past week), or "Oct 24". */
function relativeDayLabel(key: string, todayKey: string): string {
  if (key === todayKey) return 'today';
  if (key === addDays(todayKey, -1)) return 'yesterday';
  if (key >= addDays(todayKey, -6)) return weekdayShort(key);
  return monthDayLabel(key);
}

/** "today", "tomorrow", "Thu" (within the week ahead), or "Thu, Nov 19". */
export function plannedWhen(key: string, todayKey: string): string {
  if (key === todayKey) return 'today';
  if (key === addDays(todayKey, 1)) return 'tomorrow';
  return key <= addDays(todayKey, 6) ? weekdayShort(key) : shortDayLabel(key);
}

/** Templates, most recently used first. */
export function buildHomeTemplates(
  plans: readonly WorkoutPlan[],
  sessions: readonly WorkoutSession[],
  todayKey: string,
): HomeTemplate[] {
  const lastUsed = new Map<string, string>();

  for (const session of sessions) {
    if (session.status !== 'completed' || !session.planId) continue;

    const key = sessionDayKey(session);
    const previous = lastUsed.get(session.planId);
    if (!previous || key > previous) lastUsed.set(session.planId, key);
  }

  return [...plans]
    .sort((a, b) => {
      const usedA = lastUsed.get(a.id) ?? '';
      const usedB = lastUsed.get(b.id) ?? '';
      return usedA !== usedB ? usedB.localeCompare(usedA) : a.name.localeCompare(b.name);
    })
    .map((plan) => {
      const last = lastUsed.get(plan.id);
      const exercises = plural(plan.lines.length, 'exercise');

      return {
        id: plan.id,
        name: plan.name || 'Untitled template',
        meta: last ? `${exercises} · last done ${relativeDayLabel(last, todayKey)}` : exercises,
        canStart: plan.lines.length > 0,
      };
    });
}

/** The newest workout still in progress, if any, and how far along it is. */
export function pickInProgress(sessions: readonly WorkoutSession[]): HomeInProgress | null {
  const open = sessions
    .filter((session) => session.status === 'in_progress')
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0];

  if (!open) return null;

  // Maybes are not part of the count until one is started; see `isUntouchedMaybe`.
  const planned = sessionStateFrom(open).exercises.filter((item) => item.section === 'plan');
  const segments = planned.map((item) => exerciseProgress(item.sets));
  const doneExercises = segments.filter((segment) => segment === 'done').length;
  const doneSets = planned.reduce(
    (total, item) => total + item.sets.filter((set) => set.done).length,
    0,
  );
  const next = planned.find((item) => exerciseProgress(item.sets) !== 'done');

  const parts: string[] = [];
  if (next) parts.push(`Up next: ${next.exercise.name}`);
  if (planned.length > 0) {
    parts.push(`${doneExercises} of ${plural(planned.length, 'exercise')}`);
    parts.push(`${plural(doneSets, 'set')} done`);
  }

  return {
    id: open.id,
    title: open.title || 'Untitled workout',
    started: `Started ${clockLabel(open.startedAt)}`,
    meta: parts.length > 0 ? parts.join(' · ') : 'No exercises yet',
    segments,
  };
}

/** The soonest planned workout from today on. */
export function pickNextPlanned(
  entries: readonly DatedScheduledWorkout[],
  todayKey: string,
): HomePlanned | null {
  const next = entries
    .filter((entry) => entry.status === 'planned' && entry.dateKey >= todayKey)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))[0];

  return next ? { entry: next, label: next.label.trim() || 'Workout' } : null;
}

function dayDetail(
  state: HomeDayState,
  planned: DatedScheduledWorkout | undefined,
  isPast: boolean,
): string {
  if (state === 'workout') return 'workout logged';
  if (state === 'activity') return 'activity logged';
  if (state === 'planned') return `${planned?.label.trim() || 'Workout'} planned`;
  return isPast ? 'rest day' : 'nothing planned';
}

/** Sunday–Saturday around today: what happened, or is planned, each day. */
export function buildHomeWeek(
  todayKey: string,
  sessions: readonly WorkoutSession[],
  activities: readonly Activity[],
  entries: readonly DatedScheduledWorkout[],
): HomeWeekDay[] {
  const workoutDays = workoutsByDay(sessions);
  const activityDays = new Set(activities.map((activity) => activity.activityDate));
  const plannedByDay = new Map<string, DatedScheduledWorkout>();

  for (const entry of entries) {
    if (entry.status === 'planned' && !plannedByDay.has(entry.dateKey)) {
      plannedByDay.set(entry.dateKey, entry);
    }
  }

  const start = startOfWeek(todayKey);

  return Array.from({ length: 7 }, (_, i) => {
    const key = addDays(start, i);
    const planned = plannedByDay.get(key);
    const isPast = key < todayKey;
    const isToday = key === todayKey;
    // What was done outranks what was planned: a logged day is a done day.
    const state: HomeDayState = workoutDays.has(key)
      ? 'workout'
      : activityDays.has(key)
        ? 'activity'
        : planned
          ? 'planned'
          : 'empty';

    return {
      dateKey: key,
      weekday: WEEKDAY_INITIALS[i],
      dayOfMonth: Number(key.slice(8)),
      isToday,
      isPast,
      state,
      label: `${isToday ? 'Today, ' : ''}${shortDayLabel(key)}: ${dayDetail(state, planned, isPast)}`,
      planned: state === 'planned' && planned ? planned : null,
    };
  });
}

function workoutMeta(session: WorkoutSession): string[] {
  return session.exerciseCount > 0
    ? [plural(session.exerciseCount, 'exercise'), plural(session.setCount, 'set')]
    : [];
}

function activityMeta(activity: Activity): string[] {
  const parts: string[] = [];
  if (activity.durationMin !== null) parts.push(`${activity.durationMin} min`);
  if (activity.distanceMiles !== null) parts.push(`${activity.distanceMiles} mi`);
  return parts;
}

/** Finished workouts and logged activities, newest first. */
export function buildHomeRecent(
  sessions: readonly WorkoutSession[],
  activities: readonly Activity[],
  limit = 5,
): HomeRecentItem[] {
  const rows: { item: HomeRecentItem; sortKey: string }[] = [];

  for (const session of sessions) {
    if (session.status !== 'completed') continue;

    const day = sessionDayKey(session);
    rows.push({
      item: {
        id: session.id,
        kind: 'workout',
        title: session.title || 'Untitled workout',
        meta: [shortDayLabel(day), ...workoutMeta(session)].join(' · '),
      },
      // Within a day: by the time it was filed under, untimed ones last.
      sortKey: `${day}T${session.workoutTime ?? '99:99'}-${session.startedAt.getTime()}`,
    });
  }

  for (const activity of activities) {
    rows.push({
      item: {
        id: activity.id,
        kind: 'activity',
        title: activityTypeName(activity.activityTypeId),
        meta: [shortDayLabel(activity.activityDate), ...activityMeta(activity), 'activity'].join(
          ' · ',
        ),
      },
      sortKey: `${activity.activityDate}T${activity.activityTime ?? '99:99'}-${activity.createdAt.getTime()}`,
    });
  }

  return rows
    .sort((a, b) => b.sortKey.localeCompare(a.sortKey))
    .slice(0, limit)
    .map((row) => row.item);
}

/** Completed workouts this Sunday–Saturday week against the weekly goal. */
export function buildWeekGoal(
  sessions: readonly WorkoutSession[],
  target: number,
  todayKey: string,
): HomeWeekGoal {
  return { completed: workoutsInWeek(workoutsByDay(sessions), startOfWeek(todayKey)), target };
}

export type HomeSuggestedStart = {
  name: string;
  meta: string;
  /** The template it starts from, so the menu can leave it out. */
  templateId: string | null;
  /** Set when the suggestion is today's planned workout. */
  planned: DatedScheduledWorkout | null;
};

/**
 * What the big Start button starts: today's planned workout if there is one,
 * otherwise the template done longest ago (never done counts as longest ago),
 * so the rotation keeps moving. Null means the button starts an empty workout.
 */
export function pickSuggestedStart(
  planned: HomePlanned | null,
  templates: readonly HomeTemplate[],
  todayKey: string,
): HomeSuggestedStart | null {
  if (planned && planned.entry.dateKey === todayKey && planned.entry.exerciseIds.length > 0) {
    const template = templates.find((candidate) => candidate.id === planned.entry.planId);

    return {
      name: planned.label,
      meta: template?.meta ?? 'Planned today',
      templateId: template?.id ?? null,
      planned: planned.entry,
    };
  }

  // Templates arrive most recently used first, so the last startable one is the oldest.
  const startable = templates.filter((template) => template.canStart);
  const oldest = startable[startable.length - 1];

  return oldest
    ? { name: oldest.name, meta: oldest.meta, templateId: oldest.id, planned: null }
    : null;
}

/** The start card's headline and the one line under it. */
export function startCopy(
  planned: HomePlanned | null,
  hasTemplates: boolean,
  todayKey: string,
): { headline: string; detail: string } {
  if (planned) {
    return {
      headline: 'Ready when you are',
      detail: `${planned.label} is planned for ${plannedWhen(planned.entry.dateKey, todayKey)}.`,
    };
  }

  return {
    headline: 'Ready when you are',
    detail: hasTemplates
      ? 'Next up in your rotation, or pick another.'
      : 'Start an empty workout, or log an activity.',
  };
}

export type HomeChartDay = 'workout' | 'activity' | 'rest' | 'today' | 'planned' | 'ahead';

export type HomeChartWeek = {
  startKey: string;
  /** Sunday–Saturday date keys, matching `days`. */
  dateKeys: string[];
  days: HomeChartDay[];
  /** Finished weeks are hit or missed; this week is hit or still open. */
  goal: 'hit' | 'missed' | 'open';
};

export type HomeConsistency = {
  /** Weeks in a row reaching the goal (this week counts once it has). */
  streak: number;
  longest: number;
  /** Oldest first, ending with this week. */
  weeks: HomeChartWeek[];
  /** Screen-reader summary of the chart. */
  label: string;
  /** What was logged on each day in the chart, for tapping a square. Days with nothing are absent. */
  dayItems: Record<string, HomeRecentItem[]>;
};

/** Workouts and activities logged per day (meta without the date), in the order they happened. */
function itemsByDay(
  sessions: readonly WorkoutSession[],
  activities: readonly Activity[],
  startKey: string,
  endKey: string,
): Record<string, HomeRecentItem[]> {
  const rows: { day: string; sortKey: string; item: HomeRecentItem }[] = [];

  for (const session of sessions) {
    if (session.status !== 'completed') continue;

    const day = sessionDayKey(session);
    if (day < startKey || day > endKey) continue;

    rows.push({
      day,
      sortKey: `${session.workoutTime ?? '99:99'}-${session.startedAt.getTime()}`,
      item: {
        id: session.id,
        kind: 'workout',
        title: session.title || 'Untitled workout',
        meta: workoutMeta(session).join(' · ') || 'Workout',
      },
    });
  }

  for (const activity of activities) {
    const day = activity.activityDate;
    if (day < startKey || day > endKey) continue;

    rows.push({
      day,
      sortKey: `${activity.activityTime ?? '99:99'}-${activity.createdAt.getTime()}`,
      item: {
        id: activity.id,
        kind: 'activity',
        title: activityTypeName(activity.activityTypeId),
        meta: activityMeta(activity).join(' · ') || 'Activity',
      },
    });
  }

  rows.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  const byDay: Record<string, HomeRecentItem[]> = {};
  for (const row of rows) (byDay[row.day] ??= []).push(row.item);
  return byDay;
}

/** The goal streak plus a day-by-day grid of the last few weeks. */
export function buildHomeConsistency(
  todayKey: string,
  sessions: readonly WorkoutSession[],
  activities: readonly Activity[],
  entries: readonly DatedScheduledWorkout[],
  weeklyGoal: number,
  weekCount = 16,
): HomeConsistency {
  const workoutDays = workoutsByDay(sessions);
  const activityDays = new Set(activities.map((activity) => activity.activityDate));
  const plannedDays = new Set(
    entries.filter((entry) => entry.status === 'planned').map((entry) => entry.dateKey),
  );
  const { current, longest } = goalWeekStreak(workoutDays, weeklyGoal, todayKey);

  const thisWeekStart = startOfWeek(todayKey);
  const weeks: HomeChartWeek[] = [];

  for (let back = weekCount - 1; back >= 0; back--) {
    const startKey = addDays(thisWeekStart, -7 * back);
    const dateKeys = Array.from({ length: 7 }, (_, i) => addDays(startKey, i));
    const days = dateKeys.map((key): HomeChartDay => {
      if (workoutDays.has(key)) return 'workout';
      if (activityDays.has(key)) return 'activity';
      if (key === todayKey) return 'today';
      if (key < todayKey) return 'rest';
      return plannedDays.has(key) ? 'planned' : 'ahead';
    });
    const hit = workoutsInWeek(workoutDays, startKey) >= weeklyGoal;

    weeks.push({ startKey, dateKeys, days, goal: hit ? 'hit' : back === 0 ? 'open' : 'missed' });
  }

  const finished = weeks.slice(0, -1);
  const finishedHit = finished.filter((week) => week.goal === 'hit').length;

  return {
    streak: current,
    longest,
    weeks,
    label:
      `Last ${weekCount} weeks: goal hit in ${finishedHit} of ${finished.length} finished weeks. ` +
      `Current streak ${plural(current, 'week')}, longest ${plural(longest, 'week')}.`,
    dayItems: itemsByDay(sessions, activities, weeks[0]?.startKey ?? thisWeekStart, todayKey),
  };
}

function moreWorkouts(n: number): string {
  if (n === 1) return 'One more';
  if (n === 2) return 'Two more';
  if (n === 3) return 'Three more';
  return `${n} more`;
}

/** One encouraging line under the weekly count. It never talks about losing the streak. */
export function weekNudge(goal: HomeWeekGoal, streak: number, todayKey: string): string {
  const remaining = goal.target - goal.completed;

  if (remaining <= 0) {
    return streak > 1
      ? `Goal met. That's ${streak} weeks in a row.`
      : 'Goal met this week. Anything extra is a bonus.';
  }

  // Including today; weeks end on Saturday.
  const daysLeft = 7 - weekdayIndex(todayKey);
  if (remaining > daysLeft) return 'Every workout this week still counts.';

  const when = daysLeft === 1 ? 'today' : 'by Saturday';
  return streak > 0
    ? `${moreWorkouts(remaining)} ${when} makes it ${streak + 1} weeks in a row.`
    : `${moreWorkouts(remaining)} ${when} hits your weekly goal.`;
}

/**
 * A planned day that has passed counts as done if any workout was logged that
 * day — showing up is what matters — so only real misses are left. "Missed" is
 * never stored; both apps work it out this way, and must agree.
 *
 * A plain reminder (no exercises) is never a miss.
 */
export function isMissed(
  entry: DatedScheduledWorkout,
  todayKey: string,
  workoutDays: ReadonlySet<string>,
): boolean {
  return (
    entry.status === 'planned' &&
    entry.dateKey < todayKey &&
    entry.exerciseIds.length > 0 &&
    !workoutDays.has(entry.dateKey)
  );
}

/** The most recent planned workout that slid past, for the catch-up card. */
export function pickMissed(
  entries: readonly DatedScheduledWorkout[],
  sessions: readonly WorkoutSession[],
  todayKey: string,
): DatedScheduledWorkout | null {
  const workoutDays = new Set(workoutsByDay(sessions).keys());

  return (
    entries
      .filter((entry) => isMissed(entry, todayKey, workoutDays))
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey))[0] ?? null
  );
}

/** "Leg day slid past yesterday" / "… slid past on Tue". */
export function missedHeadline(entry: DatedScheduledWorkout, todayKey: string): string {
  const when =
    entry.dateKey === addDays(todayKey, -1) ? 'yesterday' : `on ${weekdayShort(entry.dateKey)}`;

  return `${entry.label.trim() || 'Workout'} slid past ${when}`;
}
