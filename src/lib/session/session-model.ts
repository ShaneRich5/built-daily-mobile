import { type CatalogExercise, metricLabel } from '@/lib/exercise-catalog';
import { MAX_SESSION_LINES } from '@/lib/session-edit';
import { formatClock } from '@/lib/session-format';
import {
  setRowHasMeasurements,
  setRowToSetLog,
  type SetRow,
} from '@/lib/session/set-row';
import type { ExerciseMetric, LineSection, SetLog } from '@/types/workout';

/**
 * One exercise in the workout being logged, with its sets and note kept
 * together. Ported from the web app's `session-model.ts`.
 */
export type SessionExercise = {
  lineId: string;
  exercise: CatalogExercise;
  sets: SetRow[];
  note: string;
  /** "plan" = doing it today; "maybe" = only if there's time. */
  section: LineSection;
  /** Other exercises that fill this slot (whichever machine is free). */
  alternates: CatalogExercise[];
};

export type ExerciseProgress = 'not_started' | 'in_progress' | 'done';

export const MAX_SESSION_EXERCISES = MAX_SESSION_LINES;

export function exerciseProgress(sets: readonly SetRow[]): ExerciseProgress {
  const doneCount = sets.filter((set) => set.done).length;

  if (sets.length > 0 && doneCount === sets.length) return 'done';
  if (doneCount > 0 || sets.some(setRowHasMeasurements)) return 'in_progress';
  return 'not_started';
}

/**
 * A maybe nobody touched never counts: not in the header, and not in the saved
 * workout. Skipping one is not a miss.
 */
export function isUntouchedMaybe(item: SessionExercise): boolean {
  return item.section === 'maybe' && exerciseProgress(item.sets) === 'not_started';
}

export function countDoneSets(exercises: readonly SessionExercise[]): number {
  return exercises.reduce((total, item) => total + item.sets.filter((set) => set.done).length, 0);
}

/**
 * One set on one line, whatever its metric: "135 lb × 8", "12 reps", "1:30",
 * "20:00 · 2.5 mi". Empty when the set recorded nothing.
 */
export function setSummary(set: SetLog): string {
  const parts: string[] = [];

  if (set.weight !== null && set.reps !== null) {
    parts.push(`${set.weight} lb × ${set.reps}`);
  } else if (set.weight !== null) {
    parts.push(`${set.weight} lb`);
  } else if (set.reps !== null) {
    parts.push(`${set.reps} reps`);
  } else if (set.durationSec !== null) {
    parts.push(formatClock(set.durationSec));
  }

  if (set.distanceMiles !== null) parts.push(`${set.distanceMiles} mi`);
  if (set.paceMph !== null) parts.push(`${set.paceMph} mph`);
  if (set.inclinePercent !== null) parts.push(`${set.inclinePercent}%`);
  if (set.resistanceLevel !== null) parts.push(`L${set.resistanceLevel}`);

  return parts.join(' · ');
}

/** "3 sets · 30 lb × 12" when every set matches, otherwise each set in order. */
export function summarizeSetLogs(sets: readonly SetLog[]): string {
  const parts = sets.map(setSummary).filter((part) => part !== '');
  if (parts.length === 0) return '';

  const allSame = parts.every((part) => part === parts[0]);
  if (allSame) return parts.length === 1 ? parts[0] : `${parts.length} sets · ${parts[0]}`;

  return parts.join(', ');
}

export function summarizeSetRows(sets: readonly SetRow[], metric: ExerciseMetric): string {
  return summarizeSetLogs(
    sets.filter(setRowHasMeasurements).map((row) => setRowToSetLog(row, metric)),
  );
}

/**
 * The grey line under an exercise's name. It answers a different question in
 * each state: open, "what did I do last time?"; done, "what did I do?";
 * part-way, "how far along am I?"; untouched, "what should I expect?".
 */
export function cardSubtitle(
  item: SessionExercise,
  open: boolean,
  lastTimeSets: readonly SetLog[] | undefined,
): string {
  const { sets, exercise, note } = item;
  const lastTime = lastTimeSets ? summarizeSetLogs(lastTimeSets) : '';
  const progress = exerciseProgress(sets);
  const noteBit = note.trim() ? ' · Note' : '';

  if (open) {
    return (lastTime ? `Last time · ${lastTime}` : metricLabel(exercise.metric)) + noteBit;
  }

  if (progress === 'done') {
    return (summarizeSetRows(sets, exercise.metric) || `${sets.length} sets done`) + noteBit;
  }

  if (progress === 'in_progress') {
    const done = sets.filter((set) => set.done).length;
    const logged = summarizeSetRows(sets, exercise.metric);
    return `${done} of ${sets.length} sets done${logged ? ` · ${logged}` : ''}${noteBit}`;
  }

  return (lastTime ? `Not started · Last ${lastTime}` : 'Not started') + noteBit;
}

/** The grey line under a maybe: what it has so far, else what to expect. */
export function maybeSubtitle(
  item: SessionExercise,
  lastTimeSets: readonly SetLog[] | undefined,
): string {
  if (exerciseProgress(item.sets) !== 'not_started') {
    return summarizeSetRows(item.sets, item.exercise.metric) || 'Started';
  }

  const last = lastTimeSets ? summarizeSetLogs(lastTimeSets) : '';
  return last ? `Last ${last}` : 'Not started';
}

/** The header's count line: "4 exercises · 9 of 12 sets done". */
export function volumeLine(exerciseCount: number, setCount: number, doneSetCount: number): string {
  if (exerciseCount === 0) return 'No exercises yet';

  const exercises = `${exerciseCount} exercise${exerciseCount === 1 ? '' : 's'}`;
  return `${exercises} · ${doneSetCount} of ${setCount} set${setCount === 1 ? '' : 's'} done`;
}
