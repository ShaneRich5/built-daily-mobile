import {
  describeChallengeRule,
  evaluateChallenge,
  evaluateDaysHit,
  evaluateStreak,
  evaluateTotal,
} from '@/lib/challenge-evaluate';

/** Sun Nov 22 – Sat Nov 28, 2026. */
const week = {
  metric: 'steps' as const,
  startDate: '2026-11-22',
  endDate: '2026-11-28',
};

/** Values for the week from Sunday, e.g. `days(8200, 7500)` fills Sun and Mon. */
function days(...values: (number | null)[]): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  values.forEach((v, i) => {
    out[`2026-11-${22 + i}`] = v;
  });
  return out;
}

describe('evaluateDaysHit', () => {
  const input = {
    ...week,
    rule: { kind: 'days_hit' as const, dailyTarget: 7000, daysNeeded: 5 },
  };

  it('counts days at or above the target', () => {
    const r = evaluateDaysHit(input, days(8214, 7000, 3100), '2026-11-24');
    expect(r.current).toBe(2);
    expect(r.goal).toBe(5);
    expect(r.done).toBe(false);
    expect(r.progress).toBe(2 / 5);
    expect(r.days.map((d) => d.hit)).toEqual([true, true, false, false, false, false, false]);
  });

  it('says how many days are left to spare', () => {
    // Today (Tue) not hit yet: Tue–Sat are 5 open days, 3 needed.
    const r = evaluateDaysHit(input, days(8214, 7480, 3100), '2026-11-24');
    expect(r.tone).toBe('on');
    expect(r.status).toBe('Needs 3 of the 5 days left, 2 to spare.');
  });

  it('is tight when every open day is needed', () => {
    const r = evaluateDaysHit(input, days(8000, 2000, 1000), '2026-11-25');
    // Wed–Sat open (4), 4 needed.
    expect(r.tone).toBe('tight');
    expect(r.status).toBe('Needs 4 of the 4 days left. No spare days.');
  });

  it('is out of reach, calmly, when too few days are left', () => {
    const r = evaluateDaysHit(input, days(0, 0, 0, 0, 0), '2026-11-27');
    expect(r.tone).toBe('off');
    expect(r.status).toMatch(/A new week starts Sunday\.$/);
  });

  it('is done once enough days are in, and ignores future values', () => {
    const r = evaluateDaysHit(input, days(9000, 9000, 9000, 9000, 9000, 1, 99999), '2026-11-26');
    expect(r.done).toBe(true);
    expect(r.tone).toBe('done');
    expect(r.progress).toBe(1);
    expect(r.days[6]?.value).toBe(null);
  });

  it('reports an ended week that fell short without a failure word', () => {
    const r = evaluateDaysHit(input, days(9000, 9000, 9000), '2026-11-30');
    expect(r.ended).toBe(true);
    expect(r.done).toBe(false);
    expect(r.status).toBe('3 of 5 days this time. A new week is a fresh start.');
  });
});

describe('evaluateTotal', () => {
  const input = { ...week, rule: { kind: 'total' as const, target: 50000 } };

  it('sums the days so far', () => {
    const r = evaluateTotal(input, days(10000, 8000, 2000), '2026-11-24');
    expect(r.current).toBe(20000);
    expect(r.goal).toBe(50000);
    expect(r.progress).toBe(0.4);
    expect(r.done).toBe(false);
  });

  it('gives a per-day pace for the days left, rounded up to 100', () => {
    // 30,000 left over Tue–Sat (5 days) = 6,000 a day.
    const r = evaluateTotal(input, days(10000, 8000, 2000), '2026-11-24');
    expect(r.status).toBe('About 6,000 a day for the 5 days left.');
    expect(r.tone).toBe('on');
  });

  it('marks a day as hit when it carries its fair share of the target', () => {
    // Fair share of 50,000 over 7 days is ~7,100.
    const r = evaluateTotal(input, days(7200, 7000), '2026-11-23');
    expect(r.days.slice(0, 2).map((d) => d.hit)).toEqual([true, false]);
  });

  it('is done at the target', () => {
    const r = evaluateTotal(input, days(20000, 20000, 10000), '2026-11-24');
    expect(r.done).toBe(true);
    expect(r.status).toBe('Target reached. Anything more is a bonus.');
  });
});

describe('evaluateStreak', () => {
  const input = {
    ...week,
    rule: { kind: 'streak' as const, dailyTarget: 6000, length: 7 },
  };

  it("counts the current run, and today not being hit yet doesn't break it", () => {
    const r = evaluateStreak(input, days(6500, 7000, 1200), '2026-11-24');
    expect(r.current).toBe(2);
    expect(r.status).toBe('2-day run. Every day from here keeps it going.');
  });

  it('restarts the run after a missed day', () => {
    const r = evaluateStreak(
      { ...input, rule: { ...input.rule, length: 3 } },
      days(6500, 100, 7000),
      '2026-11-24',
    );
    expect(r.current).toBe(1);
  });

  it('is out of reach when a full run can no longer fit', () => {
    const r = evaluateStreak(input, days(6500, 100), '2026-11-24');
    expect(r.tone).toBe('off');
    expect(r.status).toMatch(/can't fit/);
  });

  it('is done once any run reaches the length', () => {
    const r = evaluateStreak(
      { ...input, rule: { ...input.rule, length: 3 } },
      days(6000, 6000, 6000, 100),
      '2026-11-26',
    );
    expect(r.done).toBe(true);
    expect(r.current).toBe(3);
    expect(r.progress).toBe(1);
  });
});

describe('evaluateChallenge', () => {
  it('dispatches on the rule kind', () => {
    const r = evaluateChallenge(
      { ...week, rule: { kind: 'total', target: 10000 } },
      days(12000),
      '2026-11-22',
    );
    expect(r.done).toBe(true);
  });

  it('describes each preset in plain words', () => {
    expect(
      describeChallengeRule({
        kind: 'days_hit',
        dailyTarget: 7000,
        daysNeeded: 5,
      }),
    ).toBe('7,000 steps on 5 of 7 days');
    expect(describeChallengeRule({ kind: 'total', target: 50000 })).toBe('50,000 steps this week');
    expect(describeChallengeRule({ kind: 'streak', dailyTarget: 6000, length: 7 })).toBe(
      '6,000 a day, 7 days running',
    );
  });
});

describe('monthly challenges', () => {
  /** November 2026: 30 days, Sunday the 1st. */
  const november = {
    metric: 'steps' as const,
    startDate: '2026-11-01',
    endDate: '2026-11-30',
    period: 'month' as const,
  };
  const daysHitRule = {
    kind: 'days_hit' as const,
    dailyTarget: 7000,
    daysNeeded: 20,
  };

  /** The same value on November 1 through `lastDay`. */
  function novemberDays(value: number, lastDay: number) {
    const out: Record<string, number> = {};
    for (let d = 1; d <= lastDay; d++) {
      out[`2026-11-${String(d).padStart(2, '0')}`] = value;
    }
    return out;
  }

  it('covers every day of the month', () => {
    const r = evaluateDaysHit({ ...november, rule: daysHitRule }, {}, '2026-11-10');
    expect(r.days.length).toBe(30);
    expect(r.days[0]!.dateKey).toBe('2026-11-01');
    expect(r.days[29]!.dateKey).toBe('2026-11-30');
  });

  it('counts spare days across the rest of the month', () => {
    const r = evaluateDaysHit(
      { ...november, rule: daysHitRule },
      novemberDays(8000, 10),
      '2026-11-10',
    );
    expect(r.current).toBe(10);
    expect(r.tone).toBe('on');
    expect(r.status).toBe('Needs 10 of the 20 days left, 10 to spare.');
  });

  it("points to the next month when the days can't fit", () => {
    const r = evaluateDaysHit(
      { ...november, rule: daysHitRule },
      novemberDays(8000, 5),
      '2026-11-25',
    );
    expect(r.tone).toBe('off');
    expect(r.status).toBe('Needs 15 more days and 6 are left. A new month starts on the 1st.');
  });

  it('calls a new month a fresh start once it ends', () => {
    const r = evaluateDaysHit(
      { ...november, rule: daysHitRule },
      novemberDays(8000, 5),
      '2026-12-01',
    );
    expect(r.ended).toBe(true);
    expect(r.status).toBe('5 of 20 days this time. A new month is a fresh start.');
  });

  it("spreads a monthly total over the month's days", () => {
    const r = evaluateTotal(
      { ...november, rule: { kind: 'total', target: 200000 } },
      { '2026-11-01': 6700, '2026-11-02': 6600 },
      '2026-11-02',
    );
    // 200,000 / 30 days ≈ 6,667, rounded to 6,700.
    expect(r.days.slice(0, 2).map((d) => d.hit)).toEqual([true, false]);
  });

  it("says a run can't fit in what's left of the month", () => {
    const r = evaluateStreak(
      { ...november, rule: { kind: 'streak', dailyTarget: 6000, length: 14 } },
      {},
      '2026-11-25',
    );
    expect(r.status).toBe(
      "A 14-day run can't fit in what's left of this month. Start a new one on the 1st.",
    );
  });

  it('describes monthly rules in plain words', () => {
    expect(describeChallengeRule(daysHitRule, 'steps', 'month')).toBe(
      '7,000 steps on 20 days this month',
    );
    expect(describeChallengeRule({ kind: 'total', target: 200000 }, 'steps', 'month')).toBe(
      '200,000 steps this month',
    );
  });
});
