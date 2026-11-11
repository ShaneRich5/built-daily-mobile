import { EXERCISE_CATALOG } from '@/lib/exercise-catalog';
import {
  clampTargetSets,
  lineFromExercise,
  lineMeta,
  moveLine,
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

describe('moveLine', () => {
  const lines = [line('a'), line('b'), line('c')];

  it('swaps a line with its neighbour', () => {
    expect(moveLine(lines, 1, -1).map((l) => l.lineId)).toEqual(['b', 'a', 'c']);
    expect(moveLine(lines, 1, 1).map((l) => l.lineId)).toEqual(['a', 'c', 'b']);
  });

  it('does nothing off either end', () => {
    expect(moveLine(lines, 0, -1).map((l) => l.lineId)).toEqual(['a', 'b', 'c']);
    expect(moveLine(lines, 2, 1).map((l) => l.lineId)).toEqual(['a', 'b', 'c']);
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
    expect(templateToSave('Push', [line('a', { notes: ' ' })], null, now).lines[0].notes).toBeNull();
  });
});

describe('templateProblem', () => {
  it('needs a name and at least one exercise', () => {
    expect(templateProblem(' ', [line('a')])).toBe('Give the template a name.');
    expect(templateProblem('Push', [])).toBe('Add at least one exercise.');
    expect(templateProblem('Push', [line('a')])).toBeNull();
  });
});
