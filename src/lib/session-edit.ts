import type {
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
 *
 * Nothing else is touched. In particular `activeDurationSec` is left as it is:
 * neither app measures a workout's duration any more, and a figure an older
 * version recorded is kept rather than cleared or re-measured.
 */
export function applyStatusTransition(
  session: Pick<WorkoutSession, 'status' | 'endedAt'>,
  next: SessionStatus,
  now: Date = new Date(),
): StatusPatch {
  if (next === 'in_progress') return { status: next, endedAt: null };
  return { status: next, endedAt: session.endedAt ?? now };
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
