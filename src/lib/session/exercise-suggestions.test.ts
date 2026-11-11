import {
  recentExercises,
  suggestedForSearch,
  suggestNextExercises,
} from '@/lib/session/exercise-suggestions';
import { bench, dips, fly, line, plank, session } from '@/lib/session/session-test-helpers';

const names = (exercises: { name: string }[]) => exercises.map((exercise) => exercise.name);

// Most recent first, as the callers pass them.
const pushA = session('a', [line(bench, []), line(fly, []), line(dips, [])]);
const pushB = session('b', [line(bench, []), line(fly, [])]);
const core = session('c', [line(plank, [])]);

describe('recentExercises', () => {
  it('lists exercises from recent workouts, newest first, without repeats', () => {
    expect(names(recentExercises([pushA, pushB, core]))).toEqual(['Bench', 'Cable fly', 'Dips', 'Plank']);
  });

  it('stops at the limit', () => {
    expect(recentExercises([pushA, pushB, core], 2)).toHaveLength(2);
  });
});

describe('suggestNextExercises', () => {
  // The strongest signal: what followed your latest exercise last time.
  it('puts what usually follows the latest exercise first', () => {
    expect(names(suggestNextExercises([pushA, pushB, core], [bench]))).toEqual(['Cable fly', 'Dips']);
  });

  it('never suggests something already in the workout', () => {
    expect(names(suggestNextExercises([pushA, pushB], [bench, fly]))).toEqual(['Dips']);
  });

  it('ignores workouts that share nothing with today', () => {
    expect(names(suggestNextExercises([core], [bench]))).toEqual([]);
  });

  it('suggests what you usually open with when the workout is empty', () => {
    expect(names(suggestNextExercises([pushA, pushB, core], []))).toEqual(['Bench', 'Plank']);
  });

  it('stops at the limit', () => {
    expect(suggestNextExercises([pushA, pushB, core], [bench], 1)).toHaveLength(1);
  });

  it('suggests nothing with no history', () => {
    expect(suggestNextExercises([], [bench])).toEqual([]);
  });
});

describe('suggestedForSearch', () => {
  it('leads with what comes next, then tops up with recent exercises', () => {
    expect(names(suggestedForSearch([pushA, pushB, core], [bench]))).toEqual([
      'Cable fly',
      'Dips',
      'Plank',
    ]);
  });

  it('leaves out what is already in the workout', () => {
    expect(names(suggestedForSearch([pushA, core], [bench, fly, dips]))).toEqual(['Plank']);
  });
});
