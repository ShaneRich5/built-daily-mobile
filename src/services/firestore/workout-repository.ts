import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';

import {
  fromSessionPatch,
  toWorkoutPlan,
  toWorkoutSession,
  type SessionPatch,
} from '@/services/firestore/mappers';
import { getDb } from '@/services/firebase';
import type { WorkoutPlan, WorkoutSession } from '@/types/workout';

const RECENT_SESSION_LIMIT = 30;

type Unsubscribe = () => void;

type Listener<T> = {
  onData: (value: T) => void;
  onError: (error: Error) => void;
};

/**
 * Most recent sessions, newest first. In-progress sessions have a null `endedAt`
 * and Firestore sorts nulls last on a descending order, so they are lifted to the
 * top here — matching how the web app presents them.
 */
export function subscribeToRecentSessions(
  userId: string,
  { onData, onError }: Listener<WorkoutSession[]>,
): Unsubscribe {
  const sessions = query(
    collection(getDb(), 'users', userId, 'sessions'),
    where('status', 'in', ['completed', 'in_progress']),
    orderBy('endedAt', 'desc'),
    limit(RECENT_SESSION_LIMIT),
  );

  return onSnapshot(
    sessions,
    (snapshot) => {
      const mapped = snapshot.docs.map((doc) => toWorkoutSession(doc.id, doc.data()));
      const inProgress = mapped.filter((s) => s.status === 'in_progress');
      const finished = mapped.filter((s) => s.status !== 'in_progress');
      onData([...inProgress, ...finished]);
    },
    onError,
  );
}

/**
 * A single session, live. Fetched by id rather than reused from the list so the
 * screen works on a cold open or deep link, not only after scrolling the list.
 * Yields null when the document does not exist.
 */
export function subscribeToSession(
  userId: string,
  sessionId: string,
  { onData, onError }: Listener<WorkoutSession | null>,
): Unsubscribe {
  return onSnapshot(
    doc(getDb(), 'users', userId, 'sessions', sessionId),
    (snapshot) => {
      const data = snapshot.data();
      onData(data ? toWorkoutSession(snapshot.id, data) : null);
    },
    onError,
  );
}

/** Saved templates, most recently updated first. */
export function subscribeToPlans(
  userId: string,
  { onData, onError }: Listener<WorkoutPlan[]>,
): Unsubscribe {
  const plans = query(
    collection(getDb(), 'users', userId, 'plans'),
    orderBy('updatedAt', 'desc'),
  );

  return onSnapshot(
    plans,
    (snapshot) => onData(snapshot.docs.map((doc) => toWorkoutPlan(doc.id, doc.data()))),
    onError,
  );
}

/**
 * Writes a partial update to one session. Only the fields present in the patch
 * are sent, so two screens editing different parts of the same session do not
 * clobber each other.
 *
 * The open `onSnapshot` from `subscribeToSession` delivers the result, including
 * the local echo, so callers do not need to merge anything themselves.
 */
export async function updateSession(
  userId: string,
  sessionId: string,
  patch: SessionPatch,
): Promise<void> {
  await updateDoc(doc(getDb(), 'users', userId, 'sessions', sessionId), fromSessionPatch(patch));
}
