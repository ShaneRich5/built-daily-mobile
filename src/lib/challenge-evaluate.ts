import { addDays } from '@/lib/date-keys';
import { formatCount } from '@/lib/session/session-summary';
import type {
  ChallengePeriod,
  ChallengeRule,
  DaysHitRule,
  StreakRule,
  TotalRule,
} from '@/types/challenge';
import { DAILY_METRICS, type DailyMetricKey } from '@/types/daily-metric';

// Pure challenge progress: one evaluator per rule kind, all reading the same
// list of days. Ported from the web app's `lib/challenge-evaluate.ts` with the
// same copy, so a challenge reads the same on both clients. Nothing here is
// stored except `completedAt`, which the app sets the first time `done` turns
// true.

export type ChallengeDay = {
  dateKey: string;
  /** Resolved value for the day; null when nothing is logged or synced. */
  value: number | null;
  /** At or above the day's target (for `total`, the fair daily share). */
  hit: boolean;
  isToday: boolean;
  isFuture: boolean;
};

/** Where the week or month stands, in a word. There is no "failed". */
export type ChallengeTone = 'on' | 'tight' | 'off' | 'done';

export type ChallengeProgress = {
  done: boolean;
  /** 0–1, for a bar or a screen reader. */
  progress: number;
  /** Days hit, total so far, or current run, against `goal`. */
  current: number;
  goal: number;
  tone: ChallengeTone;
  /** One calm sentence: what's left, or that it's done. */
  status: string;
  /** True once the last day has passed. */
  ended: boolean;
  days: ChallengeDay[];
};

export type ChallengeInput = {
  metric: DailyMetricKey;
  rule: ChallengeRule;
  startDate: string;
  endDate: string;
  /** Only changes the wording; the range decides which days count. Defaults to "week". */
  period?: ChallengePeriod;
};

type DayValues = Record<string, number | null | undefined>;

/** Safety cap on a range's length (a calendar month at most). */
const MAX_RANGE_DAYS = 31;

const PERIOD_WORDS: Record<ChallengePeriod, { noun: string; next: string }> = {
  week: { noun: 'week', next: 'Sunday' },
  month: { noun: 'month', next: 'on the 1st' },
};

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** "7,000 steps on 5 of 7 days", or "7,000 steps on 20 days this month" */
export function describeChallengeRule(
  rule: ChallengeRule,
  metric: DailyMetricKey = 'steps',
  period: ChallengePeriod = 'week',
): string {
  const unit = DAILY_METRICS[metric].unit;
  const { noun } = PERIOD_WORDS[period];

  switch (rule.kind) {
    case 'days_hit':
      return period === 'week'
        ? `${formatCount(rule.dailyTarget)} ${unit} on ${rule.daysNeeded} of 7 days`
        : `${formatCount(rule.dailyTarget)} ${unit} on ${rule.daysNeeded} days this ${noun}`;
    case 'total':
      return `${formatCount(rule.target)} ${unit} this ${noun}`;
    case 'streak':
      return `${formatCount(rule.dailyTarget)} a day, ${rule.length} days running`;
  }
}

/** The date keys from `startDate` to `endDate`, inclusive. */
export function challengeDateKeys(startDate: string, endDate: string): string[] {
  const keys: string[] = [];
  let key = startDate;
  while (key <= endDate && keys.length < MAX_RANGE_DAYS) {
    keys.push(key);
    key = addDays(key, 1);
  }
  return keys;
}

/** Days still to play for: today (unless already hit) and every day after it. */
function openDayCount(days: ChallengeDay[]): number {
  return days.filter((day) => day.isFuture || (day.isToday && !day.hit)).length;
}

function buildDays(
  input: ChallengeInput,
  values: DayValues,
  todayKey: string,
  dayTarget: number,
): ChallengeDay[] {
  return challengeDateKeys(input.startDate, input.endDate).map((dateKey) => {
    const isFuture = dateKey > todayKey;
    // A future day can't count yet, even if a source sent something early.
    const value = isFuture ? null : (values[dateKey] ?? null);
    return {
      dateKey,
      value,
      hit: value != null && value >= dayTarget,
      isToday: dateKey === todayKey,
      isFuture,
    };
  });
}

function freshStart(input: ChallengeInput): string {
  return `A new ${PERIOD_WORDS[input.period ?? 'week'].noun} is a fresh start.`;
}

function nextStarts(input: ChallengeInput): string {
  const { noun, next } = PERIOD_WORDS[input.period ?? 'week'];
  return `A new ${noun} starts ${next}.`;
}

export function evaluateDaysHit(
  input: ChallengeInput & { rule: DaysHitRule },
  values: DayValues,
  todayKey: string,
): ChallengeProgress {
  const { dailyTarget, daysNeeded } = input.rule;
  const days = buildDays(input, values, todayKey, dailyTarget);
  const hit = days.filter((day) => day.hit).length;
  const done = hit >= daysNeeded;
  const ended = todayKey > input.endDate;
  const need = daysNeeded - hit;
  const open = openDayCount(days);
  const base = {
    done,
    ended,
    days,
    current: hit,
    goal: daysNeeded,
    progress: Math.min(1, hit / daysNeeded),
  };

  if (done) {
    return { ...base, tone: 'done', status: 'Enough days are in. Anything more is a bonus.' };
  }
  if (ended) {
    return {
      ...base,
      tone: 'off',
      status: `${hit} of ${daysNeeded} days this time. ${freshStart(input)}`,
    };
  }
  if (need > open) {
    return {
      ...base,
      tone: 'off',
      status: `Needs ${plural(need, 'more day')} and ${open} ${open === 1 ? 'is' : 'are'} left. ${nextStarts(input)}`,
    };
  }
  if (need === open) {
    return {
      ...base,
      tone: 'tight',
      status: `Needs ${need} of the ${plural(open, 'day')} left. No spare days.`,
    };
  }
  return {
    ...base,
    tone: 'on',
    status: `Needs ${need} of the ${plural(open, 'day')} left, ${open - need} to spare.`,
  };
}

export function evaluateTotal(
  input: ChallengeInput & { rule: TotalRule },
  values: DayValues,
  todayKey: string,
): ChallengeProgress {
  const { target } = input.rule;
  const unit = DAILY_METRICS[input.metric].unit;
  const keys = challengeDateKeys(input.startDate, input.endDate);
  // A day "counts" in the dots when it carries its fair share of the target.
  const fairShare = Math.round(target / Math.max(1, keys.length) / 100) * 100;
  const days = buildDays(input, values, todayKey, fairShare);
  const sum = days.reduce((acc, day) => acc + (day.value ?? 0), 0);
  const done = sum >= target;
  const ended = todayKey > input.endDate;
  const base = {
    done,
    ended,
    days,
    current: sum,
    goal: target,
    progress: Math.min(1, sum / target),
  };

  if (done) {
    return { ...base, tone: 'done', status: 'Target reached. Anything more is a bonus.' };
  }
  if (ended) {
    return {
      ...base,
      tone: 'off',
      status: `${formatCount(sum)} ${unit} this time. ${freshStart(input)}`,
    };
  }

  const daysLeft = days.filter((day) => day.isToday || day.isFuture).length;
  const perDay = Math.ceil((target - sum) / Math.max(1, daysLeft) / 100) * 100;
  const tone: ChallengeTone = perDay > 20_000 ? 'off' : perDay > 12_000 ? 'tight' : 'on';
  return {
    ...base,
    tone,
    status: `About ${formatCount(perDay)} a day for the ${plural(daysLeft, 'day')} left.`,
  };
}

/**
 * A run is consecutive days at target. Today not being hit yet doesn't break
 * the run (the day isn't over); any earlier miss does. Done once any run in
 * the range reaches `length`.
 */
export function evaluateStreak(
  input: ChallengeInput & { rule: StreakRule },
  values: DayValues,
  todayKey: string,
): ChallengeProgress {
  const { dailyTarget, length } = input.rule;
  const days = buildDays(input, values, todayKey, dailyTarget);
  let run = 0;
  let best = 0;
  for (const day of days) {
    if (day.isFuture) break;
    if (day.hit) run += 1;
    else if (!day.isToday) run = 0;
    best = Math.max(best, run);
  }
  const done = best >= length;
  const ended = todayKey > input.endDate;
  const current = done ? length : run;
  const base = {
    done,
    ended,
    days,
    current,
    goal: length,
    progress: Math.min(1, current / length),
  };

  if (done) {
    return { ...base, tone: 'done', status: `${length} days in a row. Anything more is a bonus.` };
  }
  if (ended) {
    return {
      ...base,
      tone: 'off',
      status: `Longest run: ${plural(best, 'day')}. ${freshStart(input)}`,
    };
  }
  if (length - run > openDayCount(days)) {
    const { noun, next } = PERIOD_WORDS[input.period ?? 'week'];
    return {
      ...base,
      tone: 'off',
      status: `A ${length}-day run can't fit in what's left of this ${noun}. Start a new one ${next}.`,
    };
  }
  return {
    ...base,
    tone: 'on',
    status:
      run === 0
        ? `Every day at ${formatCount(dailyTarget)} from here builds the run.`
        : `${run}-day run. Every day from here keeps it going.`,
  };
}

/** Progress for any rule kind. `values` maps date keys to the resolved daily value. */
export function evaluateChallenge(
  input: ChallengeInput,
  values: DayValues,
  todayKey: string,
): ChallengeProgress {
  const { rule } = input;
  switch (rule.kind) {
    case 'days_hit':
      return evaluateDaysHit({ ...input, rule }, values, todayKey);
    case 'total':
      return evaluateTotal({ ...input, rule }, values, todayKey);
    case 'streak':
      return evaluateStreak({ ...input, rule }, values, todayKey);
  }
}
