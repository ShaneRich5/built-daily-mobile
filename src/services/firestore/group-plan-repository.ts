import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';

import { displayNameFromAuth } from '@/lib/user-profile';
import { getDb } from '@/services/firebase';
import { fromNewSharedPlan, toSharedPlan } from '@/services/firestore/group-mappers';
import {
  addScheduledWorkout,
  deleteEntriesForSharedPlan,
  findEntriesForSharedPlan,
  removeSelfFromSharedPlan,
} from '@/services/firestore/planner-repository';
import { type GroupUser, syncGroups } from '@/services/group-sync';
import { SHARED_PLAN_LIMITS, type SharedPlan, type SharedPlanExercise } from '@/types/group';

// Plans together: `groups/{groupId}/plans/{planId}`. Ported from the web's
// `lib/group-plan-repository.ts`. Saying "I'm in" puts the lifter on the
// going list and a linked entry on their own planner (`sharedPlanId` +
// `groupId`); "Can't make it" undoes both. The rules let each lifter add or
// remove only their own uid.

type Unsubscribe = () => void;

type Listener<T> = {
  onData: (value: T) => void;
  onError: (error: Error) => void;
};

export class PlanError extends Error {
  override name = 'GroupError';
}

const bySoonest = (a: SharedPlan, b: SharedPlan) =>
  a.dateKey.localeCompare(b.dateKey) || (a.time ?? '99').localeCompare(b.time ?? '99');

/** A group's plans together in an inclusive day range, soonest first. */
export function subscribeToGroupPlans(
  groupId: string,
  startKey: string,
  endKey: string,
  { onData, onError }: Listener<SharedPlan[]>,
): Unsubscribe {
  return onSnapshot(
    query(collection(getDb(), 'groups', groupId, 'plans'), where('dateKey', '>=', startKey), where('dateKey', '<=', endKey)),
    (snapshot) =>
      onData(
        snapshot.docs
          .map((document) => toSharedPlan(document.id, document.data()))
          .filter((plan): plan is SharedPlan => plan !== null)
          .sort(bySoonest),
      ),
    onError,
  );
}

/** One plan together, live. Null once it is cancelled. */
export function subscribeToSharedPlan(
  groupId: string,
  planId: string,
  { onData, onError }: Listener<SharedPlan | null>,
): Unsubscribe {
  return onSnapshot(
    doc(getDb(), 'groups', groupId, 'plans', planId),
    (snapshot) => onData(toSharedPlan(snapshot.id, snapshot.data())),
    onError,
  );
}

/** Catalog ids only: someone else's custom exercise cannot be rebuilt from its id. */
export function startableExerciseIds(exercises: readonly SharedPlanExercise[]): string[] {
  return exercises.map((exercise) => exercise.id).filter((id) => !id.startsWith('custom-'));
}

export type NewSharedPlan = {
  groupIds: string[];
  dateKey: string;
  time: string | null;
  where: string | null;
  note: string | null;
  label: string;
  exercises: SharedPlanExercise[];
};

/**
 * Creates the plan in each chosen group with the lifter going, and puts one
 * entry on their planner, linked to the first group's. Answers with that one.
 */
export async function createSharedPlan(user: GroupUser, input: NewSharedPlan): Promise<{ groupId: string; planId: string }> {
  const now = new Date();
  let first: { groupId: string; planId: string } | null = null;

  for (const groupId of input.groupIds) {
    const data = fromNewSharedPlan({
      groupId,
      dateKey: input.dateKey,
      time: input.time,
      where: input.where,
      label: input.label,
      exercises: input.exercises,
      note: input.note,
      createdBy: user.uid,
      createdByName: displayNameFromAuth(user),
      going: [user.uid],
      goingAt: { [user.uid]: now },
      createdAt: now,
    });
    if (!data) throw new PlanError('That plan is missing a workout name or a day.');

    const created = await addDoc(collection(getDb(), 'groups', groupId, 'plans'), data);
    first ??= { groupId, planId: created.id };
  }
  if (!first) throw new PlanError('Pick a group to share it with.');

  await addScheduledWorkout(user.uid, {
    dateKey: input.dateKey,
    label: input.label.trim().slice(0, SHARED_PLAN_LIMITS.label),
    planId: null,
    exerciseIds: startableExerciseIds(input.exercises),
    sharedPlanId: first.planId,
    groupId: first.groupId,
  });
  syncGroups(user);
  return first;
}

/** "I'm in": onto the going list, then onto the lifter's planner (once). */
export async function joinSharedPlan(user: GroupUser, groupId: string, planId: string): Promise<void> {
  const ref = doc(getDb(), 'groups', groupId, 'plans', planId);
  const plan = toSharedPlan(planId, (await getDoc(ref)).data());
  if (!plan) throw new PlanError('That plan isn’t there anymore.');

  if (!plan.going.includes(user.uid)) {
    if (plan.going.length >= SHARED_PLAN_LIMITS.going) throw new PlanError('That plan is full.');
    await updateDoc(ref, { going: arrayUnion(user.uid), [`goingAt.${user.uid}`]: new Date() });
  }

  if ((await findEntriesForSharedPlan(user.uid, planId)).length === 0) {
    await addScheduledWorkout(user.uid, {
      dateKey: plan.dateKey,
      label: plan.label,
      planId: null,
      exerciseIds: startableExerciseIds(plan.exercises),
      sharedPlanId: planId,
      groupId,
    });
  }
  syncGroups(user);
}

/** "Can't make it": off the going list and off the lifter's planner. */
export async function leaveSharedPlan(user: GroupUser, groupId: string, planId: string): Promise<void> {
  await removeSelfFromSharedPlan(user.uid, groupId, planId);
  await deleteEntriesForSharedPlan(user.uid, planId);
  syncGroups(user);
}

/** Cancels a plan together. Its creator only (the rules check). Others' planner entries stay theirs. */
export async function cancelSharedPlan(user: GroupUser, groupId: string, planId: string): Promise<void> {
  await deleteDoc(doc(getDb(), 'groups', groupId, 'plans', planId));
  await deleteEntriesForSharedPlan(user.uid, planId);
  syncGroups(user);
}
