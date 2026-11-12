import { isLoggedSet } from '@/lib/exercise-history';
import { muscleActivation } from '@/lib/muscle-activation';
import { muscleLabel } from '@/lib/muscle-map';
import { setSummary } from '@/lib/session/session-model';
import type { SessionLine, WorkoutSession } from '@/types/workout';

/** How a finished workout reads back: the figures and lines of its summary. */

/** Sets that recorded something. An empty row someone left behind is not a set done. */
export function loggedSetCount(lines: readonly SessionLine[]): number {
  return lines.reduce((total, line) => total + line.sets.filter(isLoggedSet).length, 0);
}

/** Weight × reps, summed over every set that has both. Pounds, as logged. */
export function sessionVolumeLbs(lines: readonly SessionLine[]): number {
  let total = 0;

  for (const line of lines) {
    for (const set of line.sets) {
      if (set.weight !== null && set.reps !== null && set.weight > 0 && set.reps > 0) {
        total += set.weight * set.reps;
      }
    }
  }

  return Math.round(total);
}

/** "12,450" — thousands grouped, so a five-digit volume reads at a glance. */
export function formatCount(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export type SummaryStat = { value: string; label: string };

/**
 * The row of figures at the top of a finished workout. Volume only appears
 * when there is some: a bodyweight or cardio session has none, and "0 lb" would
 * read as a failure rather than as not applicable.
 */
export function summaryStats(session: Pick<WorkoutSession, 'lines'>): SummaryStat[] {
  const sets = loggedSetCount(session.lines);
  const volume = sessionVolumeLbs(session.lines);

  return [
    { value: String(session.lines.length), label: session.lines.length === 1 ? 'Exercise' : 'Exercises' },
    { value: String(sets), label: sets === 1 ? 'Set' : 'Sets' },
    ...(volume > 0 ? [{ value: formatCount(volume), label: 'lb moved' }] : []),
  ];
}

/** The muscles a workout leaned on hardest, strongest first: "Chest · Shoulders · Triceps". */
export function musclesWorkedLabel(lines: readonly SessionLine[], limit = 3): string {
  return muscleActivation(lines)
    .slice(0, limit)
    .map(({ slug }) => muscleLabel(slug))
    .join(' · ');
}

/** One exercise's logged sets as chips: the set's number as done, and what it was. */
export function setChips(line: SessionLine): { number: number; text: string; note: string | null }[] {
  return line.sets
    .map((set, index) => ({ number: index + 1, text: setSummary(set), note: set.note }))
    .filter((chip) => chip.text !== '');
}

/** `18:10` → "6:10 PM". Anything that is not a time is handed back as it came. */
export function timeLabel(time: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return time;

  const hours = Number(match[1]);
  if (hours > 23 || Number(match[2]) > 59) return time;

  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${match[2]} ${hours < 12 ? 'AM' : 'PM'}`;
}
