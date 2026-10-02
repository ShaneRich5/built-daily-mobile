import { useEffect, useState } from 'react';

import { useSession } from '@/contexts/session';
import { describeReadError } from '@/lib/read-error';
import { subscribeToPlans } from '@/services/firestore/workout-repository';
import type { WorkoutPlan } from '@/types/workout';

type State = {
  plans: WorkoutPlan[];
  isLoading: boolean;
  error: string | null;
};

/** Tagged with the uid it belongs to, so a previous user's data is never shown. */
type Result = {
  uid: string;
  plans: WorkoutPlan[];
  error: string | null;
};

export function usePlans(): State {
  const { user } = useSession();
  const uid = user?.uid;
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!uid) return;

    return subscribeToPlans(uid, {
      onData: (plans) => setResult({ uid, plans, error: null }),
      onError: (error) =>
        setResult({ uid, plans: [], error: describeReadError(error, 'Could not load your plans.') }),
    });
  }, [uid]);

  // Derived rather than assigned in the effect, for the same reasons as
  // `useRecentSessions`: no second render pass, and no window in which the
  // previous user's plans are on screen.
  if (!uid) {
    return { plans: [], isLoading: false, error: null };
  }

  if (result?.uid !== uid) {
    return { plans: [], isLoading: true, error: null };
  }

  return { plans: result.plans, isLoading: false, error: result.error };
}
