import {
  addDoc,
  arrayRemove,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { type LeftoverPlan, mergeExerciseIds, type NextPlannedDay } from '@/lib/session/leftovers';
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
 * Removes a planner entry. One linked to a group's plan together also takes
 * the lifter off that plan's going list, as on the web, so the group does not
 * keep counting them in.
 */
export async function deleteScheduledWorkout(userId: string, entry: ScheduledWorkout): Promise<void> {
  if (entry.sharedPlanId && entry.groupId) {
    await removeSelfFromSharedPlan(userId, entry.groupId, entry.sharedPlanId);
  }

  await deleteDoc(doc(getDb(), 'users', userId, 'scheduledWorkouts', entry.id));
}

/**
 * The next open planned day for a template, strictly after `afterDateKey`.
 * One equality query filtered in memory, so it needs no composite index — the
 * same read as the web's `findNextPlannedForPlan`.
 */
export async function findNextPlannedForPlan(
  userId: string,
  planId: string,
  afterDateKey: string,
): Promise<NextPlannedDay | null> {
  const entries = await getDocs(
    query(collection(getDb(), 'users', userId, 'scheduledWorkouts'), where('planId', '==', planId)),
  );

  let next: NextPlannedDay | null = null;
  for (const document of entries.docs) {
    const entry = toScheduledWorkout(document.id, document.data());
    if (!entry || entry.status !== 'planned' || !entry.dateKey || entry.dateKey <= afterDateKey) continue;
    if (!next || entry.dateKey < next.dateKey) next = { entryId: entry.id, label: entry.label, dateKey: entry.dateKey };
  }
  return next;
}

/** Adds exercises to an open planner entry, skipping ones it already has (at most 40). */
export async function appendExercisesToScheduledWorkout(
  userId: string,
  entryId: string,
  exerciseIds: readonly string[],
): Promise<void> {
  const ref = doc(getDb(), 'users', userId, 'scheduledWorkouts', entryId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return;

  const stored = snapshot.data().exerciseIds;
  const current = Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string') : [];
  // status and sessionId backfill entries made before those fields existed; the rules need them.
  await updateDoc(ref, { exerciseIds: mergeExerciseIds(current, exerciseIds), status: 'planned', sessionId: null });
}

/**
 * Where Finish sends the leftovers: some onto the next planned day, the rest
 * into one Unscheduled entry. Each write stands alone, so one failing does not
 * stop the other.
 */
export async function saveLeftoverPlan(userId: string, plan: LeftoverPlan): Promise<void> {
  const writes: Promise<unknown>[] = [];
  if (plan.next && plan.nextIds.length > 0) {
    writes.push(appendExercisesToScheduledWorkout(userId, plan.next.entryId, plan.nextIds));
  }
  if (plan.laterIds.length > 0) {
    writes.push(
      addScheduledWorkout(userId, { dateKey: null, label: plan.laterLabel, planId: null, exerciseIds: plan.laterIds }),
    );
  }
  await Promise.allSettled(writes);
}

/** The lifter's planner entries linked to one plan together. */
export async function findEntriesForSharedPlan(userId: string, sharedPlanId: string): Promise<string[]> {
  const entries = await getDocs(
    query(collection(getDb(), 'users', userId, 'scheduledWorkouts'), where('sharedPlanId', '==', sharedPlanId)),
  );
  return entries.docs.map((entry) => entry.id);
}

/** Deletes the planner entries linked to a plan together. Leaves its going list alone. */
export async function deleteEntriesForSharedPlan(userId: string, sharedPlanId: string): Promise<void> {
  const ids = await findEntriesForSharedPlan(userId, sharedPlanId);
  if (ids.length === 0) return;

  const batch = writeBatch(getDb());
  for (const id of ids) batch.delete(doc(getDb(), 'users', userId, 'scheduledWorkouts', id));
  await batch.commit();
}

/** Off a plan together's going list. Best-effort: the plan may be gone, or they already left. */
export async function removeSelfFromSharedPlan(userId: string, groupId: string, planId: string): Promise<void> {
  try {
    await updateDoc(doc(getDb(), 'groups', groupId, 'plans', planId), {
      going: arrayRemove(userId),
      [`goingAt.${userId}`]: deleteField(),
    });
  } catch {
    // Nothing to undo.
  }
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
