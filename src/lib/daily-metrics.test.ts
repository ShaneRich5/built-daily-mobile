import {
  normalizeDailyMetricValue,
  parseStepsInput,
  resolveDailyMetric,
  withSourceValue,
} from '@/lib/daily-metrics';

const at = new Date('2026-11-24T12:00:00Z');

describe('resolveDailyMetric', () => {
  it('is empty when no source has a number', () => {
    expect(resolveDailyMetric({})).toEqual({ value: null, resolvedFrom: null });
  });

  it('uses a manual edit over any synced value, even a higher one', () => {
    expect(
      resolveDailyMetric({
        manual: { value: 6000 },
        apple_health: { value: 8214 },
        shortcut: { value: 7730 },
      }),
    ).toEqual({ value: 6000, resolvedFrom: 'manual' });
  });

  it('uses the highest synced value without a manual edit', () => {
    expect(
      resolveDailyMetric({
        apple_health: { value: 8214 },
        shortcut: { value: 7730 },
        mcp: { value: 9000 },
      }),
    ).toEqual({ value: 9000, resolvedFrom: 'mcp' });
  });

  it('never sums sources', () => {
    expect(
      resolveDailyMetric({ apple_health: { value: 5000 }, health_connect: { value: 5000 } }).value,
    ).toBe(5000);
  });

  it('breaks ties by source order, so the result is stable', () => {
    expect(
      resolveDailyMetric({ shortcut: { value: 7000 }, apple_health: { value: 7000 } }).resolvedFrom,
    ).toBe('apple_health');
  });

  it('keeps a manual zero (a day the user says had no steps)', () => {
    expect(resolveDailyMetric({ manual: { value: 0 }, apple_health: { value: 300 } })).toEqual({
      value: 0,
      resolvedFrom: 'manual',
    });
  });
});

describe('withSourceValue', () => {
  it('adds a source and re-resolves, keeping the others', () => {
    const edited = withSourceValue(
      withSourceValue(null, 'apple_health', 8214, at),
      'manual',
      9000,
      at,
    );
    expect(edited.value).toBe(9000);
    expect(edited.resolvedFrom).toBe('manual');
    expect(edited.sources.apple_health?.value).toBe(8214);
  });

  it('falls back to the sync when the manual edit is removed', () => {
    const edited = withSourceValue(
      withSourceValue(null, 'apple_health', 8214, at),
      'manual',
      9000,
      at,
    );
    const cleared = withSourceValue(edited, 'manual', null, at);
    expect(cleared.value).toBe(8214);
    expect(cleared.resolvedFrom).toBe('apple_health');
    expect(cleared.sources.manual).toBeUndefined();
  });

  it('does not change the entry it was given', () => {
    const before = withSourceValue(null, 'shortcut', 4000, at);
    withSourceValue(before, 'shortcut', 5000, at);
    expect(before.sources.shortcut?.value).toBe(4000);
  });
});

describe('normalizeDailyMetricValue', () => {
  it('rounds steps and keeps them inside 0–100,000', () => {
    expect(normalizeDailyMetricValue('steps', 8214.6)).toBe(8215);
    expect(normalizeDailyMetricValue('steps', -1)).toBeNull();
    expect(normalizeDailyMetricValue('steps', 100_001)).toBeNull();
    expect(normalizeDailyMetricValue('steps', '9000')).toBeNull();
    expect(normalizeDailyMetricValue('steps', Number.NaN)).toBeNull();
  });
});

describe('parseStepsInput', () => {
  it('reads the digits out of what was typed', () => {
    expect(parseStepsInput('9,000')).toBe(9000);
    expect(parseStepsInput(' 7500 ')).toBe(7500);
    expect(parseStepsInput('')).toBeNull();
    expect(parseStepsInput('abc')).toBeNull();
  });
});
