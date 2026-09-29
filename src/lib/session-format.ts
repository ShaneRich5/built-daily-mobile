import type { SessionStatus, WorkoutSession } from '@/types/workout';

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
