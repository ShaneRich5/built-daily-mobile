import { addDays } from '@/lib/date-keys';
import { type BodyWeightEntry, MAX_BODY_WEIGHT_LBS } from '@/types/progress';

/** What was typed, as a weight in pounds — or null when it is not a plausible one. */
export function parseWeight(raw: string): number | null {
  const trimmed = raw.trim().replace(',', '.');
  if (!trimmed) return null;

  const value = Number(trimmed);
  if (!Number.isFinite(value) || value <= 0 || value > MAX_BODY_WEIGHT_LBS) return null;

  return Math.round(value * 10) / 10;
}

/**
 * The latest weigh-in and how it compares with a month ago: the change from
 * the last weigh-in on or before 30 days back. Null change when there is no
 * weigh-in that old.
 */
export function weightSummary(
  entries: readonly BodyWeightEntry[],
  todayKey: string,
): { current: number | null; change: number | null; trend: string } {
  const sorted = [...entries].sort(
    (a, b) => a.dateKey.localeCompare(b.dateKey) || a.createdAt.getTime() - b.createdAt.getTime(),
  );
  const current = sorted[sorted.length - 1]?.weightLbs ?? null;
  const monthAgoKey = addDays(todayKey, -30);
  const monthAgo = [...sorted].reverse().find((entry) => entry.dateKey <= monthAgoKey);

  const change =
    current !== null && monthAgo ? Math.round((current - monthAgo.weightLbs) * 10) / 10 : null;

  const trend =
    change === null
      ? ''
      : change === 0
        ? 'no change in 30 days'
        : `${change > 0 ? '+' : '−'}${Math.abs(change)} in 30 days`;

  return { current, change, trend };
}

/**
 * Points for a sparkline of the last `count` weigh-ins, scaled into a
 * `width` × `height` box with a little headroom. Empty with fewer than two:
 * one point is not a line.
 */
export function sparklinePoints(
  entries: readonly BodyWeightEntry[],
  width: number,
  height: number,
  count = 30,
): { x: number; y: number }[] {
  const recent = [...entries].sort((a, b) => a.dateKey.localeCompare(b.dateKey)).slice(-count);
  if (recent.length < 2) return [];

  const weights = recent.map((entry) => entry.weightLbs);
  const min = Math.min(...weights);
  const span = Math.max(1, Math.max(...weights) - min);

  return recent.map((entry, i) => ({
    x: (i / (recent.length - 1)) * width,
    y: 4 + (1 - (entry.weightLbs - min) / span) * (height - 8),
  }));
}
