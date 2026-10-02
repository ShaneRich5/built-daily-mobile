import { useEffect, useState } from 'react';

import { useSession } from '@/contexts/session';
import { describeReadError } from '@/lib/read-error';
import { subscribeToRecentSessions } from '@/services/firestore/workout-repository';
import type { WorkoutSession } from '@/types/workout';

type State = {
  sessions: WorkoutSession[];
  isLoading: boolean;
  error: string | null;
};

/** Tagged with the uid it belongs to, so a previous user's data is never shown. */
type Result = {
  uid: string;
  sessions: WorkoutSession[];
  error: string | null;
};

export function useRecentSessions(): State {
  const { user } = useSession();
  const uid = user?.uid;
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!uid) return;

    return subscribeToRecentSessions(uid, {
      onData: (sessions) => setResult({ uid, sessions, error: null }),
      onError: (error) =>
        setResult({
          uid,
          sessions: [],
          error: describeReadError(error, 'Could not load your workouts.'),
        }),
    });
  }, [uid]);

  // Derived rather than assigned in the effect: setting state in an effect body
  // triggers a second render pass, and deriving also covers the window after a
  // user switch where `result` still holds the previous user's data.
  if (!uid) {
    return { sessions: [], isLoading: false, error: null };
  }

  if (result?.uid !== uid) {
    return { sessions: [], isLoading: true, error: null };
  }

  return { sessions: result.sessions, isLoading: false, error: result.error };
}
