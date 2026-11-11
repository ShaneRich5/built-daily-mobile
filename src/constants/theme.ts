/**
 * Design tokens for the Nov 2026 redesign: zinc neutrals, an emerald accent,
 * Geist for text and Geist Mono for numbers.
 *
 * The light values are read straight off the design canvas ("Workout Session
 * Layouts"), which is light-only. The dark values are derived from it — the
 * same zinc/emerald families, stepped to the other end of the scale — so the
 * app keeps following the phone's appearance setting.
 *
 * Names follow the Tailwind scale the web app uses (`zinc-200`, `emerald-700`)
 * so a colour on a web screen can be found here by name.
 */

import '@/global.css';

import { Platform } from 'react-native';

const zinc = {
  50: '#fafafa',
  100: '#f4f4f5',
  200: '#e4e4e7',
  300: '#d4d4d8',
  400: '#a1a1aa',
  500: '#71717a',
  600: '#52525b',
  700: '#3f3f46',
  800: '#27272a',
  900: '#18181b',
  950: '#09090b',
} as const;

const emerald = {
  50: '#ecfdf5',
  100: '#d1fae5',
  200: '#a7f3d0',
  300: '#6ee7b7',
  400: '#34d399',
  500: '#10b981',
  700: '#047857',
  800: '#065f46',
  900: '#064e3b',
  950: '#022c22',
} as const;

export const Colors = {
  light: {
    /** The page behind everything. */
    background: zinc[50],
    /** Cards, rows, sheets and the bottom bar. */
    surface: '#ffffff',
    /** Quiet fills: input wells, set chips, the close button. */
    backgroundElement: zinc[100],
    backgroundSelected: zinc[200],

    border: zinc[200],
    /** Hairlines inside a card. */
    borderSubtle: zinc[100],
    /** Dashed outlines and empty checkbox rings. */
    borderStrong: zinc[300],

    text: zinc[900],
    /** Long-form text and quiet button labels. */
    textBody: zinc[700],
    textMuted: zinc[600],
    /** Meta lines and section labels. */
    textSecondary: zinc[500],
    /** Placeholders, chevrons, disabled glyphs. Not for text that must be read. */
    textFaint: zinc[400],

    /** The one accent: start, finish, done. */
    tint: emerald[700],
    onTint: '#ffffff',
    /** Secondary line on an accent-filled button. */
    onTintMuted: emerald[100],
    tintSubtle: emerald[50],
    tintBorder: emerald[200],
    tintText: emerald[800],
    /** Partly-done progress segment. */
    tintSoft: emerald[300],

    /** The dark "confirm" button: Add exercises, Edit workout. */
    inverse: zinc[900],
    onInverse: '#ffffff',

    /** In progress, and personal records. */
    warningSubtle: '#fffbeb',
    warningBorder: '#fde68a',
    warningText: '#92400e',
    warningDot: '#f59e0b',

    /** Activities (walks, rides) as opposed to workouts. */
    activity: '#60a5fa',
    activitySubtle: '#dbeafe',
    activityText: '#1d4ed8',

    /** Destructive actions only — never a "missed" mark. */
    danger: '#b91c1c',

    /** A picked row in a multi-select list. */
    selectedRow: '#f0fdf4',
    scrim: 'rgba(24, 24, 27, 0.45)',
  },
  dark: {
    background: zinc[950],
    surface: zinc[900],
    backgroundElement: zinc[800],
    backgroundSelected: zinc[700],

    border: zinc[800],
    borderSubtle: zinc[800],
    borderStrong: zinc[600],

    text: zinc[50],
    textBody: zinc[300],
    textMuted: zinc[400],
    textSecondary: zinc[400],
    textFaint: zinc[500],

    // Emerald-700 is too dim on a near-black ground, and white on the brighter
    // emerald-500 fails contrast — so the fill gets lighter and its label dark.
    tint: emerald[500],
    onTint: emerald[950],
    onTintMuted: emerald[900],
    tintSubtle: emerald[950],
    tintBorder: emerald[800],
    tintText: emerald[300],
    tintSoft: emerald[700],

    inverse: zinc[50],
    onInverse: zinc[900],

    warningSubtle: '#451a03',
    warningBorder: '#78350f',
    warningText: '#fcd34d',
    warningDot: '#f59e0b',

    activity: '#60a5fa',
    activitySubtle: '#172554',
    activityText: '#93c5fd',

    danger: '#f87171',

    selectedRow: '#052e16',
    scrim: 'rgba(0, 0, 0, 0.6)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Body-chart fills: `rest` for a muscle the workout never touched, and `ramp`
 * indexed by intensity 1–3. Kept out of `Colors` on purpose — `ThemeColor` is
 * every key there, and `ThemedText`/`ThemedView` would then accept a name that
 * resolves to an object rather than a colour.
 *
 * The ramp runs light-to-dark on white and dark-to-light on black. `rest` has
 * to clear two neighbours at once: the card behind it and the first step of the
 * ramp, which is why it is a neutral grey rather than another green.
 */
export const MuscleChartColors = {
  light: { rest: zinc[300], ramp: [emerald[200], emerald[400], emerald[700]] },
  dark: { rest: zinc[700], ramp: [emerald[800], emerald[500], emerald[300]] },
} as const;

/**
 * Font family names, one per weight.
 *
 * On iOS and Android a custom font is a single weight per family name — asking
 * for `fontWeight: '600'` on `Geist_400Regular` gets a synthesized bold or the
 * system font, not Geist SemiBold. So weight is chosen by picking a family, and
 * text styles in this app do not set `fontWeight` at all.
 *
 * The names are the `@expo-google-fonts` export names, which is what `useFonts`
 * registers them under in `src/app/_layout.tsx`.
 */
export const FontFamily = {
  regular: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semibold: 'Geist_600SemiBold',
  bold: 'Geist_700Bold',
  mono: 'GeistMono_400Regular',
  monoMedium: 'GeistMono_500Medium',
} as const;

export type FontWeightName = keyof typeof FontFamily;

/**
 * The type scale, as drawn on the canvas. `lineHeight` is set on every step so
 * a row's height does not depend on the platform's default leading.
 */
export const Typography = {
  /** Screen titles: "Built Daily", a workout's name. */
  title: { fontFamily: FontFamily.bold, fontSize: 24, lineHeight: 30, letterSpacing: -0.24 },
  /** The headline inside a hero card. */
  subtitle: { fontFamily: FontFamily.semibold, fontSize: 20, lineHeight: 26 },
  /** Card and sheet titles. */
  heading: { fontFamily: FontFamily.semibold, fontSize: 17, lineHeight: 22 },
  /** Row titles: an exercise, a recent workout. */
  label: { fontFamily: FontFamily.medium, fontSize: 15, lineHeight: 20 },
  labelStrong: { fontFamily: FontFamily.semibold, fontSize: 15, lineHeight: 20 },
  default: { fontFamily: FontFamily.regular, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 18 },
  smallBold: { fontFamily: FontFamily.semibold, fontSize: 13, lineHeight: 18 },
  /** Meta lines under a title. */
  caption: { fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 16 },
  /** Section labels: "EXERCISES", "THIS WEEK". */
  overline: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  /** Button labels. */
  button: { fontFamily: FontFamily.semibold, fontSize: 14, lineHeight: 20 },
  link: { fontFamily: FontFamily.medium, fontSize: 13, lineHeight: 18 },
  /** Numbers a lifter types or reads: weights, reps, counts. */
  mono: { fontFamily: FontFamily.mono, fontSize: 15, lineHeight: 20 },
  monoSmall: { fontFamily: FontFamily.mono, fontSize: 12, lineHeight: 16 },
  /** The big figure on a stat: "1 of 3 workouts". */
  stat: { fontFamily: FontFamily.monoMedium, fontSize: 28, lineHeight: 32, letterSpacing: -0.56 },
} as const;

export type TypographyVariant = keyof typeof Typography;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Corner radii: controls 8–10, cards 12, hero cards 16, sheets 20. */
export const Radius = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  sheet: 20,
  full: 999,
} as const;

/** The smallest thing a thumb should be asked to hit. */
export const MinTouchTarget = 44;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
