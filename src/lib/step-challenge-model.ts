import {
  type ChallengeTone,
  describeChallengeRule,
  evaluateChallenge,
} from '@/lib/challenge-evaluate';
import { resolveDailyMetric } from '@/lib/daily-metrics';
import {
  addDays,
  dateFromKey,
  endOfMonth,
  endOfWeek,
  longDayLabel,
  monthDayLabel,
  startOfMonth,
  startOfWeek,
} from '@/lib/date-keys';
import { formatCount } from '@/lib/session/session-summary';
import type { ChallengePeriod, ChallengeRule, SavedChallenge } from '@/types/challenge';
import { DAILY_METRIC_SOURCE_LABELS, type DailyMetricsDay } from '@/types/daily-metric';

// What the step challenge card and its sheets show, built from a challenge and
// the day docs behind it. Ported from the web app's
// `features/step-challenge/step-challenge-model.ts`, with the same copy.

/** How long a finished challenge stays on Home after its last day. */
export const ENDED_VISIBLE_DAYS = 3;

export type DateRange = { startDate: string; endDate: string };

/** The week (Sunday–Saturday) or calendar month containing `dateKey`. */
export function challengeRange(period: ChallengePeriod, dateKey: string): DateRange {
  return period === 'month'
    ? { startDate: startOfMonth(dateKey), endDate: endOfMonth(dateKey) }
    : { startDate: startOfWeek(dateKey), endDate: endOfWeek(dateKey) };
}

/**
 * The days Home subscribes to: enough for a running week or month, or one
 * that ended in the last few days — from last week or last month (whichever
 * starts first) through the end of this week or month (whichever ends last).
 */
export function challengeDaysWindow(todayKey: string): DateRange {
  const lastWeekStart = addDays(startOfWeek(todayKey), -7);
  const endedMonthStart = startOfMonth(addDays(todayKey, -ENDED_VISIBLE_DAYS));
  const weekEnd = endOfWeek(todayKey);
  const monthEnd = endOfMonth(todayKey);
  return {
    startDate: lastWeekStart < endedMonthStart ? lastWeekStart : endedMonthStart,
    endDate: weekEnd > monthEnd ? weekEnd : monthEnd,
  };
}

export type StepDayCell = {
  dateKey: string;
  /** "S", "M", … */
  letter: string;
  /** 1–31, for the month grid. */
  dayOfMonth: number;
  /** "8.2k", "–" (nothing yet), or "" for a day still ahead. */
  short: string;
  hit: boolean;
  isToday: boolean;
  isFuture: boolean;
  /** The day's number came from a sync rather than being typed. */
  synced: boolean;
  /** What a screen reader says for the cell. */
  label: string;
};

export type StepChallengeCardView = {
  id: string;
  period: ChallengePeriod;
  /** `ended`: the period is over and fell short. `done` can come early. */
  state: 'active' | 'done' | 'ended';
  heading: string;
  rangeLabel: string;
  title: string;
  /** "2" with "/ 5 days", or "32,400" with "/ 50,000". */
  bigValue: string;
  bigSuffix: string;
  status: string;
  tone: ChallengeTone;
  progress: number;
  /** The total rule shows a bar; day-based rules read better as dots. */
  showBar: boolean;
  days: StepDayCell[];
  /** Today's number and where it came from, while the challenge is running. */
  today: { value: string; source: string | null; synced: boolean } | null;
  /** "Same again next week" or "Same again this month"; null once that one is set. */
  repeatLabel: string | null;
  /** The next week's or month's challenge already exists. */
  nextSet: boolean;
  rule: ChallengeRule;
};

/** "8.2k", "950", "–" */
export function shortSteps(value: number | null): string {
  if (value == null) return '–';
  if (value < 1000) return String(value);
  return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
}

/** "Nov 22–28", or "Nov 29 – Dec 5" across months. */
export function rangeLabel(startDate: string, endDate: string): string {
  const start = dateFromKey(startDate);
  const end = dateFromKey(endDate);
  if (!start || !end) return '';

  return start.getMonth() === end.getMonth()
    ? `${monthDayLabel(startDate)}–${end.getDate()}`
    : `${monthDayLabel(startDate)} – ${monthDayLabel(endDate)}`;
}

/** Resolved step count per day, for the evaluator. */
export function stepValuesByDate(
  days: Record<string, DailyMetricsDay>,
): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const [key, day] of Object.entries(days)) out[key] = day.metrics.steps?.value ?? null;
  return out;
}

export type HomeChallengePick = {
  /** The running challenge, or one that ended in the last few days. */
  shown: SavedChallenge | null;
  /** A challenge already set to start after the shown one. */
  upcoming: SavedChallenge | null;
};

/** Which challenge Home shows. Latest created wins if two cover the same day. */
export function pickHomeChallenge(rows: SavedChallenge[], todayKey: string): HomeChallengePick {
  const newestFirst = [...rows].sort(
    (a, b) => b.challenge.createdAt.getTime() - a.challenge.createdAt.getTime(),
  );
  const current = newestFirst.find(
    (row) => row.challenge.startDate <= todayKey && todayKey <= row.challenge.endDate,
  );
  const upcoming = newestFirst.find((row) => row.challenge.startDate > todayKey) ?? null;
  if (current) return { shown: current, upcoming };

  const recentlyEnded = newestFirst
    .filter(
      (row) =>
        row.challenge.endDate < todayKey &&
        addDays(row.challenge.endDate, ENDED_VISIBLE_DAYS) >= todayKey,
    )
    .sort((a, b) => b.challenge.endDate.localeCompare(a.challenge.endDate))[0];
  return { shown: recentlyEnded ?? null, upcoming };
}

/**
 * The range a repeat covers, in the same period: the next one while this one
 * runs, else the one containing today.
 */
export function repeatRange(saved: SavedChallenge, todayKey: string): DateRange {
  const { period, endDate } = saved.challenge;
  const from = endDate >= todayKey ? addDays(endDate, 1) : todayKey;
  return challengeRange(period, from);
}

export function buildStepChallengeCardView(
  saved: SavedChallenge,
  days: Record<string, DailyMetricsDay>,
  todayKey: string,
  upcoming: SavedChallenge | null,
): StepChallengeCardView {
  const { challenge } = saved;
  const progress = evaluateChallenge(challenge, stepValuesByDate(days), todayKey);
  const state = progress.done ? 'done' : progress.ended ? 'ended' : 'active';
  const isTotal = challenge.rule.kind === 'total';
  const { period } = challenge;
  const noun = period === 'month' ? 'month' : 'week';

  const cells: StepDayCell[] = progress.days.map((day) => {
    const resolvedFrom = days[day.dateKey]?.metrics.steps?.resolvedFrom ?? null;
    const synced = !day.isFuture && resolvedFrom != null && resolvedFrom !== 'manual';
    const name = longDayLabel(day.dateKey).split(',')[0];
    // In a month grid the weekday alone is ambiguous, so say the date too.
    const spoken = period === 'month' ? longDayLabel(day.dateKey) : name;
    const amount = day.value == null ? 'nothing logged' : `${formatCount(day.value)} steps`;
    const source =
      synced && resolvedFrom ? `, from ${DAILY_METRIC_SOURCE_LABELS[resolvedFrom]}` : '';

    return {
      dateKey: day.dateKey,
      letter: name.slice(0, 1),
      dayOfMonth: Number(day.dateKey.slice(8, 10)),
      short: day.isFuture ? '' : shortSteps(day.value),
      hit: day.hit,
      isToday: day.isToday,
      isFuture: day.isFuture,
      synced,
      label: day.isFuture
        ? `${spoken}, not yet`
        : `${spoken}, ${amount}${source}${day.hit && !isTotal ? ', target hit' : ''}. Edit steps.`,
    };
  });

  const todayEntry = days[todayKey]?.metrics.steps ?? null;
  const running = challenge.startDate <= todayKey && todayKey <= challenge.endDate;
  const repeatStart = repeatRange(saved, todayKey).startDate;
  const nextSet = upcoming != null && upcoming.challenge.startDate <= repeatStart;

  return {
    id: saved.id,
    period,
    state,
    heading: progress.ended
      ? `Last ${noun}’s steps`
      : progress.done
        ? 'Challenge complete'
        : `This ${noun}’s steps`,
    rangeLabel: rangeLabel(challenge.startDate, challenge.endDate),
    title: describeChallengeRule(challenge.rule, challenge.metric, period),
    bigValue: formatCount(progress.current),
    bigSuffix: isTotal ? `/ ${formatCount(progress.goal)}` : `/ ${progress.goal} days`,
    status: progress.status,
    tone: progress.tone,
    progress: progress.progress,
    showBar: isTotal,
    days: cells,
    today: running
      ? {
          value: todayEntry?.value != null ? formatCount(todayEntry.value) : 'nothing yet',
          source: todayEntry?.resolvedFrom
            ? DAILY_METRIC_SOURCE_LABELS[todayEntry.resolvedFrom]
            : null,
          synced: todayEntry?.resolvedFrom != null && todayEntry.resolvedFrom !== 'manual',
        }
      : null,
    repeatLabel:
      state === 'active' || nextSet
        ? null
        : running
          ? `Same again next ${noun}`
          : `Same again this ${noun}`,
    nextSet,
    rule: challenge.rule,
  };
}

/** What the log sheet needs to know about one day. */
export type LogStepsDay = {
  dateKey: string;
  title: string;
  /** The number the user typed, if any. */
  manual: number | null;
  /** The highest synced number and its source, if any. */
  synced: { value: number; source: string } | null;
};

export function buildLogStepsDay(
  dateKey: string,
  days: Record<string, DailyMetricsDay>,
): LogStepsDay {
  const sources = days[dateKey]?.metrics.steps?.sources ?? {};
  // What the day would show without the typed number.
  const { manual, ...syncedSources } = sources;
  const fallback = resolveDailyMetric(syncedSources);

  return {
    dateKey,
    title: `Steps for ${longDayLabel(dateKey)}`,
    manual: manual?.value ?? null,
    synced:
      fallback.value != null && fallback.resolvedFrom
        ? { value: fallback.value, source: DAILY_METRIC_SOURCE_LABELS[fallback.resolvedFrom] }
        : null,
  };
}

/** The period's limits, with day counts capped at the days it actually has. */
export function limitsForRange<T extends { max: number }>(limit: T, dayCount: number): T {
  return { ...limit, max: Math.min(limit.max, dayCount) };
}

/** One − / + nudge, kept inside the limit. */
export function clampStep(value: number, delta: number, limit: { min: number; max: number }) {
  return Math.min(limit.max, Math.max(limit.min, value + delta));
}
