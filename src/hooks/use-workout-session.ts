import { useEffect, useState } from 'react';

import { useSession } from '@/contexts/session';
import { subscribeToSession } from '@/services/firestore/workout-repository';
import type { WorkoutSession } from '@/types/workout';

type Result = {
  key: string;
  session: WorkoutSession | null;
  error: string | null;
};

type State = {
  session: WorkoutSession | null;
  isLoading: boolean;
  /** True once the read succeeded and the document was not there. */
  notFound: boolean;
  error: string | null;
};

export function useWorkoutSession(sessionId: string | undefined): State {
  const { user } = useSession();
  const uid = user?.uid;
  const key = uid && sessionId ? `${uid}/${sessionId}` : undefined;
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!uid || !sessionId || !key) return;

    return subscribeToSession(uid, sessionId, {
      onData: (session) => setResult({ key, session, error: null }),
      onError: () =>
        setResult({ key, session: null, error: 'Could not load this workout.' }),
    });
  }, [uid, sessionId, key]);

  // Derived, so a result for a previously viewed session is never shown for this one.
  if (!key) {
    return { session: null, isLoading: false, notFound: false, error: null };
  }

  if (result?.key !== key) {
    return { session: null, isLoading: true, notFound: false, error: null };
  }

  return {
    session: result.session,
    isLoading: false,
    notFound: result.error === null && result.session === null,
    error: result.error,
  };
}
