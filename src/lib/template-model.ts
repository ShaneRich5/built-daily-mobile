import { type CatalogExercise, metricLabel } from '@/lib/exercise-catalog';
import type { LineIdFactory } from '@/lib/session-start';
import type { PlanLine, WorkoutPlan } from '@/types/workout';

/**
 * Building and editing a workout template. Ported from the web app's
 * `features/templates/template-model.ts`.
 */

export const DEFAULT_TARGET_SETS = 3;
export const MAX_TARGET_SETS = 20;

/** A template line for an exercise, starting at three sets. */
export function lineFromExercise(exercise: CatalogExercise, newLineId: LineIdFactory): PlanLine {
  return {
    lineId: newLineId(),
    exerciseId: exercise.id,
    nameSnapshot: exercise.name,
    metric: exercise.metric,
    targetSets: DEFAULT_TARGET_SETS,
    notes: null,
  };
}

export function clampTargetSets(n: number): number {
  return Math.max(1, Math.min(MAX_TARGET_SETS, Math.round(n)));
}

/** A line's target sets, or the default for a line that never set one. */
export function targetSetsOf(line: PlanLine): number {
  return line.targetSets ?? DEFAULT_TARGET_SETS;
}

/** Swaps a line with its neighbour. Off either end, nothing moves. */
export function moveLine(lines: readonly PlanLine[], index: number, delta: -1 | 1): PlanLine[] {
  const to = index + delta;
  if (to < 0 || to >= lines.length) return [...lines];

  const next = [...lines];
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}

/** "Weight × reps", plus "· note" when the line has one. */
export function lineMeta(line: PlanLine): string {
  const parts = [metricLabel(line.metric)];
  if (line.notes?.trim()) parts.push('note');
  return parts.join(' · ');
}

/**
 * The template to save. Keeps `createdAt` and rest preferences from the one
 * being edited, and is always `custom` once a lifter has saved it — even a
 * starter copy is theirs after an edit.
 */
export function templateToSave(
  name: string,
  lines: readonly PlanLine[],
  initial: WorkoutPlan | null,
  now: Date,
): Omit<WorkoutPlan, 'id'> {
  return {
    name: name.trim(),
    createdAt: initial?.createdAt ?? now,
    updatedAt: now,
    source: 'custom',
    lines: lines.map((line) => ({ ...line, notes: line.notes?.trim() || null })),
    ...(initial?.restPreferences ? { restPreferences: initial.restPreferences } : {}),
  };
}

/** Why a template cannot be saved yet, or null when it can. */
export function templateProblem(name: string, lines: readonly PlanLine[]): string | null {
  if (!name.trim()) return 'Give the template a name.';
  if (lines.length === 0) return 'Add at least one exercise.';
  return null;
}
