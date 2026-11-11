import {
  buildHomeConsistency,
  buildHomeRecent,
  buildHomeTemplates,
  buildHomeWeek,
  buildWeekGoal,
  isMissed,
  missedHeadline,
  pickInProgress,
  pickMissed,
  pickNextPlanned,
  pickSuggestedStart,
  plannedWhen,
  startCopy,
  weekNudge,
} from '@/lib/home-model';
import { bench, fly, line, log, session } from '@/lib/session/session-test-helpers';
import type { Activity } from '@/types/activity';
import type { DatedScheduledWorkout } from '@/types/planner';
import type { WorkoutPlan, WorkoutSession } from '@/types/workout';

// Wednesday. The week runs Sun Nov 8 – Sat Nov 14.
const TODAY = '2026-11-11';

function workout(id: string, workoutDate: string, overrides: Partial<WorkoutSession> = {}) {
  return session(id, [line(bench, [log({ weight: 135, reps: 8, done: true })])], {
    workoutDate,
    title: id,
    ...overrides,
  });
}

function plan(id: string, name: string, exercises = 5): WorkoutPlan {
  return {
    id,
    name,
    source: 'custom',
    createdAt: new Date(2026, 0, 1),
    updatedAt: new Date(2026, 0, 1),
    lines: Array.from({ length: exercises }, (_, i) => ({
      lineId: `${id}-${i}`,
      exerciseId: `e${i}`,
      nameSnapshot: `Exercise ${i}`,
      metric: 'weight_reps' as const,
      targetSets: 3,
      notes: null,
    })),
  };
}

function entry(
  id: string,
  dateKey: string,
  overrides: Partial<DatedScheduledWorkout> = {},
): DatedScheduledWorkout {
  return {
    id,
    dateKey,
    label: 'Leg day',
    planId: 'legs',
    exerciseIds: ['squat', 'leg-press'],
    status: 'planned',
    sessionId: null,
    createdAt: new Date(2026, 10, 1),
    sharedPlanId: null,
    groupId: null,
    ...overrides,
  };
}

function activity(id: string, activityDate: string, overrides: Partial<Activity> = {}): Activity {
  return {
    id,
    activityTypeId: 'walk',
    activityDate,
    activityTime: null,
    durationMin: 35,
    distanceMiles: null,
    locationName: null,
    notes: null,
    createdAt: new Date(2026, 10, 10),
    updatedAt: new Date(2026, 10, 10),
    ...overrides,
  };
}

describe('plannedWhen', () => {
  it('names a planned day relative to today', () => {
    expect(plannedWhen(TODAY, TODAY)).toBe('today');
    expect(plannedWhen('2026-11-12', TODAY)).toBe('tomorrow');
    expect(plannedWhen('2026-11-14', TODAY)).toBe('Sat');
    expect(plannedWhen('2026-11-19', TODAY)).toBe('Thu, Nov 19');
  });
});

describe('buildHomeTemplates', () => {
  const plans = [plan('push', 'Push day'), plan('pull', 'Pull day'), plan('legs', 'Leg day', 4)];

  it('orders templates by when they were last used, most recent first', () => {
    const sessions = [
      workout('a', '2026-11-09', { planId: 'push' }),
      workout('b', '2026-11-07', { planId: 'pull' }),
    ];

    expect(buildHomeTemplates(plans, sessions, TODAY).map((t) => t.name)).toEqual([
      'Push day',
      'Pull day',
      'Leg day',
    ]);
  });

  it('says how big each is and when it was last done', () => {
    const sessions = [
      workout('a', '2026-11-09', { planId: 'push' }),
      workout('b', '2026-10-28', { planId: 'pull' }),
    ];
    const meta = Object.fromEntries(
      buildHomeTemplates(plans, sessions, TODAY).map((t) => [t.name, t.meta]),
    );

    expect(meta).toEqual({
      'Push day': '5 exercises · last done Mon',
      'Pull day': '5 exercises · last done Oct 28',
      'Leg day': '4 exercises',
    });
  });

  it('ignores a workout still in progress when working out what was last done', () => {
    const sessions = [workout('a', TODAY, { planId: 'push', status: 'in_progress' })];

    expect(buildHomeTemplates([plan('push', 'Push day')], sessions, TODAY)[0].meta).toBe(
      '5 exercises',
    );
  });

  it('marks an empty template as not startable', () => {
    expect(buildHomeTemplates([plan('empty', 'Empty', 0)], [], TODAY)[0].canStart).toBe(false);
  });
});

describe('pickInProgress', () => {
  it('finds nothing when every workout is finished', () => {
    expect(pickInProgress([workout('a', TODAY)])).toBeNull();
  });

  it('describes how far along the open workout is', () => {
    const open = session(
      'open',
      [
        line(bench, [log({ weight: 135, reps: 8, done: true }), log({ weight: 135, reps: 8, done: true })]),
        line(fly, [log({ weight: 30, reps: 12, done: true }), log({ done: false })]),
      ],
      { status: 'in_progress', startedAt: new Date(2026, 10, 11, 18, 10) },
    );

    expect(pickInProgress([open])).toEqual({
      id: 'open',
      title: 'Push day',
      started: 'Started 6:10 PM',
      meta: 'Up next: Cable fly · 1 of 2 exercises · 3 sets done',
      segments: ['done', 'in_progress'],
    });
  });

  it('picks the most recently started when there are several', () => {
    const older = session('older', [], { status: 'in_progress', startedAt: new Date(2026, 10, 9) });
    const newer = session('newer', [], { status: 'in_progress', startedAt: new Date(2026, 10, 11) });

    expect(pickInProgress([older, newer])?.id).toBe('newer');
  });

  it('says so for an open workout with nothing in it yet', () => {
    expect(pickInProgress([session('open', [], { status: 'in_progress' })])?.meta).toBe(
      'No exercises yet',
    );
  });

  // A maybe nobody has started is not part of the workout yet.
  it('leaves untouched maybes out of the count', () => {
    const open = session(
      'open',
      [line(bench, [log({ weight: 135, reps: 8, done: true })]), { ...line(fly, [log()]), section: 'maybe' }],
      { status: 'in_progress' },
    );

    expect(pickInProgress([open])?.segments).toEqual(['done']);
  });
});

describe('pickNextPlanned', () => {
  it('picks the soonest open plan from today on', () => {
    const entries = [entry('later', '2026-11-14'), entry('soon', '2026-11-12'), entry('past', '2026-11-09')];

    expect(pickNextPlanned(entries, TODAY)?.entry.id).toBe('soon');
  });

  it('skips plans that are done or skipped', () => {
    expect(pickNextPlanned([entry('a', '2026-11-12', { status: 'skipped' })], TODAY)).toBeNull();
  });
});

describe('buildHomeWeek', () => {
  const week = buildHomeWeek(
    TODAY,
    [workout('a', '2026-11-09')],
    [activity('w', '2026-11-10')],
    [entry('e', '2026-11-12')],
  );
  const states = week.map((day) => day.state);

  it('covers Sunday to Saturday around today', () => {
    expect(week.map((day) => day.dateKey)).toEqual([
      '2026-11-08',
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
    ]);
    expect(week.map((day) => day.weekday).join('')).toBe('SMTWTFS');
  });

  it('shows what happened or is planned each day', () => {
    expect(states).toEqual(['empty', 'workout', 'activity', 'empty', 'planned', 'empty', 'empty']);
  });

  it('marks today and the days behind it', () => {
    expect(week.find((day) => day.isToday)?.dateKey).toBe(TODAY);
    expect(week.filter((day) => day.isPast)).toHaveLength(3);
  });

  it('describes each day for a screen reader', () => {
    expect(week.map((day) => day.label)).toEqual([
      'Sun, Nov 8: rest day',
      'Mon, Nov 9: workout logged',
      'Tue, Nov 10: activity logged',
      'Today, Wed, Nov 11: nothing planned',
      'Thu, Nov 12: Leg day planned',
      'Fri, Nov 13: nothing planned',
      'Sat, Nov 14: nothing planned',
    ]);
  });

  it('carries the planned entry only on a day that is still just planned', () => {
    expect(week[4].planned?.id).toBe('e');
    expect(week[1].planned).toBeNull();
  });

  // A logged workout on a planned day: the day is done, not planned.
  it('lets what was done outrank what was planned', () => {
    const done = buildHomeWeek(TODAY, [workout('a', '2026-11-12')], [], [entry('e', '2026-11-12')]);

    expect(done[4]).toMatchObject({ state: 'workout', planned: null });
  });
});

describe('buildHomeRecent', () => {
  it('mixes workouts and activities, newest first', () => {
    const recent = buildHomeRecent(
      [workout('Push day', '2026-11-09'), workout('Pull day', '2026-11-07')],
      [activity('w', '2026-11-10')],
    );

    expect(recent).toEqual([
      { id: 'w', kind: 'activity', title: 'Walk', meta: 'Tue, Nov 10 · 35 min · activity' },
      { id: 'Push day', kind: 'workout', title: 'Push day', meta: 'Mon, Nov 9 · 1 exercise · 1 set' },
      { id: 'Pull day', kind: 'workout', title: 'Pull day', meta: 'Sat, Nov 7 · 1 exercise · 1 set' },
    ]);
  });

  it('leaves out a workout still in progress', () => {
    expect(buildHomeRecent([workout('a', TODAY, { status: 'in_progress' })], [])).toEqual([]);
  });

  it('stops at the limit', () => {
    const many = Array.from({ length: 8 }, (_, i) => workout(`w${i}`, `2026-11-0${i + 1}`));

    expect(buildHomeRecent(many, [], 3)).toHaveLength(3);
  });

  it('names an activity whose type it does not know', () => {
    expect(buildHomeRecent([], [activity('k', TODAY, { activityTypeId: 'kayak' })])[0].title).toBe(
      'Activity',
    );
  });
});

describe('buildWeekGoal', () => {
  it('counts this week’s finished workouts against the goal', () => {
    const sessions = [
      workout('this', '2026-11-09'),
      workout('also-this', '2026-11-08'),
      workout('last-week', '2026-11-07'),
      workout('open', TODAY, { status: 'in_progress' }),
    ];

    expect(buildWeekGoal(sessions, 3, TODAY)).toEqual({ completed: 2, target: 3 });
  });
});

describe('pickSuggestedStart', () => {
  // Most recently used first, as `buildHomeTemplates` returns them.
  const templates = [
    { id: 'push', name: 'Push day', meta: '5 exercises · last done Mon', canStart: true },
    { id: 'legs', name: 'Leg day', meta: '4 exercises', canStart: true },
    { id: 'pull', name: 'Pull day', meta: '5 exercises · last done Sat', canStart: true },
  ];

  it('suggests today’s planned workout when there is one', () => {
    const planned = { entry: entry('e', TODAY), label: 'Leg day' };

    expect(pickSuggestedStart(planned, templates, TODAY)).toEqual({
      name: 'Leg day',
      meta: '4 exercises',
      templateId: 'legs',
      planned: planned.entry,
    });
  });

  // Tomorrow's plan is not a reason to start it today.
  it('otherwise suggests the template done longest ago, so the rotation keeps moving', () => {
    const tomorrow = { entry: entry('e', '2026-11-12'), label: 'Leg day' };

    expect(pickSuggestedStart(tomorrow, templates, TODAY)).toMatchObject({
      name: 'Pull day',
      templateId: 'pull',
      planned: null,
    });
  });

  it('skips a template with nothing in it', () => {
    const withEmpty = [...templates, { id: 'empty', name: 'Empty', meta: '0 exercises', canStart: false }];

    expect(pickSuggestedStart(null, withEmpty, TODAY)?.templateId).toBe('pull');
  });

  it('has nothing to suggest with no templates and no plan', () => {
    expect(pickSuggestedStart(null, [], TODAY)).toBeNull();
  });

  it('does not suggest a plain reminder with no exercises', () => {
    const reminder = { entry: entry('e', TODAY, { exerciseIds: [], planId: null }), label: 'Stretch' };

    expect(pickSuggestedStart(reminder, [], TODAY)).toBeNull();
  });
});

describe('startCopy', () => {
  it('mentions the next planned workout', () => {
    const planned = { entry: entry('e', '2026-11-12'), label: 'Leg day' };

    expect(startCopy(planned, true, TODAY).detail).toBe('Leg day is planned for tomorrow.');
  });

  it('points at the rotation when there are templates but no plan', () => {
    expect(startCopy(null, true, TODAY).detail).toBe('Next up in your rotation, or pick another.');
  });
});

describe('buildHomeConsistency', () => {
  const lastWeek = ['2026-11-02', '2026-11-04', '2026-11-06'].map((day) => workout(day, day));
  const consistency = buildHomeConsistency(
    TODAY,
    [...lastWeek, workout('mon', '2026-11-09')],
    [activity('w', '2026-11-10')],
    [entry('e', '2026-11-12')],
    3,
  );
  const thisWeek = consistency.weeks[consistency.weeks.length - 1];
  const previous = consistency.weeks[consistency.weeks.length - 2];

  it('covers sixteen weeks, oldest first, ending with this one', () => {
    expect(consistency.weeks).toHaveLength(16);
    expect(thisWeek.startKey).toBe('2026-11-08');
    expect(consistency.weeks[0].startKey).toBe('2026-07-26');
  });

  it('colours each day by what happened or lies ahead', () => {
    expect(thisWeek.days).toEqual(['rest', 'workout', 'activity', 'today', 'planned', 'ahead', 'ahead']);
  });

  it('marks finished weeks hit or missed, and this week open until it is hit', () => {
    expect(previous.goal).toBe('hit');
    expect(thisWeek.goal).toBe('open');
    expect(consistency.weeks[0].goal).toBe('missed');
  });

  it('reports the streak, and sums the chart up for a screen reader', () => {
    expect(consistency).toMatchObject({ streak: 1, longest: 1 });
    expect(consistency.label).toBe(
      'Last 16 weeks: goal hit in 1 of 15 finished weeks. Current streak 1 week, longest 1 week.',
    );
  });

  it('lists what was logged on a day, for tapping its square', () => {
    expect(consistency.dayItems['2026-11-10']).toEqual([
      { id: 'w', kind: 'activity', title: 'Walk', meta: '35 min' },
    ]);
    expect(consistency.dayItems['2026-11-08']).toBeUndefined();
  });
});

describe('weekNudge', () => {
  it('celebrates a goal that is met', () => {
    expect(weekNudge({ completed: 3, target: 3 }, 4, TODAY)).toBe("Goal met. That's 4 weeks in a row.");
    expect(weekNudge({ completed: 3, target: 3 }, 1, TODAY)).toBe(
      'Goal met this week. Anything extra is a bonus.',
    );
  });

  it('says what keeps the streak going', () => {
    expect(weekNudge({ completed: 1, target: 3 }, 4, TODAY)).toBe(
      'Two more by Saturday makes it 5 weeks in a row.',
    );
  });

  it('points at the goal when there is no streak yet', () => {
    expect(weekNudge({ completed: 2, target: 3 }, 0, TODAY)).toBe(
      'One more by Saturday hits your weekly goal.',
    );
  });

  it('says "today" on the last day of the week', () => {
    expect(weekNudge({ completed: 2, target: 3 }, 0, '2026-11-14')).toBe(
      'One more today hits your weekly goal.',
    );
  });

  // Never "you've lost it": when the goal is out of reach, it just stops counting down.
  it('stays kind when the goal is out of reach', () => {
    expect(weekNudge({ completed: 0, target: 5 }, 3, '2026-11-13')).toBe(
      'Every workout this week still counts.',
    );
  });
});

describe('missed plans', () => {
  const none = new Set<string>();

  it('is a plan whose day passed with no workout logged', () => {
    expect(isMissed(entry('e', '2026-11-10'), TODAY, none)).toBe(true);
  });

  // Showing up is what matters: any workout that day counts as doing it.
  it('is not missed when any workout was logged that day', () => {
    expect(isMissed(entry('e', '2026-11-10'), TODAY, new Set(['2026-11-10']))).toBe(false);
  });

  it('is not missed while its day has not passed', () => {
    expect(isMissed(entry('e', TODAY), TODAY, none)).toBe(false);
  });

  it('is never a skipped plan or a plain reminder', () => {
    expect(isMissed(entry('e', '2026-11-10', { status: 'skipped' }), TODAY, none)).toBe(false);
    expect(isMissed(entry('e', '2026-11-10', { exerciseIds: [] }), TODAY, none)).toBe(false);
  });

  it('picks the most recent one for the catch-up card', () => {
    const entries = [entry('older', '2026-11-08'), entry('newer', '2026-11-10'), entry('ahead', '2026-11-12')];

    expect(pickMissed(entries, [], TODAY)?.id).toBe('newer');
    expect(pickMissed(entries, [workout('a', '2026-11-10')], TODAY)?.id).toBe('older');
    expect(pickMissed([entry('ahead', '2026-11-12')], [], TODAY)).toBeNull();
  });

  it('says when it slid past', () => {
    expect(missedHeadline(entry('e', '2026-11-10'), TODAY)).toBe('Leg day slid past yesterday');
    expect(missedHeadline(entry('e', '2026-11-09'), TODAY)).toBe('Leg day slid past on Mon');
  });
});
