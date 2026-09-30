import type { ThemeColor } from '@/constants/theme';
import type { ExerciseMetric, SessionStatus, SetLog, WorkoutSession } from '@/types/workout';

/**
 * The day to show for a session. `workoutDate` is the user's own local calendar
 * day as recorded on the web, so it is preferred over the timestamps — which
 * would otherwise be re-interpreted in the phone's timezone.
 */
export function sessionDayLabel(
  session: Pick<WorkoutSession, 'workoutDate' | 'endedAt' | 'startedAt'>,
): string {
  if (session.workoutDate) {
    // Parse as local, not UTC: `new Date('2026-09-20')` is midnight UTC and can
    // render as the 19th for anyone behind it.
    const [year, month, day] = session.workoutDate.split('-').map(Number);
    if (year && month && day) {
      return formatDay(new Date(year, month - 1, day));
    }
  }

  return formatDay(session.endedAt ?? session.startedAt);
}

function formatDay(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** e.g. "3 exercises · 9 sets", or "1 exercise · 1 set". */
export function sessionVolumeLabel(
  session: Pick<WorkoutSession, 'exerciseCount' | 'setCount'>,
): string {
  const exercises = `${session.exerciseCount} ${session.exerciseCount === 1 ? 'exercise' : 'exercises'}`;
  const sets = `${session.setCount} ${session.setCount === 1 ? 'set' : 'sets'}`;
  return `${exercises} · ${sets}`;
}

export function sessionDurationLabel(activeDurationSec: number | null): string | null {
  if (!activeDurationSec || activeDurationSec <= 0) return null;

  const totalMinutes = Math.round(activeDurationSec / 60);
  if (totalMinutes < 60) return `${totalMinutes} min`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`;
}

export function isUnfinished(status: SessionStatus): boolean {
  return status === 'in_progress';
}

/** How a session's status reads on screen. */
export function sessionStatusLabel(status: SessionStatus): string {
  switch (status) {
    case 'in_progress':
      return 'In progress';
    case 'completed':
      return 'Completed';
    case 'discarded':
      return 'Discarded';
  }
}

/**
 * The theme colour a status is shown in: the tint pulls the eye to a workout
 * still waiting to be finished, and a discarded one is called out as the
 * exception it is. A completed session is the norm, so it stays quiet.
 */
export function sessionStatusColor(status: SessionStatus): ThemeColor {
  switch (status) {
    case 'in_progress':
      return 'tint';
    case 'completed':
      return 'textSecondary';
    case 'discarded':
      return 'danger';
  }
}

/** `90` → "1:30", `45` → "0:45". */
export function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * How one logged set reads, which depends on the exercise's metric. Weights are
 * stored in pounds (see docs/DATA_MODEL.md) — `units` on the profile is a
 * display preference no screen reads yet.
 */
export function formatSet(set: SetLog, metric: ExerciseMetric): string {
  const parts = metricParts(set, metric);

  // A set stopwatch can accompany any non-duration metric.
  if (metric !== 'duration' && set.timedSetSec) {
    parts.push(formatClock(set.timedSetSec));
  }

  return parts.length > 0 ? parts.join(' · ') : '—';
}

function metricParts(set: SetLog, metric: ExerciseMetric): string[] {
  switch (metric) {
    case 'weight_reps': {
      if (set.weight !== null && set.reps !== null) return [`${set.weight} lb × ${set.reps}`];
      if (set.weight !== null) return [`${set.weight} lb`];
      return set.reps !== null ? [`${set.reps} reps`] : [];
    }
    case 'bodyweight_reps':
      return set.reps !== null ? [`${set.reps} reps`] : [];
    case 'duration':
      return set.durationSec ? [formatClock(set.durationSec)] : [];
    case 'cardio': {
      const parts: string[] = [];
      if (set.durationSec) parts.push(formatClock(set.durationSec));
      if (set.distanceMiles !== null) parts.push(`${set.distanceMiles} mi`);
      if (set.paceMph !== null) parts.push(`${set.paceMph} mph`);
      if (set.inclinePercent !== null) parts.push(`${set.inclinePercent}% incline`);
      if (set.resistanceLevel !== null) parts.push(`L${set.resistanceLevel}`);
      return parts;
    }
  }
}
