import { normalizeDailyMetricValue, resolveDailyMetric } from '@/lib/daily-metrics';
import { toDate } from '@/services/firestore/mappers';
import {
  CHALLENGE_LIMITS,
  type Challenge,
  type ChallengePeriod,
  type ChallengeRule,
  type NewChallenge,
} from '@/types/challenge';
import {
  DAILY_METRIC_KEYS,
  DAILY_METRIC_SOURCES,
  DAILY_METRICS,
  type DailyMetricEntry,
  type DailyMetricKey,
  type DailyMetricsDay,
} from '@/types/daily-metric';

// Mappers for `users/{uid}/challenges` and `users/{uid}/dailyMetrics`. No
// firebase import, like `mappers.ts`: they run over plain document data, and
// write plain `Date`s, which the SDK stores as Timestamps. They follow the web
// app's `lib/challenge-mapper.ts` and `lib/daily-metric-mapper.ts` field for
// field, including what each treats as too malformed to show.

type DocData = Record<string, unknown>;

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function isDailyMetricKey(value: unknown): value is DailyMetricKey {
  return typeof value === 'string' && value in DAILY_METRICS;
}

function inRange(value: unknown, limits: { min: number; max: number }): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= limits.min &&
    value <= limits.max
  );
}

/** A rule with every field inside the period's `CHALLENGE_LIMITS`, or null. */
export function parseChallengeRule(
  raw: unknown,
  period: ChallengePeriod = 'week',
): ChallengeRule | null {
  if (!raw || typeof raw !== 'object') return null;

  const rule = raw as DocData;
  const limits = CHALLENGE_LIMITS[period];
  switch (rule.kind) {
    case 'days_hit':
      return inRange(rule.dailyTarget, limits.dailyTarget) &&
        inRange(rule.daysNeeded, limits.daysNeeded)
        ? { kind: 'days_hit', dailyTarget: rule.dailyTarget, daysNeeded: rule.daysNeeded }
        : null;
    case 'total':
      return inRange(rule.target, limits.total) ? { kind: 'total', target: rule.target } : null;
    case 'streak':
      return inRange(rule.dailyTarget, limits.dailyTarget) &&
        inRange(rule.length, limits.streakLength)
        ? { kind: 'streak', dailyTarget: rule.dailyTarget, length: rule.length }
        : null;
    default:
      return null;
  }
}

/** Only the rule's own fields: the Firestore rules refuse any extra key. */
export function fromChallengeRule(rule: ChallengeRule): DocData {
  switch (rule.kind) {
    case 'days_hit':
      return { kind: rule.kind, dailyTarget: rule.dailyTarget, daysNeeded: rule.daysNeeded };
    case 'total':
      return { kind: rule.kind, target: rule.target };
    case 'streak':
      return { kind: rule.kind, dailyTarget: rule.dailyTarget, length: rule.length };
  }
}

/** A new challenge's document: not done yet, and personal (`groupId` null). */
export function fromNewChallenge(input: NewChallenge, now: Date): DocData {
  return {
    metric: input.metric,
    rule: fromChallengeRule(input.rule),
    period: input.period,
    startDate: input.startDate,
    endDate: input.endDate,
    groupId: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** `challenges` document data → challenge, or null for one too malformed to show. */
export function toChallenge(data: DocData): Challenge | null {
  if (!isDailyMetricKey(data.metric)) return null;

  // Docs from before monthly challenges have no period; they were all weekly.
  const period = data.period == null ? 'week' : data.period;
  if (period !== 'week' && period !== 'month') return null;

  const rule = parseChallengeRule(data.rule, period);
  if (!rule) return null;

  const { startDate, endDate } = data;
  if (typeof startDate !== 'string' || !DATE_KEY.test(startDate)) return null;
  if (typeof endDate !== 'string' || !DATE_KEY.test(endDate)) return null;
  if (endDate < startDate) return null;

  const createdAt = toDate(data.createdAt);
  if (!createdAt) return null;

  return {
    metric: data.metric,
    rule,
    period,
    startDate,
    endDate,
    groupId: null,
    completedAt: toDate(data.completedAt),
    createdAt,
    updatedAt: toDate(data.updatedAt) ?? createdAt,
  };
}

function toDailyMetricEntry(metric: DailyMetricKey, raw: unknown): DailyMetricEntry | null {
  if (!raw || typeof raw !== 'object') return null;

  const rawSources = (raw as DocData).sources;
  if (!rawSources || typeof rawSources !== 'object') return null;

  const sources: DailyMetricEntry['sources'] = {};
  for (const source of DAILY_METRIC_SOURCES) {
    const stored = (rawSources as DocData)[source];
    if (!stored || typeof stored !== 'object') continue;

    const value = normalizeDailyMetricValue(metric, (stored as DocData).value);
    if (value == null) continue;
    sources[source] = { value, updatedAt: toDate((stored as DocData).updatedAt) ?? new Date(0) };
  }

  // Re-resolved on read rather than trusting the stored `value`, so a doc
  // written by an older client can never disagree with the rule.
  return { ...resolveDailyMetric(sources), sources };
}

/** `dailyMetrics/{dateKey}` document data → the day, or null when the id is not a day. */
export function toDailyMetricsDay(id: string, data: DocData): DailyMetricsDay | null {
  const dateKey = typeof data.dateKey === 'string' ? data.dateKey : id;
  if (!DATE_KEY.test(dateKey)) return null;

  const metrics: DailyMetricsDay['metrics'] = {};
  const rawMetrics = data.metrics;
  if (rawMetrics && typeof rawMetrics === 'object') {
    for (const key of DAILY_METRIC_KEYS) {
      const entry = toDailyMetricEntry(key, (rawMetrics as DocData)[key]);
      if (entry) metrics[key] = entry;
    }
  }

  return { dateKey, metrics, updatedAt: toDate(data.updatedAt) ?? new Date(0) };
}

/**
 * The fields to merge into a day's doc after one metric changed. Written with
 * `{ merge: true }`, so other metrics and other sources on the same day are
 * left alone. A removed source is deleted by the caller with `deleteField()`.
 */
export function fromDailyMetricEntry(
  dateKey: string,
  metric: DailyMetricKey,
  entry: DailyMetricEntry,
  now: Date,
): DocData {
  const sources: DocData = {};
  for (const [source, stored] of Object.entries(entry.sources)) {
    if (stored) sources[source] = { value: stored.value, updatedAt: stored.updatedAt };
  }

  return {
    dateKey,
    metrics: { [metric]: { value: entry.value, resolvedFrom: entry.resolvedFrom, sources } },
    updatedAt: now,
  };
}
