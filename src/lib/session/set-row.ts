import { isSetDone } from '@/lib/exercise-history';
import type { ExerciseMetric, SetLog } from '@/types/workout';

/**
 * One set as the workout screen edits it — ported from the web app's
 * `UiSetRow` and its helpers in `features/workout-session/session-model.ts`,
 * so both apps turn the same typing into the same stored set.
 *
 * Numbers live as strings while the box is in hand: "12." and "" are states a
 * number cannot hold. Every field a `SetLog` has is represented, including the
 * ones this app shows nowhere (`timedSetSec`), so a set survives being opened
 * and saved again.
 */
export type SetRow = {
  weight: string;
  reps: string;
  /** Hold or cardio duration, in total seconds. */
  seconds: string;
  /** The old set stopwatch. No longer editable, but carried through. */
  timedSetSec: string;
  paceMph: string;
  inclinePercent: string;
  resistanceLevel: string;
  distanceMiles: string;
  note: string;
  /** Checked off in the active workout. */
  done: boolean;
};

/** Longest note the Firestore rules accept, per kind. */
export const NOTE_MAX = {
  title: 200,
  workout: 500,
  exercise: 400,
  set: 200,
} as const;

export function emptySetRow(): SetRow {
  return {
    weight: '',
    reps: '',
    seconds: '',
    timedSetSec: '',
    paceMph: '',
    inclinePercent: '',
    resistanceLevel: '',
    distanceMiles: '',
    note: '',
    done: false,
  };
}

/** The fields that hold a measurement — not the note, the stopwatch or the tick. */
const MEASUREMENT_KEYS = [
  'weight',
  'reps',
  'seconds',
  'paceMph',
  'inclinePercent',
  'resistanceLevel',
  'distanceMiles',
] as const satisfies readonly (keyof SetRow)[];

function text(value: number | null): string {
  return value === null ? '' : String(value);
}

function decimal(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function whole(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const parsed = parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function noteOrNull(raw: string): string | null {
  const trimmed = raw.trim().slice(0, NOTE_MAX.set);
  return trimmed.length > 0 ? trimmed : null;
}

/** A stored set → the row the screen edits. */
export function setLogToSetRow(set: SetLog): SetRow {
  return {
    weight: text(set.weight),
    reps: text(set.reps),
    seconds: text(set.durationSec),
    timedSetSec: text(set.timedSetSec),
    paceMph: text(set.paceMph),
    inclinePercent: text(set.inclinePercent),
    resistanceLevel: text(set.resistanceLevel),
    distanceMiles: text(set.distanceMiles),
    note: set.note ?? '',
    // A set without the flag counts as done when it has values (see `isSetDone`).
    done: isSetDone(set),
  };
}

/**
 * The row → what is stored. Only the fields the exercise's metric uses are
 * written; the rest are null, as the web app writes them — a weight typed
 * against a plank is not a weight.
 */
export function setRowToSetLog(row: SetRow, metric: ExerciseMetric): SetLog {
  const cardioOff = {
    paceMph: null,
    inclinePercent: null,
    resistanceLevel: null,
    distanceMiles: null,
  };
  const shared = { note: noteOrNull(row.note), done: row.done };

  switch (metric) {
    case 'weight_reps':
      return {
        weight: decimal(row.weight),
        reps: whole(row.reps),
        durationSec: null,
        timedSetSec: whole(row.timedSetSec),
        ...cardioOff,
        ...shared,
      };
    case 'bodyweight_reps':
      return {
        weight: null,
        reps: whole(row.reps),
        durationSec: null,
        timedSetSec: whole(row.timedSetSec),
        ...cardioOff,
        ...shared,
      };
    case 'duration':
      return {
        weight: null,
        reps: null,
        durationSec: whole(row.seconds),
        timedSetSec: whole(row.timedSetSec),
        ...cardioOff,
        ...shared,
      };
    case 'cardio':
      return {
        weight: null,
        reps: null,
        durationSec: whole(row.seconds),
        timedSetSec: null,
        paceMph: decimal(row.paceMph),
        inclinePercent: decimal(row.inclinePercent),
        resistanceLevel: decimal(row.resistanceLevel),
        distanceMiles: decimal(row.distanceMiles),
        ...shared,
      };
  }
}

export function setRowHasMeasurements(row: SetRow): boolean {
  return MEASUREMENT_KEYS.some((key) => row[key].trim() !== '');
}

/** Nothing typed at all — safe to remove without asking. */
export function setRowIsBlank(row: SetRow): boolean {
  return !setRowHasMeasurements(row) && !row.timedSetSec.trim() && !row.note.trim();
}

/** The measurements, in a fresh set that is not ticked and has no note. */
export function copySetRow(row: SetRow): SetRow {
  const copy = emptySetRow();
  for (const key of MEASUREMENT_KEYS) copy[key] = row[key];
  return copy;
}

/**
 * Fills each empty measurement with the suggested value — what was showing
 * greyed out in the box. Ticking a set off without typing is the common case:
 * "same as last time".
 */
export function fillFromSuggestion(row: SetRow, suggestion: SetRow | null): SetRow {
  if (!suggestion) return row;

  const next = { ...row };
  for (const key of MEASUREMENT_KEYS) {
    if (!next[key].trim() && suggestion[key].trim()) next[key] = suggestion[key];
  }
  return next;
}

/** Past sets as rows to start from: not ticked, no stopwatch, no note. */
export function rowsFromHistory(sets: readonly SetLog[]): SetRow[] {
  return sets.map((set) => ({ ...setLogToSetRow(set), timedSetSec: '', note: '', done: false }));
}

/**
 * What to show greyed out in an empty set: the set before it in this workout,
 * otherwise the same-numbered set from last time (or last time's final set,
 * when this workout has run longer).
 */
export function suggestionForSet(
  sets: readonly SetRow[],
  setIndex: number,
  lastTimeSets: readonly SetLog[] | undefined,
): SetRow | null {
  for (let i = setIndex - 1; i >= 0; i--) {
    const previous = sets[i];
    if (previous && setRowHasMeasurements(previous)) return previous;
  }

  const fromHistory = lastTimeSets?.[setIndex] ?? lastTimeSets?.[lastTimeSets.length - 1];
  return fromHistory ? setLogToSetRow(fromHistory) : null;
}

/** Total seconds, as stored, split into the minutes and seconds boxes. */
export function splitTotalSeconds(totalSeconds: string): { minutes: string; seconds: string } {
  const trimmed = totalSeconds.trim();
  if (!trimmed) return { minutes: '', seconds: '' };

  const total = parseInt(trimmed, 10);
  if (!Number.isFinite(total) || total < 0) return { minutes: '', seconds: '' };

  return { minutes: String(Math.floor(total / 60)), seconds: String(total % 60) };
}

/** The minutes and seconds boxes back into total seconds. Both empty → empty. */
export function combineToTotalSeconds(minutes: string, seconds: string): string {
  const m = minutes.trim();
  const s = seconds.trim();
  if (!m && !s) return '';

  const wholeMinutes = m === '' ? 0 : parseInt(m, 10);
  const wholeSeconds = s === '' ? 0 : parseInt(s, 10);
  if (
    !Number.isFinite(wholeMinutes) ||
    !Number.isFinite(wholeSeconds) ||
    wholeMinutes < 0 ||
    wholeSeconds < 0
  ) {
    return '';
  }

  return String(wholeMinutes * 60 + wholeSeconds);
}

/** One editable number in a set row. Minutes and seconds both map onto `seconds`. */
export type SetFieldSpec = {
  id: string;
  /** Column header and in-box unit: "lb", "Reps". */
  label: string;
  /** Screen-reader label: "Weight for set 2". */
  accessibilityLabel: (setNumber: number) => string;
  /** Whether the keypad needs a decimal point. */
  decimal: boolean;
  read: (row: SetRow) => string;
  write: (row: SetRow, value: string) => Partial<SetRow>;
};

const weightField: SetFieldSpec = {
  id: 'weight',
  label: 'lb',
  accessibilityLabel: (n) => `Weight for set ${n}`,
  decimal: true,
  read: (row) => row.weight,
  write: (_row, value) => ({ weight: value }),
};

const repsField: SetFieldSpec = {
  id: 'reps',
  label: 'Reps',
  accessibilityLabel: (n) => `Reps for set ${n}`,
  decimal: false,
  read: (row) => row.reps,
  write: (_row, value) => ({ reps: value }),
};

const minutesField: SetFieldSpec = {
  id: 'minutes',
  label: 'Min',
  accessibilityLabel: (n) => `Minutes for set ${n}`,
  decimal: false,
  read: (row) => splitTotalSeconds(row.seconds).minutes,
  write: (row, value) => ({
    seconds: combineToTotalSeconds(value, splitTotalSeconds(row.seconds).seconds),
  }),
};

const secondsField: SetFieldSpec = {
  id: 'seconds',
  label: 'Sec',
  accessibilityLabel: (n) => `Seconds for set ${n}`,
  decimal: false,
  read: (row) => splitTotalSeconds(row.seconds).seconds,
  write: (row, value) => {
    const parsed = parseInt(value, 10);
    // 0–59: anything past a minute belongs in the minutes box.
    const clamped =
      value === '' || !Number.isFinite(parsed) ? '' : String(Math.min(59, Math.max(0, parsed)));

    return {
      seconds: combineToTotalSeconds(splitTotalSeconds(row.seconds).minutes, clamped),
    };
  },
};

const distanceField: SetFieldSpec = {
  id: 'distance',
  label: 'Mi',
  accessibilityLabel: (n) => `Distance in miles for set ${n}`,
  decimal: true,
  read: (row) => row.distanceMiles,
  write: (_row, value) => ({ distanceMiles: value }),
};

const paceField: SetFieldSpec = {
  id: 'pace',
  label: 'mph',
  accessibilityLabel: (n) => `Pace in mph for set ${n}`,
  decimal: true,
  read: (row) => row.paceMph,
  write: (_row, value) => ({ paceMph: value }),
};

const inclineField: SetFieldSpec = {
  id: 'incline',
  label: 'Incline %',
  accessibilityLabel: (n) => `Incline percent for set ${n}`,
  decimal: true,
  read: (row) => row.inclinePercent,
  write: (_row, value) => ({ inclinePercent: value }),
};

const resistanceField: SetFieldSpec = {
  id: 'resistance',
  label: 'Level',
  accessibilityLabel: (n) => `Resistance level for set ${n}`,
  decimal: true,
  read: (row) => row.resistanceLevel,
  write: (_row, value) => ({ resistanceLevel: value }),
};

/** The boxes on the quick card: just enough to log a set. */
export function quickFieldsForMetric(metric: ExerciseMetric): SetFieldSpec[] {
  switch (metric) {
    case 'weight_reps':
      return [weightField, repsField];
    case 'bodyweight_reps':
      return [repsField];
    case 'duration':
      return [minutesField, secondsField];
    case 'cardio':
      return [minutesField, secondsField, distanceField];
  }
}

/** The extra boxes that only appear in an exercise's details. */
export function extraFieldsForMetric(metric: ExerciseMetric): SetFieldSpec[] {
  return metric === 'cardio' ? [paceField, inclineField, resistanceField] : [];
}
