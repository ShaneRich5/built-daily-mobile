import type { WorkoutPlan } from '@/types/workout';

/**
 * What a plan holds, e.g. "5 exercises · 15 sets planned". `targetSets` is
 * optional on a plan line, so the set count is only shown once every line says
 * how many it wants — a partial total would read as a smaller workout than the
 * plan actually describes.
 */
export function planVolumeLabel(plan: Pick<WorkoutPlan, 'lines'>): string {
  const exercises = `${plan.lines.length} ${plan.lines.length === 1 ? 'exercise' : 'exercises'}`;

  const targets = plan.lines.map((line) => line.targetSets);
  if (targets.length === 0 || targets.some((target) => target === null)) return exercises;

  const sets = targets.reduce((total: number, target) => total + (target ?? 0), 0);
  return `${exercises} · ${sets} ${sets === 1 ? 'set' : 'sets'} planned`;
}

/** The first few exercise names, for a one-line preview under the plan name. */
export function planPreview(plan: Pick<WorkoutPlan, 'lines'>, max = 5): string {
  return plan.lines
    .slice(0, max)
    .map((line) => line.nameSnapshot)
    .join(', ');
}

/**
 * When a plan last changed, as "Updated Mar 4". Plans are edited on the web and
 * read here, so the date is what tells a tester whether the plan in their hand
 * is the one they just saved on the website.
 */
export function planUpdatedLabel(plan: Pick<WorkoutPlan, 'updatedAt'>): string {
  return `Updated ${plan.updatedAt.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })}`;
}

/** Where a plan came from — starter templates are copies, so say so. */
export function planSourceLabel(plan: Pick<WorkoutPlan, 'source'>): string | null {
  return plan.source === 'starter_copy' ? 'From a starter template' : null;
}
