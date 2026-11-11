import { addDays, startOfWeek } from '@/lib/date-keys';
import { sessionDayKey, workoutsByDay } from '@/lib/workout-days';
import type { Activity } from '@/types/activity';
import type { WorkoutSession } from '@/types/workout';

/**
 * What the Progress screen works out from the lifter's history: best lifts,
 * milestones and active days. Ported from the web app's
 * `lib/progress-insights.ts` and `lib/movement-insights.ts`, so a record or a
 * milestone means the same thing on both.
 */

export type PersonalRecord = {
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  estimated1Rm: number;
  dateKey: string;
  sessionId: string;
};

export type Milestone = {
  id: string;
  title: string;
  description: string;
  achieved: boolean;
};

/** Epley's estimate of a one-rep max, to a tenth of a pound. */
export function estimatedOneRepMax(weight: number, reps: number): number {
  if (!(weight > 0) || !(reps > 0)) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

/** Completed workouts, oldest first — the order records are set in. */
function chronological(sessions: readonly WorkoutSession[]): WorkoutSession[] {
  return sessions
    .filter((session) => session.status === 'completed')
    .sort(
      (a, b) =>
        sessionDayKey(a).localeCompare(sessionDayKey(b)) ||
        a.startedAt.getTime() - b.startedAt.getTime(),
    );
}

/**
 * Walks the history in order, calling back with each set that beat the best
 * estimated one-rep max so far for its exercise. Only weighted sets count.
 */
function walkRecords(
  sessions: readonly WorkoutSession[],
  onRecord: (record: PersonalRecord) => void,
): Map<string, PersonalRecord> {
  const best = new Map<string, PersonalRecord>();

  for (const session of chronological(sessions)) {
    const dateKey = sessionDayKey(session);

    for (const line of session.lines) {
      if (line.metric !== 'weight_reps') continue;

      for (const set of line.sets) {
        if (set.weight === null || set.reps === null) continue;

        const estimated1Rm = estimatedOneRepMax(set.weight, set.reps);
        if (estimated1Rm <= 0) continue;

        const previous = best.get(line.exerciseId);
        if (previous && estimated1Rm <= previous.estimated1Rm) continue;

        const record: PersonalRecord = {
          exerciseId: line.exerciseId,
          exerciseName: line.nameSnapshot,
          weight: set.weight,
          reps: set.reps,
          estimated1Rm,
          dateKey,
          sessionId: session.id,
        };
        best.set(line.exerciseId, record);
        onRecord(record);
      }
    }
  }

  return best;
}

/** The best set ever logged for each exercise, by estimated one-rep max. */
export function bestLifts(sessions: readonly WorkoutSession[]): Map<string, PersonalRecord> {
  return walkRecords(sessions, () => {});
}

/** The day the first record was set, or null when there are none. */
export function firstRecordDateKey(sessions: readonly WorkoutSession[]): string | null {
  let first: string | null = null;
  walkRecords(sessions, (record) => {
    first ??= record.dateKey;
  });
  return first;
}

/**
 * The records one workout set, by exercise: for each, its best set that beat
 * everything logged before it. A first-ever weighted set counts — the first
 * time is a record too.
 */
export function sessionRecords(
  sessions: readonly WorkoutSession[],
  sessionId: string,
): Map<string, PersonalRecord> {
  const set = new Map<string, PersonalRecord>();
  walkRecords(sessions, (record) => {
    if (record.sessionId === sessionId) set.set(record.exerciseId, record);
  });
  return set;
}

/** The big lifts the strength card prefers, in this order. */
const COMPOUND_IDS = ['bench', 'squat', 'deadlift', 'ohp', 'row'];
const STRENGTH_CARD_SIZE = 4;

/** Up to four best lifts: the big compound ones first, then whatever is strongest. */
export function strongestLifts(best: ReadonlyMap<string, PersonalRecord>): PersonalRecord[] {
  const preferred = COMPOUND_IDS.flatMap((id) => {
    const record = best.get(id);
    return record ? [record] : [];
  });

  const rest = [...best.values()]
    .filter((record) => !COMPOUND_IDS.includes(record.exerciseId))
    .sort((a, b) => b.estimated1Rm - a.estimated1Rm);

  return [...preferred, ...rest].slice(0, STRENGTH_CARD_SIZE);
}

/** Days this week with a workout or an activity, against the active-days goal. */
export function activeDaysThisWeek(
  sessions: readonly WorkoutSession[],
  activities: readonly Activity[],
  todayKey: string,
): number {
  const days = new Set<string>(workoutsByDay(sessions).keys());
  for (const activity of activities) days.add(activity.activityDate);

  const start = startOfWeek(todayKey);
  let count = 0;
  for (let i = 0; i < 7; i++) if (days.has(addDays(start, i))) count += 1;
  return count;
}

/**
 * The milestones, earned or not, in the order they are reached. Everything is
 * worked out from the history given. On mobile that is the most recent
 * workouts the app reads (160), so the counts are right up to there, but "1
 * year active" is measured from the oldest of those: someone with more than
 * 160 workouts in their first year sees it later than the web shows it.
 */
export function computeMilestones({
  sessions,
  streak,
  longestStreak,
  firstRecord,
  todayKey,
}: {
  sessions: readonly WorkoutSession[];
  streak: number;
  longestStreak: number;
  firstRecord: string | null;
  todayKey: string;
}): Milestone[] {
  const completed = chronological(sessions);
  const count = completed.length;
  const firstKey = completed[0] ? sessionDayKey(completed[0]) : null;
  const bestRun = Math.max(streak, longestStreak);

  const yearOn = firstKey ? `${Number(firstKey.slice(0, 4)) + 1}${firstKey.slice(4)}` : null;

  return [
    { id: 'first-workout', title: 'First workout', description: 'You showed up and logged a session.', achieved: count >= 1 },
    { id: 'workouts-10', title: '10 workouts', description: 'A solid start to the habit.', achieved: count >= 10 },
    { id: 'workouts-50', title: '50 workouts', description: 'Consistency is compounding.', achieved: count >= 50 },
    { id: 'workouts-100', title: '100 workouts', description: 'A hundred sessions in the journal.', achieved: count >= 100 },
    { id: 'first-pr', title: 'First personal record', description: 'A new best estimated strength mark.', achieved: firstRecord !== null },
    { id: 'goal-weeks-4', title: '4-week goal streak', description: 'Four weeks in a row hitting your weekly goal.', achieved: bestRun >= 4 },
    { id: 'goal-weeks-12', title: '12-week goal streak', description: 'A full season of meeting your weekly goal.', achieved: bestRun >= 12 },
    { id: 'goal-weeks-30', title: '30 consecutive weeks', description: 'Meeting your weekly goal for 30 weeks.', achieved: bestRun >= 30 },
    { id: 'year-active', title: '1 year active', description: 'A year since your first logged workout.', achieved: yearOn !== null && todayKey >= yearOn },
  ];
}
