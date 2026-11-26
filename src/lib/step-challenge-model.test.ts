import {
  buildLogStepsDay,
  buildStepChallengeCardView,
  challengeDaysWindow,
  challengeRange,
  clampStep,
  pickHomeChallenge,
  rangeLabel,
  repeatRange,
  shortSteps,
} from '@/lib/step-challenge-model';
import type { ChallengePeriod, ChallengeRule, SavedChallenge } from '@/types/challenge';
import type { DailyMetricSource, DailyMetricsDay } from '@/types/daily-metric';

const at = new Date('2026-11-20T12:00:00Z');
const daysHit: ChallengeRule = { kind: 'days_hit', dailyTarget: 7000, daysNeeded: 5 };
const total: ChallengeRule = { kind: 'total', target: 50000 };

function challenge(
  rule: ChallengeRule,
  startDate = '2026-11-22',
  period: ChallengePeriod = 'week',
  id = `c-${startDate}`,
  createdAt = at,
): SavedChallenge {
  const { endDate } = challengeRange(period, startDate);
  return {
    id,
    challenge: {
      metric: 'steps',
      rule,
      period,
      startDate,
      endDate,
      groupId: null,
      completedAt: null,
      createdAt,
      updatedAt: createdAt,
    },
  };
}

function day(
  dateKey: string,
  sources: Partial<Record<DailyMetricSource, number>>,
): [string, DailyMetricsDay] {
  const entries = Object.entries(sources) as [DailyMetricSource, number][];
  const manual = sources.manual;
  const synced = entries.filter(([source]) => source !== 'manual');
  const best = synced.sort((a, b) => b[1] - a[1])[0];
  return [
    dateKey,
    {
      dateKey,
      updatedAt: at,
      metrics: {
        steps: {
          value: manual ?? best?.[1] ?? null,
          resolvedFrom: manual != null ? 'manual' : (best?.[0] ?? null),
          sources: Object.fromEntries(
            entries.map(([source, value]) => [source, { value, updatedAt: at }]),
          ),
        },
      },
    },
  ];
}

const week = Object.fromEntries([
  day('2026-11-22', { manual: 8214 }),
  day('2026-11-23', { apple_health: 7480 }),
  day('2026-11-24', { manual: 3100, apple_health: 2900 }),
]);

describe('challengeRange', () => {
  it('is Sunday to Saturday for a week', () => {
    expect(challengeRange('week', '2026-11-24')).toEqual({
      startDate: '2026-11-22',
      endDate: '2026-11-28',
    });
  });

  it('is the whole calendar month for a month', () => {
    expect(challengeRange('month', '2026-11-24')).toEqual({
      startDate: '2026-11-01',
      endDate: '2026-11-30',
    });
    expect(challengeRange('month', '2028-02-10').endDate).toBe('2028-02-29');
  });
});

describe('challengeDaysWindow', () => {
  it('reaches back to last week or the ended month, and on to the later end', () => {
    // Nov 26: last week starts Nov 15; this month started Nov 1, so the 1st wins.
    expect(challengeDaysWindow('2026-11-26')).toEqual({
      startDate: '2026-11-01',
      endDate: '2026-11-30',
    });
    // Dec 2: a November challenge ended 2 days ago, and this week runs to Dec 5.
    expect(challengeDaysWindow('2026-12-02')).toEqual({
      startDate: '2026-11-01',
      endDate: '2026-12-31',
    });
  });
});

describe('repeatRange', () => {
  const november = challenge(
    { kind: 'days_hit', dailyTarget: 7000, daysNeeded: 20 },
    '2026-11-01',
    'month',
  );

  it('repeats a running month as next month', () => {
    expect(repeatRange(november, '2026-11-26')).toEqual({
      startDate: '2026-12-01',
      endDate: '2026-12-31',
    });
  });

  it('repeats a month that already ended as the current month', () => {
    expect(repeatRange(november, '2026-12-02')).toEqual({
      startDate: '2026-12-01',
      endDate: '2026-12-31',
    });
  });

  it('repeats a week as the next Sunday–Saturday', () => {
    expect(repeatRange(challenge(daysHit), '2026-11-27')).toEqual({
      startDate: '2026-11-29',
      endDate: '2026-12-05',
    });
  });
});

describe('pickHomeChallenge', () => {
  it('shows the running challenge, newest first, and the one set after it', () => {
    const older = challenge(daysHit, '2026-11-22', 'week', 'older', new Date('2026-11-20'));
    const newer = challenge(total, '2026-11-22', 'week', 'newer', new Date('2026-11-21'));
    const next = challenge(daysHit, '2026-11-29', 'week', 'next');
    const pick = pickHomeChallenge([older, newer, next], '2026-11-24');
    expect(pick.shown?.id).toBe('newer');
    expect(pick.upcoming?.id).toBe('next');
  });

  it('keeps a finished one for a few days, then lets it go', () => {
    const last = challenge(daysHit, '2026-11-15');
    expect(pickHomeChallenge([last], '2026-11-24').shown?.id).toBe(last.id);
    expect(pickHomeChallenge([last], '2026-11-25').shown).toBeNull();
  });
});

describe('buildStepChallengeCardView', () => {
  it('describes a running week, day by day', () => {
    const view = buildStepChallengeCardView(challenge(daysHit), week, '2026-11-24', null);
    expect(view.state).toBe('active');
    expect(view.heading).toBe('This week’s steps');
    expect(view.rangeLabel).toBe('Nov 22–28');
    expect(view.title).toBe('7,000 steps on 5 of 7 days');
    expect(view.bigValue).toBe('2');
    expect(view.bigSuffix).toBe('/ 5 days');
    expect(view.showBar).toBe(false);
    expect(view.days.map((cell) => cell.short)).toEqual(['8.2k', '7.5k', '3.1k', '', '', '', '']);
    expect(view.days.map((cell) => cell.letter).join('')).toBe('SMTWTFS');
    expect(view.days[1].synced).toBe(true);
    expect(view.days[1].label).toBe(
      'Monday, 7,480 steps, from Apple Health, target hit. Edit steps.',
    );
    expect(view.days[4].label).toBe('Thursday, not yet');
    expect(view.today).toEqual({ value: '3,100', source: 'Typed in', synced: false });
    expect(view.repeatLabel).toBeNull();
  });

  it('shows a bar and a total for the total rule', () => {
    const view = buildStepChallengeCardView(challenge(total), week, '2026-11-24', null);
    expect(view.showBar).toBe(true);
    expect(view.bigValue).toBe('18,794');
    expect(view.bigSuffix).toBe('/ 50,000');
  });

  it('offers the same again once done, unless the next one is set', () => {
    const easy: ChallengeRule = { kind: 'days_hit', dailyTarget: 1000, daysNeeded: 2 };
    const done = buildStepChallengeCardView(challenge(easy), week, '2026-11-24', null);
    expect(done.state).toBe('done');
    expect(done.heading).toBe('Challenge complete');
    expect(done.repeatLabel).toBe('Same again next week');

    const set = buildStepChallengeCardView(
      challenge(easy),
      week,
      '2026-11-24',
      challenge(easy, '2026-11-29'),
    );
    expect(set.nextSet).toBe(true);
    expect(set.repeatLabel).toBeNull();
  });

  it('names an ended month and offers this month again', () => {
    const november = challenge(
      { kind: 'days_hit', dailyTarget: 7000, daysNeeded: 20 },
      '2026-11-01',
      'month',
    );
    const view = buildStepChallengeCardView(november, week, '2026-12-02', null);
    expect(view.state).toBe('ended');
    expect(view.heading).toBe('Last month’s steps');
    expect(view.days).toHaveLength(30);
    expect(view.days[23].dayOfMonth).toBe(24);
    expect(view.days[23].label).toMatch(/^Tuesday, Nov 24, 3,100 steps/);
    expect(view.today).toBeNull();
    expect(view.repeatLabel).toBe('Same again this month');
  });
});

describe('buildLogStepsDay', () => {
  it('separates what was typed from what synced', () => {
    expect(buildLogStepsDay('2026-11-24', week)).toEqual({
      dateKey: '2026-11-24',
      title: 'Steps for Tuesday, Nov 24',
      manual: 3100,
      synced: { value: 2900, source: 'Apple Health' },
    });
    expect(buildLogStepsDay('2026-11-25', week)).toMatchObject({ manual: null, synced: null });
  });
});

describe('small formatters', () => {
  it('shortens step counts', () => {
    expect(shortSteps(null)).toBe('–');
    expect(shortSteps(950)).toBe('950');
    expect(shortSteps(8000)).toBe('8k');
    expect(shortSteps(8214)).toBe('8.2k');
  });

  it('labels a range inside and across months', () => {
    expect(rangeLabel('2026-11-22', '2026-11-28')).toBe('Nov 22–28');
    expect(rangeLabel('2026-11-29', '2026-12-05')).toBe('Nov 29 – Dec 5');
  });

  it('clamps a nudge to the limit', () => {
    expect(clampStep(7000, 500, { min: 1000, max: 7200 })).toBe(7200);
    expect(clampStep(1000, -500, { min: 1000, max: 50000 })).toBe(1000);
  });
});
