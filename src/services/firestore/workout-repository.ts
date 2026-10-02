import {
  addDoc,
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
  fromNewSession,
  fromSessionPatch,
  toWorkoutPlan,
  toWorkoutSession,
  type SessionPatch,
} from '@/services/firestore/mappers';
import { getDb } from '@/services/firebase';
import { orderRecentSessions } from '@/lib/session-list';
import type { WorkoutPlan, WorkoutSession } from '@/types/workout';

const RECENT_SESSION_LIMIT = 30;

/**
 * Unfinished workouts are read without an `orderBy`, so none is excluded for
 * missing a field, which means Firestore returns an arbitrary subset once the
 * limit bites. A lifter has one workout open, occasionally a few abandoned
 * ones; this is far above that, and `orderRecentSessions` sorts them.
 */
const IN_PROGRESS_LIMIT = 20;

type Unsubscribe = () => void;

type Listener<T> = {
  onData: (value: T) => void;
  onError: (error: Error) => void;
};

/**
 * The recent workouts: the ones still in progress, and the most recent
 * completed ones, newest first.
 *
 * Two queries rather than one. Ordering a combined query by `endedAt` puts the
 * in-progress sessions — whose `endedAt` is null — last, where the limit cuts
 * them off entirely for anyone with a page's worth of finished workouts, and
 * silently drops any document that has no `endedAt` field at all. Splitting
 * them means the workout a lifter is in the middle of is never the one that
 * falls off the end.
 *
 * Both listeners feed one `onData`, which fires once both have reported, so
 * the list never paints half of itself.
 */
export function subscribeToRecentSessions(
  userId: string,
  { onData, onError }: Listener<WorkoutSession[]>,
): Unsubscribe {
  const sessions = collection(getDb(), 'users', userId, 'sessions');

  let inProgress: WorkoutSession[] | null = null;
  let completed: WorkoutSession[] | null = null;

  const emit = () => {
    if (inProgress === null || completed === null) return;
    onData(orderRecentSessions(inProgress, completed));
  };

  const unsubscribeInProgress = onSnapshot(
    query(sessions, where('status', '==', 'in_progress'), limit(IN_PROGRESS_LIMIT)),
    (snapshot) => {
      inProgress = snapshot.docs.map((doc) => toWorkoutSession(doc.id, doc.data()));
      emit();
    },
    onError,
  );

  const unsubscribeCompleted = onSnapshot(
    query(
      sessions,
      where('status', '==', 'completed'),
      orderBy('endedAt', 'desc'),
      limit(RECENT_SESSION_LIMIT),
    ),
    (snapshot) => {
      completed = snapshot.docs.map((doc) => toWorkoutSession(doc.id, doc.data()));
      emit();
    },
    onError,
  );

  return () => {
    unsubscribeInProgress();
    unsubscribeCompleted();
  };
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
 * Starts a workout, and answers with the id Firestore gave it so the caller can
 * navigate straight into the session it just created.
 *
 * The id comes from Firestore rather than the client: the document is the only
 * thing that needs one, and letting the server mint it keeps this the same
 * `users/{uid}/sessions/{autoId}` shape the web app writes.
 */
export async function createSession(
  userId: string,
  session: Omit<WorkoutSession, 'id'>,
): Promise<string> {
  const created = await addDoc(
    collection(getDb(), 'users', userId, 'sessions'),
    fromNewSession(session),
  );

  return created.id;
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
