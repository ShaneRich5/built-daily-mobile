import { type MuscleSlug, resolveExerciseMuscles } from '@/lib/muscle-map';
import type { SessionLine } from '@/types/workout';

/** Index into the chart's colour ramp, so 1 is the lightest load. */
export type MuscleIntensity = 1 | 2 | 3;

export type MuscleActivation = {
  slug: MuscleSlug;
  intensity: MuscleIntensity;
};

/** A set counts fully for the muscle doing the work, less for the helpers. */
const PRIMARY_WEIGHT = 1;
const SECONDARY_WEIGHT = 0.4;

/** Shares of the hardest-worked muscle at which the ramp steps up. */
const HEAVY_RATIO = 2 / 3;
const MODERATE_RATIO = 1 / 3;

/**
 * How hard each muscle was worked across a session, strongest first.
 *
 * Intensity is relative to the session itself, not to some absolute weekly
 * volume: the top muscle is always a 3. That makes the chart answer "what did
 * this workout hit", which is the question a single session can answer — two
 * sessions are not comparable by shade.
 */
export function muscleActivation(lines: readonly SessionLine[]): MuscleActivation[] {
  const scores = new Map<MuscleSlug, number>();

  const add = (slug: MuscleSlug, amount: number) => {
    scores.set(slug, (scores.get(slug) ?? 0) + amount);
  };

  for (const line of lines) {
    // An exercise with nothing logged against it yet — a session still in
    // progress — is planned work, not work done.
    if (line.sets.length === 0) continue;

    const muscles = resolveExerciseMuscles(line.exerciseId, line.nameSnapshot);
    if (!muscles) continue;

    for (const slug of muscles.primary) add(slug, line.sets.length * PRIMARY_WEIGHT);
    for (const slug of muscles.secondary) add(slug, line.sets.length * SECONDARY_WEIGHT);
  }

  if (scores.size === 0) return [];

  const ranked = [...scores.entries()].sort(([, a], [, b]) => b - a);
  const highest = ranked[0][1];

  return ranked.map(([slug, score]) => ({ slug, intensity: toIntensity(score / highest) }));
}

function toIntensity(ratio: number): MuscleIntensity {
  if (ratio >= HEAVY_RATIO) return 3;
  if (ratio >= MODERATE_RATIO) return 2;
  return 1;
}
