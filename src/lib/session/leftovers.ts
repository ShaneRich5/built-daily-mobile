import { shortDayLabel } from '@/lib/date-keys';
import { exerciseProgress, type SessionExercise } from '@/lib/session/session-model';

// Leftovers: the exercises not got to by Finish. Each goes to the next
// planned day for this template, to Unscheduled, or away. Ported from the web
// app's `features/workout-session/leftovers.ts`; the planner writes live in
// `planner-repository.ts`.

export type LeftoverChoice = 'next' | 'later' | 'drop';

/** The next open planned day for the template this workout came from. */
export type NextPlannedDay = { entryId: string; label: string; dateKey: string };

/** What Finish writes to the planner. */
export type LeftoverPlan = {
  next: NextPlannedDay | null;
  /** Exercise ids added to `next`. */
  nextIds: string[];
  /** Exercise ids for one new Unscheduled entry. */
  laterIds: string[];
  laterLabel: string;
};

/** Exercises with nothing logged, plan and maybe alike, in workout order. */
export function untouchedExercises(exercises: readonly SessionExercise[]): SessionExercise[] {
  return exercises.filter((item) => exerciseProgress(item.sets) === 'not_started');
}

/** Maybes default to Drop (never missed). Plan exercises carry over: next time if there is one. */
export function defaultLeftoverChoice(item: SessionExercise, hasNext: boolean): LeftoverChoice {
  if (item.section === 'maybe') return 'drop';
  return hasNext ? 'next' : 'later';
}

export function defaultLeftoverChoices(
  items: readonly SessionExercise[],
  hasNext: boolean,
): Record<string, LeftoverChoice> {
  return Object.fromEntries(
    items.map((item) => [item.lineId, defaultLeftoverChoice(item, hasNext)]),
  );
}

export function buildLeftoverPlan(
  items: readonly SessionExercise[],
  choices: Record<string, LeftoverChoice>,
  next: NextPlannedDay | null,
  workoutTitle: string,
): LeftoverPlan {
  const idsFor = (choice: LeftoverChoice) =>
    items.filter((item) => choices[item.lineId] === choice).map((item) => item.exercise.id);

  return {
    next,
    nextIds: next ? idsFor('next') : [],
    laterIds: idsFor('later'),
    laterLabel: `Leftovers from ${workoutTitle}`,
  };
}

/** The line under the choices, naming where each option sends things. */
export function leftoverHelpText(next: NextPlannedDay | null): string {
  const nextPart = next
    ? `Next time adds it to ${next.label} on ${shortDayLabel(next.dateKey)}. `
    : '';
  return `${nextPart}Later puts it in Unscheduled. Maybes default to Drop, and dropping is never counted as missed.`;
}

/** "3 exercises · 11 sets" */
export function doneSummary(exerciseCount: number, setCount: number): string {
  return `${exerciseCount} ${exerciseCount === 1 ? 'exercise' : 'exercises'} · ${setCount} ${setCount === 1 ? 'set' : 'sets'}`;
}

/** Exercise ids an open entry should end up with: what it has, then new ones, at most 40. */
export function mergeExerciseIds(current: readonly string[], added: readonly string[]): string[] {
  return [...current, ...added.filter((id) => !current.includes(id))].slice(0, 40);
}
