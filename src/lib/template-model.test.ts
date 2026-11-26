import { EXERCISE_CATALOG } from '@/lib/exercise-catalog';
import {
  addAlternate,
  canAddAlternate,
  clampTargetSets,
  lineFromExercise,
  lineMeta,
  moveLineInSection,
  orderBySection,
  removeAlternate,
  setLineSection,
  targetSetsOf,
  templateProblem,
  templateToSave,
} from '@/lib/template-model';
import type { PlanLine, WorkoutPlan } from '@/types/workout';

const ids = () => {
  let n = 0;
  return () => `line-${++n}`;
};

const line = (lineId: string, overrides: Partial<PlanLine> = {}): PlanLine => ({
  lineId,
  exerciseId: 'bench',
  nameSnapshot: 'Bench press',
  metric: 'weight_reps',
  targetSets: 3,
  notes: null,
  ...overrides,
});

describe('lineFromExercise', () => {
  it('starts an exercise at three sets', () => {
    const exercise = EXERCISE_CATALOG[0];

    expect(lineFromExercise(exercise, ids())).toEqual({
      lineId: 'line-1',
      exerciseId: exercise.id,
      nameSnapshot: exercise.name,
      metric: exercise.metric,
      targetSets: 3,
      notes: null,
    });
  });
});

describe('target sets', () => {
  it('keeps a target between 1 and 20', () => {
    expect(clampTargetSets(0)).toBe(1);
    expect(clampTargetSets(25)).toBe(20);
    expect(clampTargetSets(4.4)).toBe(4);
  });

  it('reads a line that never set one as the default', () => {
    expect(targetSetsOf(line('a', { targetSets: null }))).toBe(3);
    expect(targetSetsOf(line('a', { targetSets: 5 }))).toBe(5);
  });
});

describe('lineMeta', () => {
  it('says how the exercise is logged, and whether it has a note', () => {
    expect(lineMeta(line('a'))).toBe('Weight × reps');
    expect(lineMeta(line('a', { notes: 'Pause at the chest' }))).toBe('Weight × reps · note');
  });
});

describe('templateToSave', () => {
  const now = new Date('2026-11-11T12:00:00Z');
  const initial: WorkoutPlan = {
    id: 'p1',
    name: 'Push',
    source: 'starter_copy',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    lines: [],
    restPreferences: { autoRestTimer: false, defaultRestSec: 60 },
  };

  it('keeps when the template was created and stamps when it was saved', () => {
    expect(templateToSave(' Push day ', [line('a')], initial, now)).toMatchObject({
      name: 'Push day',
      createdAt: initial.createdAt,
      updatedAt: now,
    });
  });

  // A starter copy is the lifter's own once they have edited it.
  it('saves as the lifter’s own template', () => {
    expect(templateToSave('Push', [line('a')], initial, now).source).toBe('custom');
  });

  it('keeps rest preferences it had, and adds none to a new template', () => {
    expect(templateToSave('Push', [line('a')], initial, now).restPreferences).toEqual(
      initial.restPreferences,
    );
    expect('restPreferences' in templateToSave('Push', [line('a')], null, now)).toBe(false);
  });

  it('creates a new template now', () => {
    expect(templateToSave('Push', [line('a')], null, now).createdAt).toBe(now);
  });

  it('stores a blank note as null', () => {
    expect(
      templateToSave('Push', [line('a', { notes: ' ' })], null, now).lines[0].notes,
    ).toBeNull();
  });
});

describe('templateProblem', () => {
  it('needs a name and at least one exercise', () => {
    expect(templateProblem(' ', [line('a')])).toBe('Give the template a name.');
    expect(templateProblem('Push', [])).toBe('Add at least one exercise.');
    expect(templateProblem('Push', [line('a')])).toBeNull();
  });
});

describe('Plan and Maybe sections', () => {
  const plan = [line('a'), line('m', { section: 'maybe' }), line('b')];
  const ids = (lines: PlanLine[]) => lines.map((l) => l.lineId);

  it('starts a line in Maybe when asked', () => {
    expect(lineFromExercise(EXERCISE_CATALOG[0], () => 'x', 'maybe').section).toBe('maybe');
    expect('section' in lineFromExercise(EXERCISE_CATALOG[0], () => 'x')).toBe(false);
  });

  it('lists plan lines first, then maybes, each in order', () => {
    expect(ids(orderBySection(plan))).toEqual(['a', 'b', 'm']);
  });

  it('moves a line to the end of the other section, with no section field on a plan line', () => {
    const toMaybe = setLineSection(plan, 'a', 'maybe');
    expect(ids(toMaybe)).toEqual(['b', 'm', 'a']);
    const back = setLineSection(toMaybe, 'm', 'plan');
    expect(ids(back)).toEqual(['b', 'm', 'a']);
    expect('section' in back[1]).toBe(false);
  });

  it('reorders within a section only', () => {
    expect(ids(moveLineInSection(plan, 'b', -1))).toEqual(['b', 'a', 'm']);
    expect(ids(moveLineInSection(plan, 'b', 1))).toEqual(['a', 'b', 'm']);
    expect(ids(moveLineInSection(plan, 'm', -1))).toEqual(['a', 'b', 'm']);
  });

  it('saves maybes after the plan', () => {
    const saved = templateToSave('Push', plan, null, new Date(2026, 0, 1));
    expect(ids(saved.lines)).toEqual(['a', 'b', 'm']);
  });
});

describe('alternates', () => {
  const [, other, third] = EXERCISE_CATALOG;

  it('adds an alternate once, never the exercise itself', () => {
    const base = line('a', { exerciseId: EXERCISE_CATALOG[0].id });
    const withOne = addAlternate(base, other);
    expect(withOne.alternates).toEqual([
      { exerciseId: other.id, nameSnapshot: other.name, metric: other.metric },
    ]);
    expect(addAlternate(withOne, other)).toBe(withOne);
    expect(canAddAlternate(base, EXERCISE_CATALOG[0])).toBe(false);
    expect(lineMeta(addAlternate(withOne, third))).toBe('Weight × reps · 2 alternates');
  });

  it('drops the field once the last alternate is removed', () => {
    const withOne = addAlternate(line('a'), other);
    expect('alternates' in removeAlternate(withOne, other.id)).toBe(false);
  });
});
