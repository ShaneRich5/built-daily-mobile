import { resolveExerciseMuscles, type MuscleSlug } from '@/lib/muscle-map';
import type { ExerciseMetric } from '@/types/workout';

/**
 * The exercises a user can pick from, mirroring the web app's
 * `lib/exercise-catalog.ts` (docs/DATA_MODEL.md).
 *
 * This is client data, never a Firestore collection: sessions and plans persist
 * `exerciseId` plus a `nameSnapshot`, so history stays readable when catalog
 * copy changes. That makes the **ids the contract** between the two clients —
 * an id here has to match the web app's exactly or the same lift lands in the
 * history as two different exercises. The display names are only a snapshot and
 * may be reworded freely.
 */
export type CatalogExercise = {
  /** Stable id, shared with the web app. Safe in a URL list — no commas. */
  id: string;
  name: string;
  metric: ExerciseMetric;
};

/** The coarse grouping used for progress rollups and for browsing (docs/DATA_MODEL.md). */
export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
  | 'legs'
  | 'core'
  | 'cardio'
  | 'other';

/**
 * The web app's `CatalogExercise` carries `primary` / `secondary` muscle groups.
 * Here they are derived from the per-exercise muscle table instead
 * (`src/lib/muscle-map.ts`), which already keys the same catalog ids and is
 * finer-grained — `deltoids` rather than `"shoulders"`. Keeping one table means
 * a new exercise cannot be tagged for the body chart and left untagged for the
 * browse list, or tagged inconsistently in the two places.
 */
const GROUP_BY_SLUG: Record<MuscleSlug, MuscleGroup> = {
  chest: 'chest',
  'upper-back': 'back',
  'lower-back': 'back',
  trapezius: 'back',
  deltoids: 'shoulders',
  biceps: 'arms',
  triceps: 'arms',
  forearm: 'arms',
  quadriceps: 'legs',
  hamstring: 'legs',
  gluteal: 'legs',
  calves: 'legs',
  adductors: 'legs',
  abs: 'core',
  obliques: 'core',
  neck: 'other',
};

/**
 * Which group an exercise browses under. Cardio is decided by the metric rather
 * than by muscle: the machines are deliberately left without a primary muscle
 * so a bike never outshines the lifts on the body chart, which would otherwise
 * drop every one of them into "other".
 */
export function exerciseGroup(exercise: CatalogExercise): MuscleGroup {
  if (exercise.metric === 'cardio') return 'cardio';

  const muscles = resolveExerciseMuscles(exercise.id, exercise.name);
  const primary = muscles?.primary[0];

  return primary ? GROUP_BY_SLUG[primary] : 'other';
}

const GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  arms: 'Arms',
  legs: 'Legs',
  core: 'Core',
  cardio: 'Cardio',
  other: 'Other',
};

export function muscleGroupLabel(group: MuscleGroup): string {
  return GROUP_LABELS[group];
}

/** How a metric reads next to an exercise name. */
export function metricLabel(metric: ExerciseMetric): string {
  switch (metric) {
    case 'weight_reps':
      return 'Weight × reps';
    case 'bodyweight_reps':
      return 'Reps';
    case 'duration':
      return 'Hold time';
    case 'cardio':
      return 'Cardio';
  }
}

/**
 * The catalog itself, ordered the way it is browsed. Ids are grouped by section
 * in the same order as `src/lib/muscle-map.ts` so the two tables can be read
 * side by side when either one gains an exercise.
 */
export const EXERCISE_CATALOG: readonly CatalogExercise[] = [
  // --- Chest ---
  { id: 'bench', name: 'Bench press', metric: 'weight_reps' },
  { id: 'incline-bench', name: 'Incline bench press', metric: 'weight_reps' },
  { id: 'decline-bench', name: 'Decline bench press', metric: 'weight_reps' },
  { id: 'db-bench', name: 'Dumbbell bench press', metric: 'weight_reps' },
  { id: 'db-incline-bench', name: 'Incline dumbbell press', metric: 'weight_reps' },
  { id: 'db-decline-bench', name: 'Decline dumbbell press', metric: 'weight_reps' },
  { id: 'smith-bench', name: 'Smith machine bench press', metric: 'weight_reps' },
  { id: 'smith-incline-bench', name: 'Smith machine incline press', metric: 'weight_reps' },
  { id: 'floor-press', name: 'Floor press', metric: 'weight_reps' },
  { id: 'chest-press-machine', name: 'Chest press machine', metric: 'weight_reps' },
  { id: 'incline-chest-press-machine', name: 'Incline chest press machine', metric: 'weight_reps' },
  { id: 'decline-chest-press-machine', name: 'Decline chest press machine', metric: 'weight_reps' },
  { id: 'pushup', name: 'Push-up', metric: 'bodyweight_reps' },
  { id: 'db-fly', name: 'Dumbbell fly', metric: 'weight_reps' },
  { id: 'cable-fly', name: 'Cable fly', metric: 'weight_reps' },
  { id: 'cable-crossover', name: 'Cable crossover', metric: 'weight_reps' },
  { id: 'pec-deck', name: 'Pec deck', metric: 'weight_reps' },
  { id: 'chest-fly-machine', name: 'Chest fly machine', metric: 'weight_reps' },

  // --- Back ---
  { id: 'pullup', name: 'Pull-up', metric: 'bodyweight_reps' },
  { id: 'chinup', name: 'Chin-up', metric: 'bodyweight_reps' },
  { id: 'assisted-pullup-machine', name: 'Assisted pull-up machine', metric: 'weight_reps' },
  { id: 'lat-pulldown', name: 'Lat pulldown', metric: 'weight_reps' },
  { id: 'cable-lat-pulldown', name: 'Cable lat pulldown', metric: 'weight_reps' },
  { id: 'close-grip-lat-pulldown', name: 'Close-grip lat pulldown', metric: 'weight_reps' },
  { id: 'wide-grip-lat-pulldown', name: 'Wide-grip lat pulldown', metric: 'weight_reps' },
  { id: 'straight-arm-pulldown', name: 'Straight-arm pulldown', metric: 'weight_reps' },
  { id: 'row', name: 'Barbell row', metric: 'weight_reps' },
  { id: 'db-row', name: 'Dumbbell row', metric: 'weight_reps' },
  { id: 'chest-supported-db-row', name: 'Chest-supported dumbbell row', metric: 'weight_reps' },
  { id: 'chest-supported-row-machine', name: 'Chest-supported row machine', metric: 'weight_reps' },
  { id: 'cable-seated-row', name: 'Seated cable row', metric: 'weight_reps' },
  { id: 'seated-row-machine', name: 'Seated row machine', metric: 'weight_reps' },
  { id: 't-bar-row-machine', name: 'T-bar row', metric: 'weight_reps' },
  { id: 'landmine-row', name: 'Landmine row', metric: 'weight_reps' },
  { id: 'smith-row', name: 'Smith machine row', metric: 'weight_reps' },
  { id: 'inverted-row', name: 'Inverted row', metric: 'bodyweight_reps' },
  { id: 'db-pullover', name: 'Dumbbell pullover', metric: 'weight_reps' },
  { id: 'deadlift', name: 'Deadlift', metric: 'weight_reps' },
  { id: 'hyperextension', name: 'Hyperextension', metric: 'bodyweight_reps' },
  { id: 'back-extension-machine', name: 'Back extension machine', metric: 'weight_reps' },
  { id: 'barbell-shrug', name: 'Barbell shrug', metric: 'weight_reps' },
  { id: 'db-shrug', name: 'Dumbbell shrug', metric: 'weight_reps' },
  { id: 'cable-shrug', name: 'Cable shrug', metric: 'weight_reps' },
  { id: 'smith-shrug', name: 'Smith machine shrug', metric: 'weight_reps' },
  { id: 'shrug-machine', name: 'Shrug machine', metric: 'weight_reps' },

  // --- Shoulders ---
  { id: 'ohp', name: 'Overhead press', metric: 'weight_reps' },
  { id: 'smith-ohp', name: 'Smith machine overhead press', metric: 'weight_reps' },
  { id: 'db-shoulder-press', name: 'Dumbbell shoulder press', metric: 'weight_reps' },
  { id: 'shoulder-press-machine', name: 'Shoulder press machine', metric: 'weight_reps' },
  { id: 'arnold-press', name: 'Arnold press', metric: 'weight_reps' },
  { id: 'landmine-press', name: 'Landmine press', metric: 'weight_reps' },
  { id: 'db-lateral-raise', name: 'Dumbbell lateral raise', metric: 'weight_reps' },
  { id: 'cable-lateral-raise', name: 'Cable lateral raise', metric: 'weight_reps' },
  { id: 'lateral-raise-machine', name: 'Lateral raise machine', metric: 'weight_reps' },
  { id: 'db-front-raise', name: 'Dumbbell front raise', metric: 'weight_reps' },
  { id: 'db-rear-delt-fly', name: 'Dumbbell rear delt fly', metric: 'weight_reps' },
  { id: 'cable-rear-delt-fly', name: 'Cable rear delt fly', metric: 'weight_reps' },
  { id: 'rear-delt-fly-machine', name: 'Rear delt fly machine', metric: 'weight_reps' },
  { id: 'cable-face-pull', name: 'Face pull', metric: 'weight_reps' },
  { id: 'upright-row', name: 'Upright row', metric: 'weight_reps' },
  { id: 'cable-upright-row', name: 'Cable upright row', metric: 'weight_reps' },

  // --- Arms ---
  { id: 'barbell-curl', name: 'Barbell curl', metric: 'weight_reps' },
  { id: 'db-curl', name: 'Dumbbell curl', metric: 'weight_reps' },
  { id: 'db-hammer-curl', name: 'Hammer curl', metric: 'weight_reps' },
  { id: 'cable-hammer-curl', name: 'Cable hammer curl', metric: 'weight_reps' },
  { id: 'cable-bicep-curl', name: 'Cable curl', metric: 'weight_reps' },
  { id: 'ez-bar-curl', name: 'EZ-bar curl', metric: 'weight_reps' },
  { id: 'incline-db-curl', name: 'Incline dumbbell curl', metric: 'weight_reps' },
  { id: 'concentration-curl', name: 'Concentration curl', metric: 'weight_reps' },
  { id: 'preacher-curl', name: 'Preacher curl', metric: 'weight_reps' },
  { id: 'preacher-curl-machine', name: 'Preacher curl machine', metric: 'weight_reps' },
  { id: 'arm-curl-machine', name: 'Arm curl machine', metric: 'weight_reps' },
  { id: 'bicep-curl-machine', name: 'Bicep curl machine', metric: 'weight_reps' },
  { id: 'reverse-curl', name: 'Reverse curl', metric: 'weight_reps' },
  { id: 'skull-crusher', name: 'Skull crusher', metric: 'weight_reps' },
  { id: 'db-oh-extension', name: 'Overhead dumbbell extension', metric: 'weight_reps' },
  { id: 'cable-overhead-extension', name: 'Overhead cable extension', metric: 'weight_reps' },
  { id: 'cable-tricep-pushdown', name: 'Tricep pushdown', metric: 'weight_reps' },
  { id: 'triceps-pushdown-machine', name: 'Tricep pushdown machine', metric: 'weight_reps' },
  { id: 'triceps-extension-machine', name: 'Tricep extension machine', metric: 'weight_reps' },
  { id: 'db-kickback', name: 'Tricep kickback', metric: 'weight_reps' },
  { id: 'close-grip-bench', name: 'Close-grip bench press', metric: 'weight_reps' },
  { id: 'dip', name: 'Dip', metric: 'bodyweight_reps' },
  { id: 'dip-machine', name: 'Dip machine', metric: 'weight_reps' },
  { id: 'assisted-dip-machine', name: 'Assisted dip machine', metric: 'weight_reps' },

  // --- Legs: quad-dominant ---
  { id: 'squat', name: 'Back squat', metric: 'weight_reps' },
  { id: 'front-squat', name: 'Front squat', metric: 'weight_reps' },
  { id: 'db-squat', name: 'Dumbbell squat', metric: 'weight_reps' },
  { id: 'goblet-squat', name: 'Goblet squat', metric: 'weight_reps' },
  { id: 'smith-squat', name: 'Smith machine squat', metric: 'weight_reps' },
  { id: 'hack-squat-machine', name: 'Hack squat machine', metric: 'weight_reps' },
  { id: 'v-squat-machine', name: 'V-squat machine', metric: 'weight_reps' },
  { id: 'pendulum-squat', name: 'Pendulum squat', metric: 'weight_reps' },
  { id: 'belt-squat', name: 'Belt squat', metric: 'weight_reps' },
  { id: 'split-squat', name: 'Split squat', metric: 'weight_reps' },
  { id: 'bulgarian-split-squat', name: 'Bulgarian split squat', metric: 'weight_reps' },
  { id: 'lunge', name: 'Lunge', metric: 'weight_reps' },
  { id: 'db-lunge', name: 'Dumbbell lunge', metric: 'weight_reps' },
  { id: 'smith-lunge', name: 'Smith machine lunge', metric: 'weight_reps' },
  { id: 'step-up', name: 'Step-up', metric: 'weight_reps' },
  { id: 'leg-press', name: 'Leg press', metric: 'weight_reps' },
  { id: 'horizontal-leg-press', name: 'Horizontal leg press', metric: 'weight_reps' },
  { id: 'leg-extension', name: 'Leg extension', metric: 'weight_reps' },
  { id: 'sumo-deadlift', name: 'Sumo deadlift', metric: 'weight_reps' },
  { id: 'trap-bar-deadlift', name: 'Trap bar deadlift', metric: 'weight_reps' },
  { id: 'sled-push', name: 'Sled push', metric: 'weight_reps' },

  // --- Legs: hip hinge and posterior ---
  { id: 'rdl', name: 'Romanian deadlift', metric: 'weight_reps' },
  { id: 'db-rdl', name: 'Dumbbell Romanian deadlift', metric: 'weight_reps' },
  { id: 'single-leg-rdl', name: 'Single-leg Romanian deadlift', metric: 'weight_reps' },
  { id: 'good-morning', name: 'Good morning', metric: 'weight_reps' },
  { id: 'lying-leg-curl', name: 'Lying leg curl', metric: 'weight_reps' },
  { id: 'seated-leg-curl', name: 'Seated leg curl', metric: 'weight_reps' },
  { id: 'standing-leg-curl', name: 'Standing leg curl', metric: 'weight_reps' },
  { id: 'hip-thrust', name: 'Hip thrust', metric: 'weight_reps' },
  { id: 'hip-thrust-machine', name: 'Hip thrust machine', metric: 'weight_reps' },
  { id: 'smith-hip-thrust', name: 'Smith machine hip thrust', metric: 'weight_reps' },
  { id: 'glute-bridge', name: 'Glute bridge', metric: 'bodyweight_reps' },
  { id: 'cable-kickback', name: 'Cable glute kickback', metric: 'weight_reps' },
  { id: 'glute-kickback-machine', name: 'Glute kickback machine', metric: 'weight_reps' },
  { id: 'cable-pull-through', name: 'Cable pull-through', metric: 'weight_reps' },
  { id: 'kb-swing', name: 'Kettlebell swing', metric: 'weight_reps' },
  { id: 'multi-hip-machine', name: 'Multi-hip machine', metric: 'weight_reps' },
  { id: 'abductor-machine', name: 'Abductor machine', metric: 'weight_reps' },
  { id: 'hip-abduction-machine', name: 'Hip abduction machine', metric: 'weight_reps' },
  { id: 'adductor-machine', name: 'Adductor machine', metric: 'weight_reps' },
  { id: 'hip-adduction-machine', name: 'Hip adduction machine', metric: 'weight_reps' },

  // --- Legs: calves ---
  { id: 'calf-raise-machine', name: 'Standing calf raise', metric: 'weight_reps' },
  { id: 'seated-calf-raise', name: 'Seated calf raise', metric: 'weight_reps' },
  { id: 'donkey-calf-raise-machine', name: 'Donkey calf raise', metric: 'weight_reps' },
  { id: 'calf-extension-machine', name: 'Calf extension machine', metric: 'weight_reps' },
  { id: 'db-calf-raise', name: 'Dumbbell calf raise', metric: 'weight_reps' },
  { id: 'smith-calf-raise', name: 'Smith machine calf raise', metric: 'weight_reps' },
  { id: 'leg-press-calf-raise', name: 'Leg press calf raise', metric: 'weight_reps' },

  // --- Core ---
  { id: 'ab-crunch-machine', name: 'Ab crunch machine', metric: 'weight_reps' },
  { id: 'ab-wheel', name: 'Ab wheel rollout', metric: 'bodyweight_reps' },
  { id: 'cable-crunch', name: 'Cable crunch', metric: 'weight_reps' },
  { id: 'dead-bug', name: 'Dead bug', metric: 'bodyweight_reps' },
  { id: 'sit-up', name: 'Sit-up', metric: 'bodyweight_reps' },
  { id: 'lying-leg-raise', name: 'Lying leg raise', metric: 'bodyweight_reps' },
  { id: 'hanging-leg-raise', name: 'Hanging leg raise', metric: 'bodyweight_reps' },
  { id: 'hanging-knee-raise', name: 'Hanging knee raise', metric: 'bodyweight_reps' },
  { id: 'captains-chair', name: "Captain's chair knee raise", metric: 'bodyweight_reps' },
  { id: 'plank', name: 'Plank', metric: 'duration' },
  { id: 'side-plank', name: 'Side plank', metric: 'duration' },
  { id: 'russian-twist', name: 'Russian twist', metric: 'bodyweight_reps' },
  { id: 'rotary-torso-machine', name: 'Rotary torso machine', metric: 'weight_reps' },
  { id: 'cable-woodchop', name: 'Cable woodchop', metric: 'weight_reps' },

  // --- Loaded carries ---
  { id: 'farmer-carry', name: "Farmer's carry", metric: 'duration' },

  // --- Cardio machines ---
  { id: 'treadmill', name: 'Treadmill', metric: 'cardio' },
  { id: 'stationary-bike', name: 'Stationary bike', metric: 'cardio' },
  { id: 'assault-bike', name: 'Assault bike', metric: 'cardio' },
  { id: 'elliptical', name: 'Elliptical', metric: 'cardio' },
  { id: 'stair-climber', name: 'Stair climber', metric: 'cardio' },
  { id: 'row-erg', name: 'Rowing machine', metric: 'cardio' },
];

const BY_ID = new Map(EXERCISE_CATALOG.map((exercise) => [exercise.id, exercise]));

/**
 * The catalog entry for an id, or undefined for a `custom-{uuid}` move the
 * catalog never saw. Callers that only need something to show should fall back
 * to the line's own `nameSnapshot`.
 */
export function findCatalogExercise(id: string): CatalogExercise | undefined {
  return BY_ID.get(id);
}

/** `custom-{uuid}` ids are user-named moves, not catalog entries. */
export function isCustomExerciseId(id: string): boolean {
  return id.startsWith('custom-');
}

/**
 * Catalog matches for what has been typed, best first.
 *
 * The id is searched alongside the name so the gym shorthand people actually
 * type still lands: "rdl" finds the Romanian deadlift, "ohp" the overhead
 * press, "db" every dumbbell variation. An exact hit comes first — "row" is the
 * barbell row, not the rowing machine, whose name merely starts with it — then
 * a match at the start of a name, then at the start of any word in it.
 */
export function searchCatalog(query: string): CatalogExercise[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return [...EXERCISE_CATALOG];

  const ranked: { exercise: CatalogExercise; rank: number }[] = [];

  for (const exercise of EXERCISE_CATALOG) {
    const rank = matchRank(exercise, needle);
    if (rank !== null) ranked.push({ exercise, rank });
  }

  // Stable within a rank, so the catalog's own ordering survives the sort.
  return ranked
    .sort((a, b) => a.rank - b.rank)
    .map(({ exercise }) => exercise);
}

/** Lower is better; null when the exercise does not match at all. */
function matchRank(exercise: CatalogExercise, needle: string): number | null {
  const name = exercise.name.toLowerCase();

  if (exercise.id === needle || name === needle) return 0;
  if (name.startsWith(needle)) return 1;
  if (startsAWord(name, needle)) return 2;
  if (exercise.id.startsWith(needle)) return 3;
  if (name.includes(needle)) return 4;
  if (exercise.id.includes(needle)) return 5;

  return null;
}

/** Whether the needle begins a word — after a space or a hyphen. */
function startsAWord(haystack: string, needle: string): boolean {
  let from = haystack.indexOf(needle);

  while (from > 0) {
    const before = haystack[from - 1];
    if (before === ' ' || before === '-') return true;
    from = haystack.indexOf(needle, from + 1);
  }

  return false;
}

export type CatalogSection = {
  group: MuscleGroup;
  title: string;
  exercises: CatalogExercise[];
};

/** The order groups are browsed in — the big movers first, cardio last. */
const GROUP_ORDER: readonly MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'arms',
  'legs',
  'core',
  'cardio',
  'other',
];

/**
 * Exercises split into browse sections, skipping any group nothing fell into —
 * so a search that only matches legs does not render six empty headings.
 */
export function catalogSections(exercises: readonly CatalogExercise[]): CatalogSection[] {
  const byGroup = new Map<MuscleGroup, CatalogExercise[]>();

  for (const exercise of exercises) {
    const group = exerciseGroup(exercise);
    const bucket = byGroup.get(group);
    if (bucket) {
      bucket.push(exercise);
    } else {
      byGroup.set(group, [exercise]);
    }
  }

  return GROUP_ORDER.flatMap((group) => {
    const found = byGroup.get(group);
    return found ? [{ group, title: GROUP_LABELS[group], exercises: found }] : [];
  });
}
