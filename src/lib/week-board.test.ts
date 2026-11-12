import {
  buildWeekBoard,
  movesForDrop,
  pushBackPlan,
  targetFor,
  toBoardCard,
  whenLabel,
} from '@/lib/week-board';
import { bench, line, log, session } from '@/lib/session/session-test-helpers';
import type { DatedScheduledWorkout, ScheduledWorkout } from '@/types/planner';

// Wednesday. The week runs Sun Nov 8 – Sat Nov 14.
const TODAY = '2026-11-11';

function entry(id: string, dateKey: string | null, overrides: Partial<ScheduledWorkout> = {}) {
  return {
    id,
    dateKey,
    label: id,
    planId: null,
    exerciseIds: ['squat', 'bench'],
    status: 'planned' as const,
    sessionId: null,
    createdAt: new Date(2026, 10, 1),
    sharedPlanId: null,
    groupId: null,
    ...overrides,
  };
}

const dated = (id: string, dateKey: string, overrides: Partial<ScheduledWorkout> = {}) =>
  entry(id, dateKey, overrides) as DatedScheduledWorkout;

const done = (day: string) =>
  session(`w-${day}`, [line(bench, [log({ weight: 135, reps: 8, done: true })])], {
    workoutDate: day,
    title: 'Push day',
  });

describe('toBoardCard', () => {
  it('describes a workout by its size', () => {
    expect(toBoardCard(dated('Leg day', '2026-11-12'), TODAY)).toMatchObject({
      title: 'Leg day',
      meta: '2 exercises',
      slid: false,
    });
  });

  it('calls an entry without exercises a reminder, or an idea when it has no day', () => {
    expect(toBoardCard(dated('Stretch', '2026-11-12', { exerciseIds: [] }), TODAY).meta).toBe('Reminder');
    expect(toBoardCard(entry('Mobility', null, { exerciseIds: [] }), TODAY).meta).toBe('Idea');
  });

  it('marks a card whose day has passed', () => {
    expect(toBoardCard(dated('Leg day', '2026-11-10'), TODAY)).toMatchObject({
      meta: 'Slid past · 2 exercises',
      slid: true,
    });
  });
});

describe('buildWeekBoard', () => {
  const board = buildWeekBoard({
    weekStartKey: TODAY,
    todayKey: TODAY,
    scheduled: [
      dated('missed', '2026-11-09'),
      dated('done-anyway', '2026-11-10'),
      dated('thu', '2026-11-12'),
      dated('skipped', '2026-11-13', { status: 'skipped' }),
    ],
    sessions: [done('2026-11-10')],
    activities: [],
    weeklyGoal: 3,
  });
  const cardsOn = (index: number) => board.days[index].cards.map((card) => card.id);

  it('covers Sunday to Saturday with a short title', () => {
    expect(board.days.map((day) => day.dow).join(' ')).toBe('SUN MON TUE WED THU FRI SAT');
    expect(board.title).toBe('Nov 8 – 14');
  });

  // Showing up is what matters: a workout that day means the plan was kept.
  it('keeps real misses on past days and drops plans that were kept', () => {
    expect(cardsOn(1)).toEqual(['missed']);
    expect(cardsOn(2)).toEqual([]);
  });

  it('shows what was logged on each day', () => {
    expect(board.days[2].done).toEqual([{ id: 'w-2026-11-10', kind: 'workout', title: 'Push day' }]);
  });

  it('leaves skipped plans off the board', () => {
    expect(cardsOn(5)).toEqual([]);
  });

  it('sums the week up', () => {
    expect(board.subtitle).toBe('1 done · 1 planned · goal 3');
  });

  it('titles a week that crosses a month end', () => {
    expect(
      buildWeekBoard({
        weekStartKey: '2026-09-30',
        todayKey: TODAY,
        scheduled: [],
        sessions: [],
        activities: [],
        weeklyGoal: 3,
      }).title,
    ).toBe('Sep 27 – Oct 3');
  });
});

describe('dropping a picked-up card on a day', () => {
  const board = buildWeekBoard({
    weekStartKey: TODAY,
    todayKey: TODAY,
    scheduled: [dated('thu', '2026-11-12'), dated('sat', '2026-11-14'), dated('missed', '2026-11-10')],
    sessions: [],
    activities: [],
    weeklyGoal: 3,
  });
  const day = (index: number) => board.days[index];
  const card = (id: string) =>
    board.days.flatMap((d) => d.cards).find((c) => c.id === id) ?? toBoardCard(entry(id, null), TODAY);

  it('moves to an empty day', () => {
    expect(targetFor(day(5), card('thu'), TODAY)).toBe('Move');
    expect(movesForDrop(day(5), card('thu'), TODAY)).toEqual([{ id: 'thu', dateKey: '2026-11-13' }]);
  });

  it('swaps with what is already planned that day', () => {
    expect(targetFor(day(6), card('thu'), TODAY)).toBe('Swap');
    expect(movesForDrop(day(6), card('thu'), TODAY)).toEqual([
      { id: 'thu', dateKey: '2026-11-14' },
      { id: 'sat', dateKey: '2026-11-12' },
    ]);
  });

  // Swapping would push the other plan into the past or the tray.
  it('joins the day instead of swapping for a missed or unscheduled card', () => {
    expect(targetFor(day(4), card('missed'), TODAY)).toBe('Add');
    expect(targetFor(day(4), card('idea'), TODAY)).toBe('Add');
    expect(movesForDrop(day(4), card('missed'), TODAY)).toEqual([{ id: 'missed', dateKey: '2026-11-12' }]);
  });

  it('cannot go to a past day or the day it is already on', () => {
    expect(targetFor(day(1), card('thu'), TODAY)).toBeNull();
    expect(targetFor(day(4), card('thu'), TODAY)).toBeNull();
    expect(movesForDrop(day(1), card('thu'), TODAY)).toEqual([]);
  });
});

describe('pushBackPlan', () => {
  const open = [dated('tue', '2026-11-10'), dated('thu', '2026-11-12'), dated('sat', '2026-11-14')];

  it('slides a card and the rest of its week later by a day', () => {
    const plan = pushBackPlan(toBoardCard(open[1], TODAY), open, TODAY);

    expect(plan).toEqual({
      moves: [
        { id: 'thu', dateKey: '2026-11-13' },
        { id: 'sat', dateKey: '2026-11-15' },
      ],
      summary: 'thu → Fri, sat → Sun',
    });
  });

  // A missed card lands on today; the rest keep their spacing.
  it('brings a missed card to today and shifts the rest by the same amount', () => {
    const plan = pushBackPlan(toBoardCard(open[0], TODAY), open, TODAY);

    expect(plan?.moves).toEqual([
      { id: 'tue', dateKey: '2026-11-11' },
      { id: 'thu', dateKey: '2026-11-13' },
      { id: 'sat', dateKey: '2026-11-15' },
    ]);
    expect(plan?.summary.startsWith('tue → today')).toBe(true);
  });

  it('has nothing to push for an unscheduled card', () => {
    expect(pushBackPlan(toBoardCard(entry('idea', null), TODAY), open, TODAY)).toBeNull();
  });
});

describe('whenLabel', () => {
  it('says when a card is planned for', () => {
    expect(whenLabel(toBoardCard(dated('a', TODAY), TODAY), TODAY)).toBe('Planned for today');
    expect(whenLabel(toBoardCard(dated('a', '2026-11-12'), TODAY), TODAY)).toBe('Planned for Thu, Nov 12');
    expect(whenLabel(toBoardCard(dated('a', '2026-11-10'), TODAY), TODAY)).toBe('Slid past Tue, Nov 10');
    expect(whenLabel(toBoardCard(entry('a', null), TODAY), TODAY)).toBe('Unscheduled');
  });
});
