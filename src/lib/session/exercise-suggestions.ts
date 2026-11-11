import type { CatalogExercise } from '@/lib/exercise-catalog';
import { exerciseFromLine } from '@/lib/session/session-state';
import type { SessionLine, WorkoutSession } from '@/types/workout';

/**
 * What to offer next, worked out from past workouts. Ported from the web app's
 * `exercise-suggestions.ts`. Both functions expect completed sessions, most
 * recent first.
 */

/** Exercises from recent workouts, most recent first, without repeats. */
export function recentExercises(
  sessions: readonly WorkoutSession[],
  limit = 12,
): CatalogExercise[] {
  const seen = new Set<string>();
  const out: CatalogExercise[] = [];

  for (const session of sessions) {
    for (const line of session.lines) {
      if (seen.has(line.exerciseId)) continue;

      seen.add(line.exerciseId);
      out.push(exerciseFromLine(line));
      if (out.length >= limit) return out;
    }
  }

  return out;
}

/**
 * What you usually do next:
 *
 * - strongest signal: the exercise that followed your latest one last time(s)
 * - weaker signal: exercises that shared a workout with what you've done today
 *
 * With an empty workout, it suggests the exercises you usually open with.
 */
export function suggestNextExercises(
  sessions: readonly WorkoutSession[],
  current: readonly CatalogExercise[],
  limit = 3,
): CatalogExercise[] {
  const currentIds = new Set(current.map((exercise) => exercise.id));
  const latestId = current[current.length - 1]?.id;
  const scores = new Map<string, { exercise: CatalogExercise; score: number; order: number }>();
  let order = 0;

  const bump = (line: SessionLine, points: number) => {
    if (currentIds.has(line.exerciseId)) return;

    const existing = scores.get(line.exerciseId);
    if (existing) {
      existing.score += points;
    } else {
      scores.set(line.exerciseId, { exercise: exerciseFromLine(line), score: points, order: order++ });
    }
  };

  for (const { lines } of sessions) {
    if (!latestId) {
      if (lines[0]) bump(lines[0], 1);
      continue;
    }

    const latestIndex = lines.findIndex((line) => line.exerciseId === latestId);
    const next = latestIndex >= 0 ? lines[latestIndex + 1] : undefined;
    if (next) bump(next, 3);

    if (lines.some((line) => currentIds.has(line.exerciseId))) {
      for (const line of lines) bump(line, 1);
    }
  }

  return [...scores.values()]
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, limit)
    .map((entry) => entry.exercise);
}

/**
 * The search sheet's "Suggested" list: the next-up picks first, topped up with
 * recent exercises, never repeating one or offering what is already in the
 * workout.
 */
export function suggestedForSearch(
  sessions: readonly WorkoutSession[],
  current: readonly CatalogExercise[],
  limit = 8,
): CatalogExercise[] {
  const inWorkout = new Set(current.map((exercise) => exercise.id));
  const seen = new Set<string>();

  return [...suggestNextExercises(sessions, current, limit), ...recentExercises(sessions)]
    .filter((exercise) => {
      if (inWorkout.has(exercise.id) || seen.has(exercise.id)) return false;
      seen.add(exercise.id);
      return true;
    })
    .slice(0, limit);
}
