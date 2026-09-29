import { useEffect, useState } from 'react';

import { useSession } from '@/contexts/session';
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
      onError: (error) => setResult({ uid, sessions: [], error: describeReadError(error) }),
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

function describeReadError(error: Error): string {
  // A missing composite index needs a developer, not a retry, so it is worth
  // surfacing distinctly instead of a generic failure message.
  if (error.message.includes('index')) {
    return 'This query needs a Firestore index. Check the dev server logs for the link that creates it.';
  }
  if ('code' in error && error.code === 'permission-denied') {
    return 'You do not have access to this data.';
  }
  return 'Could not load your workouts.';
}
