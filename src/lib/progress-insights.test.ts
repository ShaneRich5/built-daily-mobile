import { parseWeight, sparklinePoints, weightSummary } from '@/lib/body-weight';
import {
  activeDaysThisWeek,
  bestLifts,
  computeMilestones,
  estimatedOneRepMax,
  firstRecordDateKey,
  sessionRecords,
  strongestLifts,
} from '@/lib/progress-insights';
import { line, log, session } from '@/lib/session/session-test-helpers';
import type { CatalogExercise } from '@/lib/exercise-catalog';
import type { BodyWeightEntry } from '@/types/progress';

const TODAY = '2026-11-11';

const lift = (id: string, name = id): CatalogExercise => ({ id, name, metric: 'weight_reps' });

const workout = (id: string, day: string, lines: ReturnType<typeof line>[]) =>
  session(id, lines, { workoutDate: day });

describe('estimatedOneRepMax', () => {
  it('uses Epley’s formula', () => {
    expect(estimatedOneRepMax(100, 10)).toBe(133.3);
    expect(estimatedOneRepMax(225, 1)).toBe(225);
  });

  it('is zero for a set without weight or reps', () => {
    expect(estimatedOneRepMax(0, 5)).toBe(0);
    expect(estimatedOneRepMax(100, 0)).toBe(0);
  });
});

describe('records', () => {
  const history = [
    workout('a', '2026-11-02', [line(lift('bench', 'Bench'), [log({ weight: 135, reps: 8 })])]),
    workout('b', '2026-11-05', [
      line(lift('bench', 'Bench'), [log({ weight: 145, reps: 6 }), log({ weight: 155, reps: 3 })]),
      line(lift('squat', 'Squat'), [log({ weight: 185, reps: 5 })]),
    ]),
    workout('c', '2026-11-09', [line(lift('bench', 'Bench'), [log({ weight: 135, reps: 5 })])]),
  ];

  it('keeps the best set per exercise by estimated one-rep max', () => {
    const best = bestLifts(history);

    expect(best.get('bench')).toMatchObject({ weight: 145, reps: 6, sessionId: 'b' });
    expect(best.get('squat')).toMatchObject({ weight: 185, reps: 5 });
  });

  it('lists what a single workout set as records', () => {
    expect([...sessionRecords(history, 'b').keys()].sort()).toEqual(['bench', 'squat']);
    expect(sessionRecords(history, 'b').get('bench')).toMatchObject({ weight: 145, reps: 6 });
    expect(sessionRecords(history, 'c').size).toBe(0);
  });

  it('finds the day of the first record', () => {
    expect(firstRecordDateKey(history)).toBe('2026-11-02');
    expect(firstRecordDateKey([])).toBeNull();
  });

  it('ignores workouts still in progress and unweighted moves', () => {
    const open = session('open', [line(lift('bench'), [log({ weight: 300, reps: 5 })])], {
      status: 'in_progress',
    });
    const reps = workout('r', '2026-11-03', [
      { ...line(lift('pullup'), [log({ reps: 12 })]), metric: 'bodyweight_reps' },
    ]);

    expect(bestLifts([open, reps]).size).toBe(0);
  });
});

describe('strongestLifts', () => {
  it('prefers the big compound lifts, then the strongest of the rest, up to four', () => {
    const best = bestLifts([
      workout('a', '2026-11-02', [
        line(lift('curl'), [log({ weight: 40, reps: 10 })]),
        line(lift('leg-press'), [log({ weight: 400, reps: 10 })]),
        line(lift('bench'), [log({ weight: 135, reps: 5 })]),
        line(lift('squat'), [log({ weight: 185, reps: 5 })]),
        line(lift('lunge'), [log({ weight: 50, reps: 10 })]),
      ]),
    ]);

    expect(strongestLifts(best).map((record) => record.exerciseId)).toEqual([
      'bench',
      'squat',
      'leg-press',
      'lunge',
    ]);
  });
});

describe('activeDaysThisWeek', () => {
  it('counts days with a workout or an activity, each day once', () => {
    const sessions = [workout('a', '2026-11-09', []), workout('b', '2026-11-09', []), workout('old', '2026-11-04', [])];
    const activities = [
      { id: 'w', activityTypeId: 'walk', activityDate: '2026-11-10', activityTime: null, durationMin: 30, distanceMiles: null, locationName: null, notes: null, createdAt: new Date(0), updatedAt: new Date(0) },
      { id: 'x', activityTypeId: 'walk', activityDate: '2026-11-09', activityTime: null, durationMin: 30, distanceMiles: null, locationName: null, notes: null, createdAt: new Date(0), updatedAt: new Date(0) },
    ];

    expect(activeDaysThisWeek(sessions, activities, TODAY)).toBe(2);
  });
});

describe('computeMilestones', () => {
  const ten = Array.from({ length: 10 }, (_, i) => workout(`w${i}`, `2026-10-${String(i + 10)}`, []));
  const earned = (milestones: ReturnType<typeof computeMilestones>) =>
    milestones.filter((milestone) => milestone.achieved).map((milestone) => milestone.id);

  it('earns workout-count milestones', () => {
    expect(earned(computeMilestones({ sessions: ten, streak: 0, longestStreak: 0, firstRecord: null, todayKey: TODAY }))).toEqual([
      'first-workout',
      'workouts-10',
    ]);
  });

  it('earns streak milestones from the best run, current or past', () => {
    const ids = earned(computeMilestones({ sessions: [], streak: 2, longestStreak: 12, firstRecord: null, todayKey: TODAY }));

    expect(ids).toEqual(['goal-weeks-4', 'goal-weeks-12']);
  });

  it('earns the first-record and year milestones', () => {
    const ids = earned(
      computeMilestones({
        sessions: [workout('a', '2025-11-01', [])],
        streak: 0,
        longestStreak: 0,
        firstRecord: '2025-11-01',
        todayKey: TODAY,
      }),
    );

    expect(ids).toEqual(['first-workout', 'first-pr', 'year-active']);
  });
});

describe('body weight', () => {
  const entry = (dateKey: string, weightLbs: number): BodyWeightEntry => ({
    id: dateKey,
    dateKey,
    weightLbs,
    createdAt: new Date(0),
  });

  it('reads a typed weight, or refuses one that is not plausible', () => {
    expect(parseWeight('181.25')).toBe(181.3);
    expect(parseWeight('181,5')).toBe(181.5);
    expect(parseWeight('')).toBeNull();
    expect(parseWeight('-4')).toBeNull();
    expect(parseWeight('1200')).toBeNull();
  });

  it('compares the latest weigh-in with a month ago', () => {
    expect(weightSummary([entry('2026-10-01', 185), entry('2026-11-10', 181.5)], TODAY)).toEqual({
      current: 181.5,
      change: -3.5,
      trend: '−3.5 in 30 days',
    });
  });

  it('has no change to report without a weigh-in that old', () => {
    expect(weightSummary([entry('2026-11-01', 185)], TODAY)).toEqual({ current: 185, change: null, trend: '' });
    expect(weightSummary([], TODAY).current).toBeNull();
  });

  it('draws a line only with two or more weigh-ins', () => {
    expect(sparklinePoints([entry('2026-11-01', 185)], 100, 50)).toEqual([]);

    const points = sparklinePoints([entry('2026-11-01', 185), entry('2026-11-08', 180)], 100, 50);
    expect(points).toEqual([
      { x: 0, y: 4 },
      { x: 100, y: 46 },
    ]);
  });
});
