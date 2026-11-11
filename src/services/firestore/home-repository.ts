import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { getDb } from '@/services/firebase';
import {
  fromActivityEdit,
  fromNewActivity,
  toActivity,
  toProgressSettings,
  toScheduledWorkout,
} from '@/services/firestore/home-mappers';
import type { Activity, NewActivity } from '@/types/activity';
import type { DatedScheduledWorkout } from '@/types/planner';
import type { ProgressSettings } from '@/types/progress';

// What Home reads beyond sessions and plans — the planner, logged activities
// and the weekly goal — and the few planner writes its catch-up card makes.
// The collection paths, queries and write shapes match the web app's
// `lib/planner-repository.ts`, `lib/activity-repository.ts` and
// `lib/progress-settings-repository.ts`.

type Unsubscribe = () => void;

type Listener<T> = {
  onData: (value: T) => void;
  onError: (error: Error) => void;
};

/**
 * Planner entries dated within an inclusive `YYYY-MM-DD` range, earliest
 * first. Entries with no day yet have a null `dateKey`, which a range never
 * matches, so they are not returned here.
 */
export function subscribeToScheduledWorkouts(
  userId: string,
  startKey: string,
  endKey: string,
  { onData, onError }: Listener<DatedScheduledWorkout[]>,
): Unsubscribe {
  const entries = query(
    collection(getDb(), 'users', userId, 'scheduledWorkouts'),
    where('dateKey', '>=', startKey),
    where('dateKey', '<=', endKey),
  );

  return onSnapshot(
    entries,
    (snapshot) => {
      const dated: DatedScheduledWorkout[] = [];

      for (const document of snapshot.docs) {
        const entry = toScheduledWorkout(document.id, document.data());
        if (entry && entry.dateKey !== null) dated.push({ ...entry, dateKey: entry.dateKey });
      }

      dated.sort(
        (a, b) =>
          a.dateKey.localeCompare(b.dateKey) || a.createdAt.getTime() - b.createdAt.getTime(),
      );
      onData(dated);
    },
    onError,
  );
}

/**
 * Moves planner entries to new days in one batch, so a shuffle is never seen
 * half applied. A null `dateKey` moves an entry to Unscheduled.
 *
 * `status` and `sessionId` are written with every move. Only open plans move,
 * so they are always `planned` and null — and writing them also backfills
 * entries created before those fields existed, which the security rules
 * otherwise reject on update.
 */
export async function moveScheduledWorkouts(
  userId: string,
  moves: readonly { id: string; dateKey: string | null }[],
): Promise<void> {
  if (moves.length === 0) return;

  const db = getDb();
  const batch = writeBatch(db);

  for (const move of moves) {
    batch.update(doc(db, 'users', userId, 'scheduledWorkouts', move.id), {
      dateKey: move.dateKey,
      status: 'planned',
      sessionId: null,
    });
  }

  await batch.commit();
}

/**
 * Marks a planned entry skipped: it leaves the calendar without being deleted,
 * and is never shown as missed. `sessionId` is written as null alongside,
 * which the rules require of anything that is not completed.
 */
export async function skipScheduledWorkout(userId: string, entryId: string): Promise<void> {
  await updateDoc(doc(getDb(), 'users', userId, 'scheduledWorkouts', entryId), {
    status: 'skipped',
    sessionId: null,
  });
}

/** Logged activities, most recent day first, then latest time, then newest. */
export function subscribeToRecentActivities(
  userId: string,
  maxDocs: number,
  { onData, onError }: Listener<Activity[]>,
): Unsubscribe {
  const activities = query(
    collection(getDb(), 'users', userId, 'activities'),
    orderBy('activityDate', 'desc'),
    limit(maxDocs),
  );

  return onSnapshot(
    activities,
    (snapshot) => {
      const mapped = snapshot.docs
        .map((document) => toActivity(document.id, document.data()))
        .filter((activity): activity is Activity => activity !== null);

      mapped.sort(
        (a, b) =>
          b.activityDate.localeCompare(a.activityDate) ||
          (b.activityTime ?? '').localeCompare(a.activityTime ?? '') ||
          b.createdAt.getTime() - a.createdAt.getTime(),
      );
      onData(mapped);
    },
    onError,
  );
}

/**
 * Logs an activity and answers with its id. Rejects when the input is not
 * something that can be logged — an unknown type, or no real day.
 */
export async function logActivity(userId: string, input: NewActivity): Promise<string> {
  const data = fromNewActivity(input, new Date());
  if (!data) throw new Error('That activity could not be logged.');

  const created = await addDoc(collection(getDb(), 'users', userId, 'activities'), data);
  return created.id;
}

/**
 * Saves changes to a logged activity. Rejects when the edit is not something
 * that can be saved, as `logActivity` does.
 */
export async function updateActivity(
  userId: string,
  activityId: string,
  input: NewActivity,
): Promise<void> {
  const patch = fromActivityEdit(input, new Date());
  if (!patch) throw new Error('That activity could not be saved.');

  await updateDoc(doc(getDb(), 'users', userId, 'activities', activityId), patch);
}

/** Deletes a logged activity for good. */
export async function deleteActivity(userId: string, activityId: string): Promise<void> {
  await deleteDoc(doc(getDb(), 'users', userId, 'activities', activityId));
}

/** The lifter's goals, live. Yields the defaults while there is no document. */
export function subscribeToProgressSettings(
  userId: string,
  { onData, onError }: Listener<ProgressSettings>,
): Unsubscribe {
  return onSnapshot(
    doc(getDb(), 'users', userId, 'settings', 'progress'),
    (snapshot) => onData(toProgressSettings(snapshot.data())),
    onError,
  );
}

/** The lifter's goals, read once. The defaults when there is no document yet. */
export async function getProgressSettings(userId: string): Promise<ProgressSettings> {
  const snapshot = await getDoc(doc(getDb(), 'users', userId, 'settings', 'progress'));
  return toProgressSettings(snapshot.data());
}
