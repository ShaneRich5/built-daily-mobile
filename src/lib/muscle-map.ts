/**
 * Which muscles an exercise works, in the vocabulary the body chart draws.
 *
 * The web app tags its catalog with a coarse `MuscleGroup`
 * (`"chest" | "back" | "arms" | ...`, see docs/DATA_MODEL.md) which is right for
 * progress rollups but too blunt to shade a body: `"arms"` would light biceps
 * and triceps for every curl. So the table below maps each catalog `exerciseId`
 * straight to the finer slugs instead, keeping the web app's primary/secondary
 * split.
 *
 * Session lines persist only `exerciseId` + `nameSnapshot` (muscle tags are a
 * catalog concern, never written to Firestore), so this is a lookup on the id
 * with a name-based fallback for the `custom-{uuid}` moves the catalog never saw.
 */

/**
 * The subset of `react-native-body-highlighter` slugs a strength move targets.
 * Deliberately not imported from that package: this layer is pure domain data,
 * and the component that renders it is where the two vocabularies meet — so a
 * slug the package stops knowing fails to typecheck there, at the boundary.
 */
export type MuscleSlug =
  | 'abs'
  | 'adductors'
  | 'biceps'
  | 'calves'
  | 'chest'
  | 'deltoids'
  | 'forearm'
  | 'gluteal'
  | 'hamstring'
  | 'lower-back'
  | 'neck'
  | 'obliques'
  | 'quadriceps'
  | 'trapezius'
  | 'triceps'
  | 'upper-back';

/** `secondary` is optional here purely to keep the table below readable. */
type MuscleTags = {
  primary: readonly MuscleSlug[];
  secondary?: readonly MuscleSlug[];
};

export type ExerciseMuscles = {
  primary: readonly MuscleSlug[];
  secondary: readonly MuscleSlug[];
};

/** Keyed by catalog `exerciseId` — the ids, not the display names, are stable. */
const EXERCISE_MUSCLES: Record<string, MuscleTags> = {
  // --- Chest ---
  bench: { primary: ['chest'], secondary: ['deltoids', 'triceps'] },
  'incline-bench': { primary: ['chest'], secondary: ['deltoids', 'triceps'] },
  'decline-bench': { primary: ['chest'], secondary: ['triceps'] },
  'db-bench': { primary: ['chest'], secondary: ['deltoids', 'triceps'] },
  'db-incline-bench': { primary: ['chest'], secondary: ['deltoids', 'triceps'] },
  'db-decline-bench': { primary: ['chest'], secondary: ['triceps'] },
  'smith-bench': { primary: ['chest'], secondary: ['deltoids', 'triceps'] },
  'smith-incline-bench': { primary: ['chest'], secondary: ['deltoids', 'triceps'] },
  'floor-press': { primary: ['chest'], secondary: ['triceps'] },
  'chest-press-machine': { primary: ['chest'], secondary: ['deltoids', 'triceps'] },
  'incline-chest-press-machine': { primary: ['chest'], secondary: ['deltoids', 'triceps'] },
  'decline-chest-press-machine': { primary: ['chest'], secondary: ['triceps'] },
  pushup: { primary: ['chest'], secondary: ['deltoids', 'triceps', 'abs'] },
  'db-fly': { primary: ['chest'] },
  'cable-fly': { primary: ['chest'] },
  'cable-crossover': { primary: ['chest'] },
  'pec-deck': { primary: ['chest'] },
  'chest-fly-machine': { primary: ['chest'] },

  // --- Back ---
  pullup: { primary: ['upper-back'], secondary: ['biceps', 'forearm'] },
  chinup: { primary: ['upper-back'], secondary: ['biceps', 'forearm'] },
  'assisted-pullup-machine': { primary: ['upper-back'], secondary: ['biceps'] },
  'lat-pulldown': { primary: ['upper-back'], secondary: ['biceps', 'forearm'] },
  'cable-lat-pulldown': { primary: ['upper-back'], secondary: ['biceps', 'forearm'] },
  'close-grip-lat-pulldown': { primary: ['upper-back'], secondary: ['biceps'] },
  'wide-grip-lat-pulldown': { primary: ['upper-back'], secondary: ['biceps'] },
  'straight-arm-pulldown': { primary: ['upper-back'] },
  row: { primary: ['upper-back'], secondary: ['biceps', 'lower-back', 'forearm'] },
  'db-row': { primary: ['upper-back'], secondary: ['biceps', 'forearm'] },
  'chest-supported-db-row': { primary: ['upper-back'], secondary: ['biceps'] },
  'chest-supported-row-machine': { primary: ['upper-back'], secondary: ['biceps'] },
  'cable-seated-row': { primary: ['upper-back'], secondary: ['biceps', 'forearm'] },
  'seated-row-machine': { primary: ['upper-back'], secondary: ['biceps'] },
  't-bar-row-machine': { primary: ['upper-back'], secondary: ['biceps'] },
  'landmine-row': { primary: ['upper-back'], secondary: ['biceps'] },
  'smith-row': { primary: ['upper-back'], secondary: ['biceps'] },
  'inverted-row': { primary: ['upper-back'], secondary: ['biceps', 'abs'] },
  'db-pullover': { primary: ['upper-back'], secondary: ['chest'] },
  // The one lift that earns two primaries: the whole posterior chain braces it.
  deadlift: {
    primary: ['lower-back', 'upper-back'],
    secondary: ['gluteal', 'hamstring', 'quadriceps', 'trapezius', 'forearm'],
  },
  hyperextension: { primary: ['lower-back'], secondary: ['gluteal', 'hamstring'] },
  'back-extension-machine': { primary: ['lower-back'], secondary: ['gluteal', 'hamstring'] },
  'barbell-shrug': { primary: ['trapezius'], secondary: ['forearm'] },
  'db-shrug': { primary: ['trapezius'], secondary: ['forearm'] },
  'cable-shrug': { primary: ['trapezius'] },
  'smith-shrug': { primary: ['trapezius'] },
  'shrug-machine': { primary: ['trapezius'] },

  // --- Shoulders ---
  ohp: { primary: ['deltoids'], secondary: ['triceps', 'trapezius'] },
  'smith-ohp': { primary: ['deltoids'], secondary: ['triceps'] },
  'db-shoulder-press': { primary: ['deltoids'], secondary: ['triceps'] },
  'shoulder-press-machine': { primary: ['deltoids'], secondary: ['triceps'] },
  'arnold-press': { primary: ['deltoids'], secondary: ['triceps'] },
  'landmine-press': { primary: ['deltoids'], secondary: ['chest', 'triceps'] },
  'db-lateral-raise': { primary: ['deltoids'] },
  'cable-lateral-raise': { primary: ['deltoids'] },
  'lateral-raise-machine': { primary: ['deltoids'] },
  'db-front-raise': { primary: ['deltoids'] },
  'db-rear-delt-fly': { primary: ['deltoids'], secondary: ['upper-back'] },
  'cable-rear-delt-fly': { primary: ['deltoids'], secondary: ['upper-back'] },
  'rear-delt-fly-machine': { primary: ['deltoids'], secondary: ['upper-back'] },
  'cable-face-pull': { primary: ['deltoids'], secondary: ['upper-back', 'trapezius'] },
  'upright-row': { primary: ['deltoids'], secondary: ['trapezius', 'biceps'] },
  'cable-upright-row': { primary: ['deltoids'], secondary: ['trapezius', 'biceps'] },

  // --- Arms ---
  'barbell-curl': { primary: ['biceps'], secondary: ['forearm'] },
  'db-curl': { primary: ['biceps'], secondary: ['forearm'] },
  'db-hammer-curl': { primary: ['biceps'], secondary: ['forearm'] },
  'cable-hammer-curl': { primary: ['biceps'], secondary: ['forearm'] },
  'cable-bicep-curl': { primary: ['biceps'], secondary: ['forearm'] },
  'ez-bar-curl': { primary: ['biceps'], secondary: ['forearm'] },
  'incline-db-curl': { primary: ['biceps'] },
  'concentration-curl': { primary: ['biceps'] },
  'preacher-curl': { primary: ['biceps'] },
  'preacher-curl-machine': { primary: ['biceps'] },
  'arm-curl-machine': { primary: ['biceps'] },
  'bicep-curl-machine': { primary: ['biceps'] },
  'reverse-curl': { primary: ['forearm'], secondary: ['biceps'] },
  'skull-crusher': { primary: ['triceps'] },
  'db-oh-extension': { primary: ['triceps'] },
  'cable-overhead-extension': { primary: ['triceps'] },
  'cable-tricep-pushdown': { primary: ['triceps'] },
  'triceps-pushdown-machine': { primary: ['triceps'] },
  'triceps-extension-machine': { primary: ['triceps'] },
  'db-kickback': { primary: ['triceps'] },
  'close-grip-bench': { primary: ['triceps'], secondary: ['chest'] },
  dip: { primary: ['triceps'], secondary: ['chest', 'deltoids'] },
  'dip-machine': { primary: ['triceps'], secondary: ['chest'] },
  'assisted-dip-machine': { primary: ['triceps'], secondary: ['chest', 'deltoids'] },

  // --- Legs: quad-dominant ---
  squat: {
    primary: ['quadriceps'],
    secondary: ['gluteal', 'adductors', 'hamstring', 'abs', 'lower-back'],
  },
  'front-squat': { primary: ['quadriceps'], secondary: ['gluteal', 'abs'] },
  'db-squat': { primary: ['quadriceps'], secondary: ['gluteal', 'abs'] },
  'goblet-squat': { primary: ['quadriceps'], secondary: ['gluteal', 'abs'] },
  'smith-squat': { primary: ['quadriceps'], secondary: ['gluteal'] },
  'hack-squat-machine': { primary: ['quadriceps'], secondary: ['gluteal'] },
  'v-squat-machine': { primary: ['quadriceps'], secondary: ['gluteal'] },
  'pendulum-squat': { primary: ['quadriceps'], secondary: ['gluteal'] },
  'belt-squat': { primary: ['quadriceps'], secondary: ['gluteal'] },
  'split-squat': { primary: ['quadriceps'], secondary: ['gluteal'] },
  'bulgarian-split-squat': { primary: ['quadriceps'], secondary: ['gluteal', 'hamstring'] },
  lunge: { primary: ['quadriceps'], secondary: ['gluteal', 'hamstring'] },
  'db-lunge': { primary: ['quadriceps'], secondary: ['gluteal', 'hamstring'] },
  'smith-lunge': { primary: ['quadriceps'], secondary: ['gluteal'] },
  'step-up': { primary: ['quadriceps'], secondary: ['gluteal'] },
  'leg-press': { primary: ['quadriceps'], secondary: ['gluteal'] },
  'horizontal-leg-press': { primary: ['quadriceps'], secondary: ['gluteal'] },
  'leg-extension': { primary: ['quadriceps'] },
  'sumo-deadlift': {
    primary: ['quadriceps'],
    secondary: ['gluteal', 'adductors', 'lower-back', 'trapezius'],
  },
  'trap-bar-deadlift': {
    primary: ['quadriceps'],
    secondary: ['gluteal', 'lower-back', 'trapezius'],
  },
  'sled-push': { primary: ['quadriceps'], secondary: ['gluteal', 'calves', 'deltoids', 'abs'] },

  // --- Legs: hip hinge and posterior ---
  rdl: { primary: ['hamstring'], secondary: ['gluteal', 'lower-back'] },
  'db-rdl': { primary: ['hamstring'], secondary: ['gluteal', 'lower-back'] },
  'single-leg-rdl': { primary: ['hamstring'], secondary: ['gluteal', 'lower-back'] },
  'good-morning': { primary: ['hamstring'], secondary: ['gluteal', 'lower-back'] },
  'lying-leg-curl': { primary: ['hamstring'] },
  'seated-leg-curl': { primary: ['hamstring'] },
  'standing-leg-curl': { primary: ['hamstring'] },
  'hip-thrust': { primary: ['gluteal'], secondary: ['hamstring'] },
  'hip-thrust-machine': { primary: ['gluteal'], secondary: ['hamstring'] },
  'smith-hip-thrust': { primary: ['gluteal'], secondary: ['hamstring'] },
  'glute-bridge': { primary: ['gluteal'], secondary: ['hamstring'] },
  'cable-kickback': { primary: ['gluteal'], secondary: ['hamstring'] },
  'glute-kickback-machine': { primary: ['gluteal'], secondary: ['hamstring'] },
  'cable-pull-through': { primary: ['gluteal'], secondary: ['hamstring', 'lower-back'] },
  'kb-swing': { primary: ['gluteal'], secondary: ['hamstring', 'lower-back', 'abs'] },
  'multi-hip-machine': { primary: ['gluteal'], secondary: ['adductors'] },
  // The chart has no abductor region, so hip abduction reads on the glutes.
  'abductor-machine': { primary: ['gluteal'] },
  'hip-abduction-machine': { primary: ['gluteal'] },
  'adductor-machine': { primary: ['adductors'] },
  'hip-adduction-machine': { primary: ['adductors'] },

  // --- Legs: calves ---
  'calf-raise-machine': { primary: ['calves'] },
  'seated-calf-raise': { primary: ['calves'] },
  'donkey-calf-raise-machine': { primary: ['calves'] },
  'calf-extension-machine': { primary: ['calves'] },
  'db-calf-raise': { primary: ['calves'] },
  'smith-calf-raise': { primary: ['calves'] },
  'leg-press-calf-raise': { primary: ['calves'] },

  // --- Core ---
  'ab-crunch-machine': { primary: ['abs'] },
  'ab-wheel': { primary: ['abs'], secondary: ['deltoids', 'lower-back'] },
  'cable-crunch': { primary: ['abs'] },
  'dead-bug': { primary: ['abs'] },
  'sit-up': { primary: ['abs'], secondary: ['obliques'] },
  'lying-leg-raise': { primary: ['abs'] },
  'hanging-leg-raise': { primary: ['abs'], secondary: ['forearm'] },
  'hanging-knee-raise': { primary: ['abs'], secondary: ['forearm'] },
  'captains-chair': { primary: ['abs'], secondary: ['obliques'] },
  plank: { primary: ['abs'], secondary: ['obliques', 'deltoids'] },
  'side-plank': { primary: ['obliques'], secondary: ['abs'] },
  'russian-twist': { primary: ['obliques'], secondary: ['abs'] },
  'rotary-torso-machine': { primary: ['obliques'], secondary: ['abs'] },
  'cable-woodchop': { primary: ['obliques'], secondary: ['abs', 'deltoids'] },

  // --- Loaded carries ---
  'farmer-carry': { primary: ['forearm', 'trapezius'], secondary: ['abs', 'quadriceps', 'calves'] },

  // --- Cardio machines: no primary, so a bike never outshines the lifts ---
  treadmill: { primary: [], secondary: ['quadriceps', 'hamstring', 'calves', 'gluteal'] },
  'stationary-bike': { primary: [], secondary: ['quadriceps', 'hamstring', 'calves'] },
  'assault-bike': { primary: [], secondary: ['quadriceps', 'hamstring', 'calves', 'deltoids'] },
  elliptical: { primary: [], secondary: ['quadriceps', 'hamstring', 'calves', 'gluteal'] },
  'stair-climber': { primary: [], secondary: ['quadriceps', 'gluteal', 'calves'] },
  'row-erg': { primary: [], secondary: ['upper-back', 'quadriceps', 'biceps', 'lower-back'] },
};

/**
 * Name patterns for custom exercises, tried in order — so the narrow ones come
 * first. "Seated leg curl" has to reach the hamstring rule before `curl` sends
 * it to the biceps, and "back extension" before `row|pulldown` claims the lats.
 */
const NAME_HINTS: readonly (readonly [RegExp, MuscleTags])[] = [
  [/calf|calve/, { primary: ['calves'] }],
  [
    /leg\s*curl|hamstring|romanian|\brdl\b|good\s*morning/,
    { primary: ['hamstring'], secondary: ['gluteal', 'lower-back'] },
  ],
  [/tricep|skull\s*crusher|pushdown|\bdip\b/, { primary: ['triceps'] }],
  [/bicep|curl/, { primary: ['biceps'], secondary: ['forearm'] }],
  [/glute|hip\s*thrust|bridge|kickback|abduct/, { primary: ['gluteal'], secondary: ['hamstring'] }],
  [/adduct/, { primary: ['adductors'] }],
  [
    /squat|lunge|leg\s*press|leg\s*extension|quad|step[-\s]*up/,
    { primary: ['quadriceps'], secondary: ['gluteal'] },
  ],
  [
    /deadlift/,
    { primary: ['lower-back'], secondary: ['gluteal', 'hamstring', 'quadriceps', 'trapezius'] },
  ],
  [
    /back\s*extension|hyperextension|lower\s*back/,
    { primary: ['lower-back'], secondary: ['gluteal'] },
  ],
  [/shrug|\btrap/, { primary: ['trapezius'] }],
  [/upright\s*row/, { primary: ['deltoids'], secondary: ['trapezius'] }],
  [
    /row|pulldown|pull[-\s]*up|chin[-\s]*up|\blat\b|pullover/,
    { primary: ['upper-back'], secondary: ['biceps', 'forearm'] },
  ],
  [/oblique|twist|side\s*plank|woodchop/, { primary: ['obliques'], secondary: ['abs'] }],
  [
    /\babs?\b|crunch|plank|sit[-\s]*up|leg\s*raise|knee\s*raise|core|hollow|dead\s*bug/,
    { primary: ['abs'] },
  ],
  [
    /delt|shoulder|lateral\s*raise|front\s*raise|\bohp\b|face\s*pull|arnold/,
    { primary: ['deltoids'], secondary: ['triceps'] },
  ],
  [
    /bench|chest|\bfly\b|push[-\s]*up|crossover|\bpec\b|press/,
    { primary: ['chest'], secondary: ['deltoids', 'triceps'] },
  ],
  [/forearm|wrist|grip/, { primary: ['forearm'] }],
  [/neck/, { primary: ['neck'] }],
];

/**
 * The muscles a logged line worked, or `null` when neither the catalog id nor
 * the name says anything — an unrecognised move is left off the chart rather
 * than guessed onto it.
 */
export function resolveExerciseMuscles(
  exerciseId: string,
  nameSnapshot: string,
): ExerciseMuscles | null {
  const tagged = EXERCISE_MUSCLES[exerciseId];
  if (tagged) return { primary: tagged.primary, secondary: tagged.secondary ?? [] };

  const name = nameSnapshot.toLowerCase();
  if (name.length === 0) return null;

  for (const [pattern, tags] of NAME_HINTS) {
    if (pattern.test(name)) return { primary: tags.primary, secondary: tags.secondary ?? [] };
  }

  return null;
}

const MUSCLE_LABELS: Record<MuscleSlug, string> = {
  abs: 'Abs',
  adductors: 'Adductors',
  biceps: 'Biceps',
  calves: 'Calves',
  chest: 'Chest',
  deltoids: 'Shoulders',
  forearm: 'Forearms',
  gluteal: 'Glutes',
  hamstring: 'Hamstrings',
  'lower-back': 'Lower back',
  neck: 'Neck',
  obliques: 'Obliques',
  quadriceps: 'Quads',
  trapezius: 'Traps',
  triceps: 'Triceps',
  'upper-back': 'Upper back',
};

/** How a muscle reads to a lifter — "Glutes", not "gluteal". */
export function muscleLabel(slug: MuscleSlug): string {
  return MUSCLE_LABELS[slug];
}
