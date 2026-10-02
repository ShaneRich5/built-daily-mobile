import {
  blankSession,
  defaultSessionTitle,
  localWorkoutDate,
  localWorkoutTime,
  newSessionLine,
  sessionFromPlan,
} from '@/lib/session-start';
import type { PlanLine, WorkoutPlan } from '@/types/workout';

/** Deterministic ids, so a session built from a plan can be asserted on. */
function idFactory() {
  let next = 0;
  return () => `line-${++next}`;
}

function planLine(overrides: Partial<PlanLine> = {}): PlanLine {
  return {
    lineId: 'plan-line',
    exerciseId: 'bench',
    nameSnapshot: 'Bench press',
    metric: 'weight_reps',
    targetSets: 3,
    notes: null,
    ...overrides,
  };
}

function plan(overrides: Partial<WorkoutPlan> = {}): WorkoutPlan {
  return {
    id: 'plan-1',
    name: 'Push day',
    source: 'custom',
    createdAt: new Date(2026, 0, 1),
    updatedAt: new Date(2026, 0, 1),
    lines: [planLine()],
    ...overrides,
  };
}

// Mid-month, mid-morning, so a UTC slip would show up as the wrong day.
const NOW = new Date(2026, 8, 14, 9, 5);

describe('localWorkoutDate', () => {
  it('reads the local calendar day, zero-padded', () => {
    expect(localWorkoutDate(NOW)).toBe('2026-09-14');
  });

  it('stays on the local day late at night, where UTC would roll over', () => {
    expect(localWorkoutDate(new Date(2026, 8, 14, 23, 30))).toBe('2026-09-14');
  });
});

describe('localWorkoutTime', () => {
  it('reads a 24-hour clock, zero-padded', () => {
    expect(localWorkoutTime(NOW)).toBe('09:05');
    expect(localWorkoutTime(new Date(2026, 8, 14, 18, 30))).toBe('18:30');
  });
});

describe('defaultSessionTitle', () => {
  it('names an untitled workout after the day', () => {
    expect(defaultSessionTitle(NOW)).toBe('Workout on 2026-09-14');
  });
});

describe('blankSession', () => {
  it('starts in progress, with no end', () => {
    const session = blankSession(NOW);

    expect(session.status).toBe('in_progress');
    expect(session.endedAt).toBeNull();
    expect(session.startedAt).toBe(NOW);
  });

  it('is dated and timed in the lifter’s own timezone', () => {
    const session = blankSession(NOW);

    expect(session.workoutDate).toBe('2026-09-14');
    expect(session.workoutTime).toBe('09:05');
  });

  it('opens empty, with counters already written', () => {
    const session = blankSession(NOW);

    expect(session.lines).toEqual([]);
    expect(session.exerciseCount).toBe(0);
    expect(session.setCount).toBe(0);
    expect(session.previewExerciseNames).toEqual([]);
  });

  it('takes a title when one is given', () => {
    expect(blankSession(NOW, '  Leg day  ').title).toBe('Leg day');
  });

  it('falls back to the default title for a blank one', () => {
    expect(blankSession(NOW, '   ').title).toBe('Workout on 2026-09-14');
  });
});

describe('sessionFromPlan', () => {
  it('copies the plan’s exercises and records where they came from', () => {
    const session = sessionFromPlan(plan(), NOW, idFactory());

    expect(session.planId).toBe('plan-1');
    expect(session.title).toBe('Push day');
    expect(session.lines).toHaveLength(1);
    expect(session.lines[0]).toMatchObject({
      lineId: 'line-1',
      exerciseId: 'bench',
      nameSnapshot: 'Bench press',
      metric: 'weight_reps',
    });
  });

  it('opens as many empty sets as the plan asks for', () => {
    const session = sessionFromPlan(plan({ lines: [planLine({ targetSets: 4 })] }), NOW, idFactory());

    expect(session.lines[0].sets).toHaveLength(4);
    expect(session.lines[0].sets[0].weight).toBeNull();
    expect(session.setCount).toBe(4);
  });

  it('opens with one set when the plan does not say', () => {
    const session = sessionFromPlan(plan({ lines: [planLine({ targetSets: null })] }), NOW, idFactory());

    expect(session.lines[0].sets).toHaveLength(1);
  });

  // A plan is user data; an absurd target should not build an unusable session.
  it('ignores a target nobody could perform', () => {
    const session = sessionFromPlan(plan({ lines: [planLine({ targetSets: 500 })] }), NOW, idFactory());

    expect(session.lines[0].sets).toHaveLength(1);
  });

  it('carries the plan’s notes across onto the new line ids', () => {
    const session = sessionFromPlan(
      plan({ lines: [planLine({ notes: 'warm up first' })] }),
      NOW,
      idFactory(),
    );

    expect(session.exerciseNotesByLineId).toEqual({ 'line-1': 'warm up first' });
  });

  it('leaves the notes unset when the plan has none', () => {
    expect(sessionFromPlan(plan(), NOW, idFactory()).exerciseNotesByLineId).toBeNull();
  });

  // Line ids are regenerated so two workouts from one plan never share them.
  it('gives every line a fresh id', () => {
    const session = sessionFromPlan(
      plan({ lines: [planLine(), planLine(), planLine()] }),
      NOW,
      idFactory(),
    );

    expect(session.lines.map((line) => line.lineId)).toEqual(['line-1', 'line-2', 'line-3']);
  });

  it('stops at the line cap a session document allows', () => {
    const lines = Array.from({ length: 45 }, () => planLine());
    const session = sessionFromPlan(plan({ lines }), NOW, idFactory());

    expect(session.lines).toHaveLength(40);
    expect(session.exerciseCount).toBe(40);
  });

  it('names an unnamed plan after the day', () => {
    expect(sessionFromPlan(plan({ name: '' }), NOW, idFactory()).title).toBe(
      'Workout on 2026-09-14',
    );
  });
});

describe('newSessionLine', () => {
  it('opens a picked exercise with one empty set', () => {
    const line = newSessionLine({ id: 'plank', name: 'Plank', metric: 'duration' }, 'line-9');

    expect(line).toMatchObject({
      lineId: 'line-9',
      exerciseId: 'plank',
      nameSnapshot: 'Plank',
      metric: 'duration',
    });
    expect(line.sets).toHaveLength(1);
    expect(line.sets[0].durationSec).toBeNull();
  });

  it('gives each line its own set objects', () => {
    const first = newSessionLine({ id: 'bench', name: 'Bench', metric: 'weight_reps' }, 'a');
    const second = newSessionLine({ id: 'bench', name: 'Bench', metric: 'weight_reps' }, 'b');

    first.sets[0].weight = 100;

    expect(second.sets[0].weight).toBeNull();
  });
});
