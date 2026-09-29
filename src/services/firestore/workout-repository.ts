import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';

import { toWorkoutPlan, toWorkoutSession } from '@/services/firestore/mappers';
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
