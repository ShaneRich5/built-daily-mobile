import {
  DAILY_METRIC_SOURCES,
  DAILY_METRICS,
  type DailyMetricEntry,
  type DailyMetricKey,
  type DailyMetricSource,
} from '@/types/daily-metric';

// The resolve rule for a day's number, shared word for word with the web
// app's `lib/daily-metric-resolve.ts`, so a day resolves the same way no matter
// which client (or the ingest API, or the MCP server) wrote last.

type SourceValues = Partial<Record<DailyMetricSource, { value: number }>>;

export type ResolvedDailyMetric = {
  value: number | null;
  resolvedFrom: DailyMetricSource | null;
};

/**
 * 1. A manual edit wins — the user typed it to correct the sync.
 * 2. Otherwise the highest synced value. Sources are never summed: Apple
 *    Health and Health Connect already merge phone and watch.
 * 3. Nothing is discarded: every source's number stays on the doc, so removing
 *    the manual edit falls back to the sync.
 *
 * Ties keep the first source in `DAILY_METRIC_SOURCES`, so the result is stable.
 */
export function resolveDailyMetric(sources: SourceValues): ResolvedDailyMetric {
  const manual = sources.manual;
  if (manual && Number.isFinite(manual.value)) {
    return { value: manual.value, resolvedFrom: 'manual' };
  }

  let best: ResolvedDailyMetric = { value: null, resolvedFrom: null };
  for (const source of DAILY_METRIC_SOURCES) {
    if (source === 'manual') continue;
    const value = sources[source]?.value;
    if (value == null || !Number.isFinite(value)) continue;
    if (best.value == null || value > best.value) best = { value, resolvedFrom: source };
  }
  return best;
}

/**
 * Sets (or with `value: null`, removes) one source's number on a day's entry
 * and re-resolves it. Returns a new entry; the input is not changed.
 */
export function withSourceValue(
  entry: DailyMetricEntry | null | undefined,
  source: DailyMetricSource,
  value: number | null,
  now: Date,
): DailyMetricEntry {
  const sources = { ...entry?.sources };
  if (value == null) delete sources[source];
  else sources[source] = { value, updatedAt: now };

  return { ...resolveDailyMetric(sources), sources };
}

/**
 * Rounds (for whole-number metrics) and bounds-checks one day's value, or
 * null when it is not a finite number inside the metric's range.
 */
export function normalizeDailyMetricValue(metric: DailyMetricKey, raw: unknown): number | null {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null;

  const definition = DAILY_METRICS[metric];
  const value = definition.integer ? Math.round(raw) : raw;
  return value < definition.min || value > definition.max ? null : value;
}

/** Digits out of whatever was typed — "9,000" and "9000 " both read as 9000. */
export function parseStepsInput(text: string): number | null {
  const digits = text.replace(/[^\d]/g, '');
  return digits ? Number(digits) : null;
}
