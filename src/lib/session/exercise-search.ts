import {
  type CatalogExercise,
  EXERCISE_CATALOG,
  exerciseGroup,
  metricLabel,
  type MuscleGroup,
  muscleGroupLabel,
  searchCatalog,
} from '@/lib/exercise-catalog';

/**
 * Which slice of exercises the search sheet is showing: what past workouts
 * suggest, what was done recently, everything, or one muscle group.
 */
export type ExerciseFilter = 'suggested' | 'recent' | 'all' | MuscleGroup;

/** The muscle groups offered as filter chips, in browsing order. */
const GROUP_FILTERS: readonly MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'arms',
  'legs',
  'core',
  'cardio',
];

function isGroup(filter: ExerciseFilter): filter is MuscleGroup {
  return filter !== 'suggested' && filter !== 'recent' && filter !== 'all';
}

/**
 * The filter chips to show. "Suggested" and "Recent" only appear when there is
 * something behind them — a new lifter has neither.
 */
export function exerciseFilters(
  suggested: readonly CatalogExercise[],
  recent: readonly CatalogExercise[],
): { id: ExerciseFilter; label: string }[] {
  return [
    ...(suggested.length > 0 ? [{ id: 'suggested' as const, label: 'Suggested' }] : []),
    ...(recent.length > 0 ? [{ id: 'recent' as const, label: 'Recent' }] : []),
    { id: 'all' as const, label: 'All' },
    ...GROUP_FILTERS.map((group) => ({ id: group, label: muscleGroupLabel(group) })),
  ];
}

/** Where the sheet opens: on suggestions if there are any, else recents, else all. */
export function initialExerciseFilter(
  suggested: readonly CatalogExercise[],
  recent: readonly CatalogExercise[],
): ExerciseFilter {
  if (suggested.length > 0) return 'suggested';
  if (recent.length > 0) return 'recent';
  return 'all';
}

/**
 * The exercises to list.
 *
 * Typing searches the whole catalog, whatever chip is selected — someone who
 * types "squat" on the Suggested tab wants squats, not the three suggestions
 * that happen to match. A muscle-group chip still narrows the search.
 */
export function exerciseSearchResults({
  query,
  filter,
  suggested,
  recent,
}: {
  query: string;
  filter: ExerciseFilter;
  suggested: readonly CatalogExercise[];
  recent: readonly CatalogExercise[];
}): CatalogExercise[] {
  const searching = query.trim().length > 0;

  let base: readonly CatalogExercise[];
  if (searching) base = searchCatalog(query);
  else if (filter === 'suggested') base = suggested;
  else if (filter === 'recent') base = recent;
  else base = EXERCISE_CATALOG;

  return isGroup(filter) ? base.filter((exercise) => exerciseGroup(exercise) === filter) : [...base];
}

/** The grey line under an exercise in a list: "Chest · Weight × reps". */
export function exerciseMeta(exercise: CatalogExercise): string {
  const group = exerciseGroup(exercise);
  const metric = metricLabel(exercise.metric);

  // "Other" says nothing, and cardio would only repeat the metric.
  return group === 'other' || group === 'cardio' ? metric : `${muscleGroupLabel(group)} · ${metric}`;
}

/**
 * Whether what was typed can be added as a custom exercise: there is a name,
 * and the catalog does not already have one by exactly that name.
 */
export function canAddCustomExercise(query: string): boolean {
  const typed = query.trim().toLowerCase();
  if (typed.length === 0) return false;

  return !EXERCISE_CATALOG.some((exercise) => exercise.name.toLowerCase() === typed);
}

/** Up to `limit` catalog exercises in the same muscle group, for "Similar". */
export function similarExercises(
  exercise: CatalogExercise,
  exclude: readonly CatalogExercise[],
  limit = 4,
): CatalogExercise[] {
  const group = exerciseGroup(exercise);
  if (group === 'other') return [];

  const skip = new Set([exercise.id, ...exclude.map((other) => other.id)]);

  return EXERCISE_CATALOG.filter(
    (candidate) => exerciseGroup(candidate) === group && !skip.has(candidate.id),
  ).slice(0, limit);
}
