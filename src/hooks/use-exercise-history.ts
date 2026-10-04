import { useEffect, useMemo, useState } from 'react';

import { useSession } from '@/contexts/session';
import { lastPerformanceByExercise, type ExercisePerformance } from '@/lib/exercise-history';
import { subscribeToRecentSessions } from '@/services/firestore/workout-repository';
import type { WorkoutSession } from '@/types/workout';

/** Tagged with the uid it belongs to, so a previous user's history is never read. */
type Loaded = {
  uid: string;
  sessions: WorkoutSession[];
};

/** Stable identity, so the memo below does not recompute on every render. */
const NO_SESSIONS: WorkoutSession[] = [];

/**
 * What each exercise looked like last time, keyed by `exerciseId`.
 *
 * Reads the same recent workouts the home list does, deliberately: an
 * identical query is served from the cache Firestore already holds for it,
 * rather than costing a second read of the same documents. The window is
 * therefore whatever the home list covers — enough to answer "what did I lift
 * last time" for anything in a current routine.
 *
 * A failure here is silent. This is a hint next to an input, not the input:
 * losing it should cost the lifter a convenience, not the ability to log.
 */
export function useExerciseHistory(
  excludeSessionId?: string,
): Map<string, ExercisePerformance> {
  const { user } = useSession();
  const uid = user?.uid;
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!uid) return;

    return subscribeToRecentSessions(uid, {
      onData: (sessions) => setLoaded({ uid, sessions }),
      onError: () => setLoaded({ uid, sessions: [] }),
    });
  }, [uid]);

  // Derived rather than cleared in the effect, as in `useRecentSessions`: no
  // second render pass, and no window where the previous user's workouts are
  // still the ones being read.
  const sessions = loaded && loaded.uid === uid ? loaded.sessions : NO_SESSIONS;

  return useMemo(
    () => lastPerformanceByExercise(sessions, excludeSessionId),
    [sessions, excludeSessionId],
  );
}
