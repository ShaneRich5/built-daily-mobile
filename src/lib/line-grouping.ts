import { findCatalogExercise, type CatalogExercise } from '@/lib/exercise-catalog';
import type { AlternateExercise, ExerciseMetric, LineSection } from '@/types/workout';

/**
 * How a workout groups its exercises beyond plain order — mirrors the web
 * app's `lib/line-grouping.ts`:
 *
 * - `section`: "plan" (doing it) or "maybe" (only if there's time).
 * - `alternates`: other exercises that fill the same slot when a machine is
 *   taken.
 *
 * Both are optional on sessions and templates. A document only stores them
 * when they differ from the default, so a plain plan line carries neither —
 * which keeps older documents, and ones the MCP server writes, unchanged.
 */

export const MAX_ALTERNATES = 5;

const METRICS: ReadonlySet<string> = new Set<ExerciseMetric>([
  'weight_reps',
  'bodyweight_reps',
  'duration',
  'cardio',
]);

export function parseLineSection(raw: unknown): LineSection {
  return raw === 'maybe' ? 'maybe' : 'plan';
}

/** Document data → alternates: malformed entries and repeats dropped, capped. */
export function parseAlternates(raw: unknown): AlternateExercise[] {
  if (!Array.isArray(raw)) return [];

  const out: AlternateExercise[] = [];

  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;

    const data = item as Record<string, unknown>;
    const exerciseId = typeof data.exerciseId === 'string' ? data.exerciseId : '';
    const nameSnapshot =
      typeof data.nameSnapshot === 'string' ? data.nameSnapshot.slice(0, 200) : '';
    const metric =
      typeof data.metric === 'string' && METRICS.has(data.metric)
        ? (data.metric as ExerciseMetric)
        : null;

    if (!exerciseId || !nameSnapshot || !metric) continue;
    if (out.some((alternate) => alternate.exerciseId === exerciseId)) continue;

    out.push({ exerciseId, nameSnapshot, metric });
    if (out.length >= MAX_ALTERNATES) break;
  }

  return out;
}

/**
 * The document fields for a line's grouping: nothing at all for a plain plan
 * line, so writing a line back never adds fields it did not need.
 */
export function lineGroupingFields(
  section: LineSection | undefined,
  alternates: readonly AlternateExercise[] | undefined,
): Record<string, unknown> {
  const fields: Record<string, unknown> = {};

  if (section === 'maybe') fields.section = 'maybe';

  if (alternates && alternates.length > 0) {
    fields.alternates = alternates.slice(0, MAX_ALTERNATES).map((alternate) => ({
      exerciseId: alternate.exerciseId,
      nameSnapshot: alternate.nameSnapshot,
      metric: alternate.metric,
    }));
  }

  return fields;
}

export function alternateFromExercise(exercise: CatalogExercise): AlternateExercise {
  return { exerciseId: exercise.id, nameSnapshot: exercise.name, metric: exercise.metric };
}

/**
 * The catalog entry when there is one, else the snapshot — so a custom move
 * saved as an alternate still has a name to show.
 */
export function exerciseFromAlternate(alternate: AlternateExercise): CatalogExercise {
  const fromCatalog = findCatalogExercise(alternate.exerciseId);
  if (fromCatalog && fromCatalog.metric === alternate.metric) return fromCatalog;

  return { id: alternate.exerciseId, name: alternate.nameSnapshot, metric: alternate.metric };
}
