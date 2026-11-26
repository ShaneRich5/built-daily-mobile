import { withSourceValue } from '@/lib/daily-metrics';
import {
  fromChallengeRule,
  fromDailyMetricEntry,
  fromNewChallenge,
  parseChallengeRule,
  toChallenge,
  toDailyMetricsDay,
} from '@/services/firestore/challenge-mappers';

const ts = (iso: string) => ({ toDate: () => new Date(iso) });
const created = ts('2026-11-22T10:00:00Z');

const weekly = {
  metric: 'steps',
  rule: { kind: 'days_hit', dailyTarget: 7000, daysNeeded: 5 },
  period: 'week',
  startDate: '2026-11-22',
  endDate: '2026-11-28',
  groupId: null,
  completedAt: null,
  createdAt: created,
  updatedAt: created,
};

describe('toChallenge', () => {
  it('reads a weekly challenge', () => {
    expect(toChallenge(weekly)).toEqual({
      metric: 'steps',
      rule: { kind: 'days_hit', dailyTarget: 7000, daysNeeded: 5 },
      period: 'week',
      startDate: '2026-11-22',
      endDate: '2026-11-28',
      groupId: null,
      completedAt: null,
      createdAt: new Date('2026-11-22T10:00:00Z'),
      updatedAt: new Date('2026-11-22T10:00:00Z'),
    });
  });

  it('reads a doc from before monthly challenges as weekly', () => {
    const { period: _period, ...old } = weekly;
    expect(toChallenge(old)?.period).toBe('week');
  });

  it('allows a month-sized rule only on a month', () => {
    const month = {
      ...weekly,
      period: 'month',
      rule: { kind: 'days_hit', dailyTarget: 7000, daysNeeded: 20 },
      startDate: '2026-11-01',
      endDate: '2026-11-30',
    };
    expect(toChallenge(month)?.rule).toEqual(month.rule);
    expect(toChallenge({ ...month, period: 'week' })).toBeNull();
  });

  it('drops what it cannot trust', () => {
    expect(toChallenge({ ...weekly, metric: 'sleep' })).toBeNull();
    expect(toChallenge({ ...weekly, period: 'year' })).toBeNull();
    expect(toChallenge({ ...weekly, endDate: '2026-11-01' })).toBeNull();
    expect(toChallenge({ ...weekly, startDate: 'Sunday' })).toBeNull();
    expect(toChallenge({ ...weekly, createdAt: null })).toBeNull();
    expect(toChallenge({ ...weekly, rule: { kind: 'total', target: 10 } })).toBeNull();
  });
});

describe('parseChallengeRule', () => {
  it('reads each kind inside its limits', () => {
    expect(parseChallengeRule({ kind: 'total', target: 50000 })).toEqual({
      kind: 'total',
      target: 50000,
    });
    expect(parseChallengeRule({ kind: 'streak', dailyTarget: 6000, length: 7 })).toEqual({
      kind: 'streak',
      dailyTarget: 6000,
      length: 7,
    });
    expect(parseChallengeRule({ kind: 'streak', dailyTarget: 6000, length: 8 })).toBeNull();
    expect(
      parseChallengeRule({ kind: 'streak', dailyTarget: 6000, length: 14 }, 'month'),
    ).not.toBeNull();
    expect(parseChallengeRule({ kind: 'days_hit', dailyTarget: 7000.5, daysNeeded: 5 })).toBeNull();
    expect(parseChallengeRule(null)).toBeNull();
  });
});

describe('fromNewChallenge', () => {
  it('writes the exact shape the rules accept, rule extras dropped', () => {
    const now = new Date('2026-11-24T08:00:00Z');
    const rule = { kind: 'total', target: 50000, hint: 'extra' } as never;
    expect(
      fromNewChallenge(
        { metric: 'steps', rule, period: 'week', startDate: '2026-11-22', endDate: '2026-11-28' },
        now,
      ),
    ).toEqual({
      metric: 'steps',
      rule: { kind: 'total', target: 50000 },
      period: 'week',
      startDate: '2026-11-22',
      endDate: '2026-11-28',
      groupId: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    expect(fromChallengeRule({ kind: 'days_hit', dailyTarget: 7000, daysNeeded: 5 })).toEqual({
      kind: 'days_hit',
      dailyTarget: 7000,
      daysNeeded: 5,
    });
  });
});

describe('toDailyMetricsDay', () => {
  it('keeps every source and re-resolves rather than trusting the stored value', () => {
    const day = toDailyMetricsDay('2026-11-24', {
      dateKey: '2026-11-24',
      metrics: {
        steps: {
          value: 1,
          resolvedFrom: 'shortcut',
          sources: {
            apple_health: { value: 8214, updatedAt: ts('2026-11-24T20:00:00Z') },
            shortcut: { value: 7730, updatedAt: ts('2026-11-24T21:00:00Z') },
            fitbit: { value: 99999, updatedAt: ts('2026-11-24T21:00:00Z') },
            mcp: { value: 200000, updatedAt: ts('2026-11-24T21:00:00Z') },
          },
        },
      },
      updatedAt: ts('2026-11-24T21:00:00Z'),
    });
    expect(day?.metrics.steps?.value).toBe(8214);
    expect(day?.metrics.steps?.resolvedFrom).toBe('apple_health');
    expect(Object.keys(day?.metrics.steps?.sources ?? {})).toEqual(['apple_health', 'shortcut']);
  });

  it('falls back to the doc id, and drops a doc that is not a day', () => {
    expect(toDailyMetricsDay('2026-11-24', {})?.dateKey).toBe('2026-11-24');
    expect(toDailyMetricsDay('today', {})).toBeNull();
  });
});

describe('fromDailyMetricEntry', () => {
  it('writes one metric with its resolved value, for a merge', () => {
    const now = new Date('2026-11-24T21:00:00Z');
    const entry = withSourceValue(null, 'manual', 9000, now);
    expect(fromDailyMetricEntry('2026-11-24', 'steps', entry, now)).toEqual({
      dateKey: '2026-11-24',
      metrics: {
        steps: {
          value: 9000,
          resolvedFrom: 'manual',
          sources: { manual: { value: 9000, updatedAt: now } },
        },
      },
      updatedAt: now,
    });
  });
});
