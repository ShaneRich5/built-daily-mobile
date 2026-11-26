import { type CatalogExercise, metricLabel } from '@/lib/exercise-catalog';
import { alternateFromExercise, MAX_ALTERNATES } from '@/lib/line-grouping';
import type { LineIdFactory } from '@/lib/session-start';
import type { LineSection, PlanLine, WorkoutPlan } from '@/types/workout';

/**
 * Building and editing a workout template. Ported from the web app's
 * `features/templates/template-model.ts`.
 */

export const DEFAULT_TARGET_SETS = 3;
export const MAX_TARGET_SETS = 20;

/** A template line for an exercise, starting at three sets. Plan by default; a maybe if asked. */
export function lineFromExercise(
  exercise: CatalogExercise,
  newLineId: LineIdFactory,
  section: LineSection = 'plan',
): PlanLine {
  return {
    lineId: newLineId(),
    exerciseId: exercise.id,
    nameSnapshot: exercise.name,
    metric: exercise.metric,
    targetSets: DEFAULT_TARGET_SETS,
    notes: null,
    ...(section === 'maybe' ? { section } : {}),
  };
}

export function sectionOf(line: PlanLine): LineSection {
  return line.section ?? 'plan';
}

/** Plan lines first, then maybes, each keeping its order. Sessions list them the same way. */
export function orderBySection(lines: readonly PlanLine[]): PlanLine[] {
  return [
    ...lines.filter((line) => sectionOf(line) === 'plan'),
    ...lines.filter((line) => sectionOf(line) === 'maybe'),
  ];
}

/** Moves a line to the other section; it lands at the end of that section. */
export function setLineSection(
  lines: readonly PlanLine[],
  lineId: string,
  section: LineSection,
): PlanLine[] {
  const line = lines.find((candidate) => candidate.lineId === lineId);
  if (!line || sectionOf(line) === section) return [...lines];

  const moved: PlanLine = { ...line, section };
  // Plan is the default, so a plan line carries no section field.
  if (section === 'plan') delete moved.section;
  return orderBySection([...lines.filter((candidate) => candidate.lineId !== lineId), moved]);
}

/** Swaps a line with its neighbour in the same section. Off either end, nothing moves. */
export function moveLineInSection(
  lines: readonly PlanLine[],
  lineId: string,
  delta: -1 | 1,
): PlanLine[] {
  const ordered = orderBySection(lines);
  const line = ordered.find((candidate) => candidate.lineId === lineId);
  if (!line) return [...lines];

  const ids = ordered
    .filter((candidate) => sectionOf(candidate) === sectionOf(line))
    .map((l) => l.lineId);
  const swapWith = ids[ids.indexOf(lineId) + delta];
  if (!swapWith) return ordered;

  const from = ordered.findIndex((candidate) => candidate.lineId === lineId);
  const to = ordered.findIndex((candidate) => candidate.lineId === swapWith);
  const next = [...ordered];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

/** Can this exercise stand in for the line? Not itself, not twice, and only up to the limit. */
export function canAddAlternate(line: PlanLine, exercise: CatalogExercise): boolean {
  const alternates = line.alternates ?? [];
  return (
    exercise.id !== line.exerciseId &&
    alternates.length < MAX_ALTERNATES &&
    !alternates.some((alternate) => alternate.exerciseId === exercise.id)
  );
}

export function addAlternate(line: PlanLine, exercise: CatalogExercise): PlanLine {
  if (!canAddAlternate(line, exercise)) return line;
  return { ...line, alternates: [...(line.alternates ?? []), alternateFromExercise(exercise)] };
}

export function removeAlternate(line: PlanLine, exerciseId: string): PlanLine {
  const alternates = (line.alternates ?? []).filter(
    (alternate) => alternate.exerciseId !== exerciseId,
  );
  const next: PlanLine = { ...line, alternates };
  if (alternates.length === 0) delete next.alternates;
  return next;
}

export function clampTargetSets(n: number): number {
  return Math.max(1, Math.min(MAX_TARGET_SETS, Math.round(n)));
}

/** A line's target sets, or the default for a line that never set one. */
export function targetSetsOf(line: PlanLine): number {
  return line.targetSets ?? DEFAULT_TARGET_SETS;
}

/** "Weight × reps", plus "· 2 alternates" and "· note" when the line has them. */
export function lineMeta(line: PlanLine): string {
  const parts = [metricLabel(line.metric)];
  const alternates = line.alternates?.length ?? 0;
  if (alternates > 0) parts.push(`${alternates} ${alternates === 1 ? 'alternate' : 'alternates'}`);
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
    lines: orderBySection(lines).map((line) => ({ ...line, notes: line.notes?.trim() || null })),
    ...(initial?.restPreferences ? { restPreferences: initial.restPreferences } : {}),
  };
}

/** Why a template cannot be saved yet, or null when it can. */
export function templateProblem(name: string, lines: readonly PlanLine[]): string | null {
  if (!name.trim()) return 'Give the template a name.';
  if (lines.length === 0) return 'Add at least one exercise.';
  return null;
}
