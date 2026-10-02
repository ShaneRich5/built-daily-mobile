import { isLoggedSet } from '@/lib/exercise-history';
import type {
  ExerciseMetric,
  SessionLine,
  SessionStatus,
  SetLog,
  WorkoutSession,
} from '@/types/workout';

/** Firestore rules cap a session at 40 lines (docs/DATA_MODEL.md). */
export const MAX_SESSION_LINES = 40;

/** `previewExerciseNames` holds the first few names for list screens. */
const MAX_PREVIEW_NAMES = 5;

/** A blank set, so every metric has the fields it may need. */
export const EMPTY_SET: SetLog = {
  weight: null,
  reps: null,
  durationSec: null,
  timedSetSec: null,
  paceMph: null,
  inclinePercent: null,
  resistanceLevel: null,
  distanceMiles: null,
  note: null,
};

export type SessionCounters = Pick<
  WorkoutSession,
  'exerciseCount' | 'setCount' | 'previewExerciseNames'
>;

/**
 * The denormalized fields that have to be rewritten whenever lines change.
 * The list screens read these instead of every set of every session, so a write
 * that leaves them behind makes the list lie.
 */
export function deriveCounters(lines: readonly SessionLine[]): SessionCounters {
  return {
    exerciseCount: lines.length,
    setCount: lines.reduce((total, line) => total + line.sets.length, 0),
    previewExerciseNames: lines.slice(0, MAX_PREVIEW_NAMES).map((line) => line.nameSnapshot),
  };
}

export type StatusPatch = {
  status: SessionStatus;
  endedAt: Date | null;
};

/**
 * Moving a session between statuses, and what that does to `endedAt`.
 *
 * `endedAt` is null exactly while a session is in progress, and the recent-list
 * query orders on it — so finishing a workout has to stamp it, and reopening one
 * has to clear it again. A session that already ended keeps its original
 * timestamp rather than being restamped on an unrelated edit.
 */
export function applyStatusTransition(
  session: Pick<WorkoutSession, 'status' | 'endedAt'>,
  next: SessionStatus,
  now: Date = new Date(),
): StatusPatch {
  if (next === 'in_progress') return { status: next, endedAt: null };
  return { status: next, endedAt: session.endedAt ?? now };
}

/**
 * A workout nobody could plausibly have been in the middle of. Past this, the
 * elapsed clock is measuring an app that was left open overnight — or a session
 * whose `startedAt` fell back to the epoch — rather than a workout.
 */
const MAX_PLAUSIBLE_WORKOUT_SEC = 12 * 60 * 60;

export type FinishPatch = StatusPatch & {
  activeDurationSec: number | null;
};

/**
 * Finishing a workout: it completes, `endedAt` is stamped, and how long it took
 * is recorded.
 *
 * Mobile has no pause-and-resume timer yet, so the duration is wall time from
 * `startedAt` — which overstates a workout that was started and left. A figure
 * already on the document was put there by the web app's real session timer, so
 * it is kept rather than overwritten with the rougher measure.
 */
export function finishSession(
  session: Pick<WorkoutSession, 'status' | 'endedAt' | 'startedAt' | 'activeDurationSec'>,
  now: Date = new Date(),
): FinishPatch {
  const status = applyStatusTransition(session, 'completed', now);

  if (session.activeDurationSec !== null && session.activeDurationSec > 0) {
    return { ...status, activeDurationSec: session.activeDurationSec };
  }

  const elapsedSec = Math.round((now.getTime() - session.startedAt.getTime()) / 1000);
  const plausible = elapsedSec > 0 && elapsedSec <= MAX_PLAUSIBLE_WORKOUT_SEC;

  return { ...status, activeDurationSec: plausible ? elapsedSec : null };
}

/** `YYYY-MM-DD`, and a real day — so `2026-02-31` is rejected. */
export function isValidWorkoutDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
  );
}

/** `HH:mm` on a 24-hour clock. */
export function isValidWorkoutTime(value: string): boolean {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return false;

  const [, hours, minutes] = match.map(Number);
  return hours < 24 && minutes < 60;
}

/**
 * A trimmed field, or null when it is blank — the document stores null for an
 * absent value rather than an empty string (docs/DATA_MODEL.md).
 */
export function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * A number typed into a form, or null when the box is empty. Anything that is
 * not a finite number is treated as empty rather than written as NaN.
 */
export function parseNumericField(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/** How a stored number shows up in a text box — null becomes an empty box. */
export function numericFieldValue(value: number | null): string {
  return value === null ? '' : String(value);
}

/**
 * Per-exercise notes, keyed by `lineId`. Notes for lines that no longer exist
 * are dropped, so removing an exercise does not leave an orphan behind.
 */
export function pruneExerciseNotes(
  notes: Record<string, string> | null,
  lines: readonly SessionLine[],
): Record<string, string> | null {
  if (!notes) return null;

  const liveIds = new Set(lines.map((line) => line.lineId));
  const kept = Object.entries(notes).filter(
    ([lineId, note]) => liveIds.has(lineId) && note.trim().length > 0,
  );

  return kept.length > 0 ? Object.fromEntries(kept) : null;
}

/**
 * A set being edited. Numbers live as strings while the box is in hand — "12."
 * and "" are states a number cannot hold — and `original` carries the fields
 * this editor does not show (pace, incline, resistance, stopwatch, set note) so
 * saving a workout logged on the web never quietly drops them.
 */
export type DraftSet = {
  original: SetLog;
  weight: string;
  reps: string;
  durationSec: string;
  distanceMiles: string;
  /** Optional, per-set — "felt light", "left knee twinge". Blank means none. */
  note: string;
};

export type DraftLine = {
  lineId: string;
  exerciseId: string;
  nameSnapshot: string;
  metric: ExerciseMetric;
  sets: DraftSet[];
};

/**
 * Whether nothing has been entered against this exercise yet — including the
 * fields this editor does not show, which a set logged on the web may carry.
 *
 * What it gates: offering to fill the line in from last time. Doing that over
 * numbers somebody has already typed would throw their work away.
 */
export function isDraftLineBlank(line: DraftLine): boolean {
  return line.sets.every(
    (set) =>
      set.weight.trim() === '' &&
      set.reps.trim() === '' &&
      set.durationSec.trim() === '' &&
      set.distanceMiles.trim() === '' &&
      set.note.trim() === '' &&
      !isLoggedSet(set.original),
  );
}

export function toDraftSet(set: SetLog): DraftSet {
  return {
    original: set,
    weight: numericFieldValue(set.weight),
    reps: numericFieldValue(set.reps),
    durationSec: numericFieldValue(set.durationSec),
    distanceMiles: numericFieldValue(set.distanceMiles),
    note: set.note ?? '',
  };
}

/**
 * The set to append when another one is added.
 *
 * Numbers carry forward from the set before it, since sets in a row usually
 * repeat, but the note does not: a note describes the set it was written for,
 * and inheriting "failed last rep" onto a set nobody has done yet would be a
 * lie the lifter has to notice and delete.
 */
export function nextDraftSet(previous: DraftSet | undefined): DraftSet {
  if (!previous) return toDraftSet(EMPTY_SET);

  return { ...previous, original: { ...previous.original, note: null }, note: '' };
}

export function toDraftLines(lines: readonly SessionLine[]): DraftLine[] {
  return lines.map((line) => ({
    lineId: line.lineId,
    exerciseId: line.exerciseId,
    nameSnapshot: line.nameSnapshot,
    metric: line.metric,
    sets: line.sets.map(toDraftSet),
  }));
}

export function fromDraftSet(draft: DraftSet): SetLog {
  return {
    ...draft.original,
    weight: parseNumericField(draft.weight),
    reps: parseNumericField(draft.reps),
    durationSec: parseNumericField(draft.durationSec),
    distanceMiles: parseNumericField(draft.distanceMiles),
    note: blankToNull(draft.note),
  };
}

export function fromDraftLines(draft: readonly DraftLine[]): SessionLine[] {
  return draft.map((line) => ({
    lineId: line.lineId,
    exerciseId: line.exerciseId,
    nameSnapshot: line.nameSnapshot.trim(),
    metric: line.metric,
    sets: line.sets.map(fromDraftSet),
  }));
}

/** Which of the draft's numeric boxes an exercise's metric actually uses. */
export function editableSetFields(
  metric: ExerciseMetric,
): readonly { key: 'weight' | 'reps' | 'durationSec' | 'distanceMiles'; label: string }[] {
  switch (metric) {
    case 'weight_reps':
      return [
        { key: 'weight', label: 'lb' },
        { key: 'reps', label: 'reps' },
      ];
    case 'bodyweight_reps':
      return [{ key: 'reps', label: 'reps' }];
    case 'duration':
      return [{ key: 'durationSec', label: 'sec' }];
    case 'cardio':
      return [
        { key: 'durationSec', label: 'sec' },
        { key: 'distanceMiles', label: 'mi' },
      ];
  }
}
