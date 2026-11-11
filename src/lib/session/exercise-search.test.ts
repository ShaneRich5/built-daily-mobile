import { EXERCISE_CATALOG, exerciseGroup } from '@/lib/exercise-catalog';
import {
  canAddCustomExercise,
  exerciseFilters,
  exerciseMeta,
  exerciseSearchResults,
  initialExerciseFilter,
  similarExercises,
} from '@/lib/session/exercise-search';

const chest = EXERCISE_CATALOG.filter((exercise) => exerciseGroup(exercise) === 'chest');
const legs = EXERCISE_CATALOG.filter((exercise) => exerciseGroup(exercise) === 'legs');
const cardio = EXERCISE_CATALOG.filter((exercise) => exerciseGroup(exercise) === 'cardio');

const suggested = [chest[0], legs[0]];
const recent = [legs[1]];

describe('exerciseFilters', () => {
  it('offers suggested and recent only when there is something behind them', () => {
    expect(exerciseFilters(suggested, recent).map((f) => f.label).slice(0, 3)).toEqual([
      'Suggested',
      'Recent',
      'All',
    ]);
    expect(exerciseFilters([], []).map((f) => f.label)[0]).toBe('All');
  });

  it('offers the muscle groups after All', () => {
    expect(exerciseFilters([], []).map((f) => f.label)).toEqual([
      'All',
      'Chest',
      'Back',
      'Shoulders',
      'Arms',
      'Legs',
      'Core',
      'Cardio',
    ]);
  });
});

describe('initialExerciseFilter', () => {
  it('opens on the most useful list there is', () => {
    expect(initialExerciseFilter(suggested, recent)).toBe('suggested');
    expect(initialExerciseFilter([], recent)).toBe('recent');
    expect(initialExerciseFilter([], [])).toBe('all');
  });
});

describe('exerciseSearchResults', () => {
  const results = (query: string, filter: Parameters<typeof exerciseSearchResults>[0]['filter']) =>
    exerciseSearchResults({ query, filter, suggested, recent });

  it('lists the suggestions, the recents or the whole catalog', () => {
    expect(results('', 'suggested')).toEqual(suggested);
    expect(results('', 'recent')).toEqual(recent);
    expect(results('', 'all')).toHaveLength(EXERCISE_CATALOG.length);
  });

  it('narrows to a muscle group', () => {
    expect(results('', 'legs')).toEqual(legs);
  });

  // Typing on the Suggested tab still searches everything.
  it('searches the whole catalog once something is typed', () => {
    const found = results(legs[2].name, 'suggested');

    expect(found.map((exercise) => exercise.id)).toContain(legs[2].id);
  });

  it('keeps a muscle-group chip applied while searching', () => {
    expect(results(chest[0].name, 'legs').every((exercise) => exerciseGroup(exercise) === 'legs')).toBe(
      true,
    );
  });

  it('finds nothing for a name the catalog does not have', () => {
    expect(results('zzzz not an exercise', 'all')).toEqual([]);
  });
});

describe('exerciseMeta', () => {
  it('names the muscle group and how the exercise is logged', () => {
    expect(exerciseMeta(chest[0])).toMatch(/^Chest · /);
  });

  it('leaves the group off for cardio and for moves it cannot place', () => {
    expect(exerciseMeta(cardio[0])).toBe('Cardio');
    expect(exerciseMeta({ id: 'custom-1', name: 'Mystery move', metric: 'weight_reps' })).toBe(
      'Weight × reps',
    );
  });
});

describe('canAddCustomExercise', () => {
  it('needs a name', () => {
    expect(canAddCustomExercise('   ')).toBe(false);
  });

  it('refuses a name the catalog already has, whatever the case', () => {
    expect(canAddCustomExercise(chest[0].name.toUpperCase())).toBe(false);
  });

  it('allows a name the catalog does not have', () => {
    expect(canAddCustomExercise('Landmine twist')).toBe(true);
  });
});

describe('similarExercises', () => {
  it('offers others from the same muscle group', () => {
    const similar = similarExercises(chest[0], []);

    expect(similar.length).toBeGreaterThan(0);
    expect(similar.every((exercise) => exerciseGroup(exercise) === 'chest')).toBe(true);
  });

  it('never offers the exercise itself or one already saved as an alternate', () => {
    const ids = similarExercises(chest[0], [chest[1]]).map((exercise) => exercise.id);

    expect(ids).not.toContain(chest[0].id);
    expect(ids).not.toContain(chest[1].id);
  });

  it('stops at the limit', () => {
    expect(similarExercises(legs[0], [], 2)).toHaveLength(2);
  });

  it('has nothing to offer for a move it cannot place', () => {
    expect(similarExercises({ id: 'custom-1', name: 'Mystery move', metric: 'weight_reps' }, [])).toEqual(
      [],
    );
  });
});
