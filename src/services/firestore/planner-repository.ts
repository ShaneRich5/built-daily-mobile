import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
} from 'firebase/firestore';

import { getDb } from '@/services/firebase';
import { toScheduledWorkout } from '@/services/firestore/home-mappers';
import {
  fromNewScheduledWorkout,
  fromProgressSettings,
  fromWorkoutPlan,
  type NewScheduledWorkout,
} from '@/services/firestore/planner-mappers';
import type { ScheduledWorkout } from '@/types/planner';
import type { ProgressSettings } from '@/types/progress';
import type { WorkoutPlan } from '@/types/workout';

// What the planner, the template editor and onboarding write, plus the
// Unscheduled tray. Paths, queries and shapes match the web app's
// `lib/planner-repository.ts`, `lib/workout-plan-repository.ts` and
// `lib/progress-settings-repository.ts`.
//
// One thing the web does that this does not, yet: after a planner write it
// copies the next seven days of plans onto the lifter's group member docs, so
// groupmates see them. That arrives with Groups; until then, the web refreshes
// it the next time the lifter plans something there.

type Unsubscribe = () => void;

type Listener<T> = {
  onData: (value: T) => void;
  onError: (error: Error) => void;
};

/**
 * Open plans with no day yet — the planner's Unscheduled tray — oldest first.
 * Read with an equality on null, which is why the rules had to allow it.
 */
export function subscribeToUnscheduledWorkouts(
  userId: string,
  { onData, onError }: Listener<ScheduledWorkout[]>,
): Unsubscribe {
  const tray = query(
    collection(getDb(), 'users', userId, 'scheduledWorkouts'),
    where('dateKey', '==', null),
  );

  return onSnapshot(
    tray,
    (snapshot) => {
      const entries = snapshot.docs
        .map((document) => toScheduledWorkout(document.id, document.data()))
        .filter((entry): entry is ScheduledWorkout => entry !== null && entry.status === 'planned');

      entries.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      onData(entries);
    },
    onError,
  );
}

/** Pencils a workout (or a reminder) in on a day, or in Unscheduled. Answers with its id. */
export async function addScheduledWorkout(
  userId: string,
  entry: NewScheduledWorkout,
): Promise<string> {
  const data = fromNewScheduledWorkout(entry, new Date());
  if (!data) throw new Error('That plan could not be saved.');

  const created = await addDoc(collection(getDb(), 'users', userId, 'scheduledWorkouts'), data);
  return created.id;
}

/**
 * Removes a planner entry. An entry linked to a group's plan together is not
 * deleted here: on the web, deleting one also takes the lifter off the plan's
 * going list, which mobile cannot do until Groups exists. Callers should not
 * offer it; this refuses rather than leave the going list wrong.
 */
export async function deleteScheduledWorkout(userId: string, entry: ScheduledWorkout): Promise<void> {
  if (entry.sharedPlanId) {
    throw new Error('Leave a group plan from the website for now.');
  }

  await deleteDoc(doc(getDb(), 'users', userId, 'scheduledWorkouts', entry.id));
}

/** Saves a new template and answers with its id. Rejects one the rules would refuse. */
export async function createPlan(userId: string, plan: Omit<WorkoutPlan, 'id'>): Promise<string> {
  const data = fromWorkoutPlan(plan);
  if (!data) throw new Error('A template needs a name and at least one exercise.');

  const created = await addDoc(collection(getDb(), 'users', userId, 'plans'), data);
  return created.id;
}

/**
 * Saves an existing template whole. The rules check every field on update,
 * so it is written in full rather than patched.
 */
export async function updatePlan(userId: string, plan: WorkoutPlan): Promise<void> {
  const { id, ...rest } = plan;
  const data = fromWorkoutPlan(rest);
  if (!data) throw new Error('A template needs a name and at least one exercise.');

  await setDoc(doc(getDb(), 'users', userId, 'plans', id), data);
}

/**
 * Deletes a template. Workouts started from it keep their own copy of its
 * exercises, and planner entries keep their exercise ids, so neither breaks.
 */
export async function deletePlan(userId: string, planId: string): Promise<void> {
  await deleteDoc(doc(getDb(), 'users', userId, 'plans', planId));
}

/** Saves the lifter's goals. The whole document is written; see `fromProgressSettings`. */
export async function saveProgressSettings(
  userId: string,
  settings: ProgressSettings,
): Promise<void> {
  await setDoc(
    doc(getDb(), 'users', userId, 'settings', 'progress'),
    fromProgressSettings(settings, new Date()),
    { merge: true },
  );
}
