// Daily health metrics (steps first): one doc per local calendar day holds
// every metric, with each source's number side by side and one resolved
// value. Mirrors the web app's `lib/daily-metric-types.ts`; the design record
// is docs/STEP_CHALLENGE.md there, and docs/DATA_MODEL.md is the contract
// between the two clients.

/** Where a day's number came from. `manual` is the log sheet in the app. */
export const DAILY_METRIC_SOURCES = [
  'manual',
  'apple_health',
  'health_connect',
  'shortcut',
  'mcp',
] as const;

export type DailyMetricSource = (typeof DAILY_METRIC_SOURCES)[number];

/** Short labels for source chips and the log sheet. */
export const DAILY_METRIC_SOURCE_LABELS: Record<DailyMetricSource, string> = {
  manual: 'Typed in',
  apple_health: 'Apple Health',
  health_connect: 'Health Connect',
  shortcut: 'iOS Shortcut',
  mcp: 'Assistant',
};

export type DailyMetricKey = 'steps';

export type DailyMetricDefinition = {
  key: DailyMetricKey;
  label: string;
  unit: string;
  /** Inclusive bounds for one day's total — the Firestore rules check the same. */
  min: number;
  max: number;
  /** Whole numbers only (values are rounded before the bounds check). */
  integer: boolean;
};

export const DAILY_METRICS: Record<DailyMetricKey, DailyMetricDefinition> = {
  steps: { key: 'steps', label: 'Steps', unit: 'steps', min: 0, max: 100_000, integer: true },
};

export const DAILY_METRIC_KEYS = Object.keys(DAILY_METRICS) as DailyMetricKey[];

export type DailyMetricSourceValue = {
  value: number;
  updatedAt: Date;
};

/** One metric on one day: every source's number, plus the one consumers read. */
export type DailyMetricEntry = {
  /** Resolved value (see `resolveDailyMetric`); null when no source has a number. */
  value: number | null;
  resolvedFrom: DailyMetricSource | null;
  sources: Partial<Record<DailyMetricSource, DailyMetricSourceValue>>;
};

/** `users/{uid}/dailyMetrics/{YYYY-MM-DD}` */
export type DailyMetricsDay = {
  /** Same as the doc id: the user's local calendar day. */
  dateKey: string;
  metrics: Partial<Record<DailyMetricKey, DailyMetricEntry>>;
  updatedAt: Date;
};
