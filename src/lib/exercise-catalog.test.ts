import {
  catalogSections,
  EXERCISE_CATALOG,
  exerciseGroup,
  findCatalogExercise,
  isCustomExerciseId,
  searchCatalog,
} from '@/lib/exercise-catalog';
import { resolveExerciseMuscles } from '@/lib/muscle-map';

describe('EXERCISE_CATALOG', () => {
  it('has no duplicate ids', () => {
    const ids = EXERCISE_CATALOG.map((exercise) => exercise.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('never ships a catalog id in the `custom-` namespace', () => {
    expect(EXERCISE_CATALOG.filter((exercise) => isCustomExerciseId(exercise.id))).toEqual([]);
  });

  // The two tables are keyed by the same ids and are meant to stay in step; a
  // typo in either one shows up here rather than as an exercise that silently
  // browses under "Other" and shades nothing on the body chart.
  it('tags every non-cardio exercise in the muscle table', () => {
    const untagged = EXERCISE_CATALOG.filter(
      (exercise) =>
        exercise.metric !== 'cardio' && resolveExerciseMuscles(exercise.id, '') === null,
    );

    expect(untagged.map((exercise) => exercise.id)).toEqual([]);
  });
});

describe('exerciseGroup', () => {
  it.each([
    ['bench', 'chest'],
    ['lat-pulldown', 'back'],
    ['barbell-shrug', 'back'],
    ['db-lateral-raise', 'shoulders'],
    ['skull-crusher', 'arms'],
    ['leg-press', 'legs'],
    ['seated-calf-raise', 'legs'],
    ['plank', 'core'],
  ])('puts %s under %s', (id, group) => {
    const exercise = findCatalogExercise(id);
    expect(exercise && exerciseGroup(exercise)).toBe(group);
  });

  // Cardio machines carry no primary muscle on purpose, so the metric is what
  // keeps them out of "other".
  it('groups cardio machines by their metric, not their muscles', () => {
    const treadmill = findCatalogExercise('treadmill');
    expect(treadmill && exerciseGroup(treadmill)).toBe('cardio');
  });
});

describe('searchCatalog', () => {
  it('returns the whole catalog for a blank query', () => {
    expect(searchCatalog('   ')).toHaveLength(EXERCISE_CATALOG.length);
  });

  it('leads with an exact hit over a name that merely starts with the query', () => {
    expect(searchCatalog('row')[0].id).toBe('row');
  });

  it('leads with the name that starts with the query when nothing matches exactly', () => {
    expect(searchCatalog('incline')[0].id).toBe('incline-bench');
  });

  it('matches a word in the middle of a name', () => {
    expect(searchCatalog('pulldown').map((e) => e.id)).toContain('close-grip-lat-pulldown');
  });

  it('finds gym shorthand that only appears in the id', () => {
    expect(searchCatalog('rdl')[0].id).toBe('rdl');
    expect(searchCatalog('ohp')[0].id).toBe('ohp');
    expect(searchCatalog('db').map((e) => e.id)).toContain('db-bench');
  });

  it('ignores case and surrounding space', () => {
    expect(searchCatalog('  BENCH Press ')).toEqual(searchCatalog('bench press'));
  });

  it('returns nothing for a move the catalog does not have', () => {
    expect(searchCatalog('sauna sit')).toEqual([]);
  });
});

describe('catalogSections', () => {
  it('orders groups with cardio last', () => {
    const titles = catalogSections(EXERCISE_CATALOG).map((section) => section.group);
    expect(titles[0]).toBe('chest');
    expect(titles[titles.length - 1]).toBe('cardio');
  });

  it('skips groups nothing matched', () => {
    const sections = catalogSections(searchCatalog('calf'));
    expect(sections.map((section) => section.group)).toEqual(['legs']);
  });

  it('keeps every exercise it was given', () => {
    const total = catalogSections(EXERCISE_CATALOG).reduce(
      (count, section) => count + section.exercises.length,
      0,
    );
    expect(total).toBe(EXERCISE_CATALOG.length);
  });
});
