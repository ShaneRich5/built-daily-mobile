import { useEffect, useState } from 'react';

import { useSession } from '@/contexts/session';
import { subscribeToRecentSessions } from '@/services/firestore/workout-repository';
import type { WorkoutSession } from '@/types/workout';

/** Tagged with the uid it belongs to, so a previous user's history is never read. */
type Loaded = {
  uid: string;
  sessions: WorkoutSession[];
};

/** Stable identity while nothing has loaded, so dependents do not recompute. */
const NO_SESSIONS: WorkoutSession[] = [];

type State = {
  /** Completed workouts, newest first, without the one on screen. */
  sessions: WorkoutSession[];
  isLoading: boolean;
};

/**
 * The lifter's recent finished workouts — what "last time", "previous
 * sessions" and "usually next" are all worked out from.
 *
 * Reads the same recent workouts the home list does, deliberately: an
 * identical query is served from the cache Firestore already holds for it,
 * rather than costing a second read of the same documents. The window is
 * therefore whatever the home list covers — enough to answer "what did I lift
 * last time" for anything in a current routine.
 *
 * A failure here is silent. These are hints beside an input, not the input:
 * losing them should cost the lifter a convenience, not the ability to log.
 */
export function useWorkoutHistory(excludeSessionId?: string): State {
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
  if (!loaded || loaded.uid !== uid) return { sessions: NO_SESSIONS, isLoading: Boolean(uid) };

  return {
    // The list arrives newest first; in-progress ones are not history yet.
    sessions: loaded.sessions.filter(
      (session) => session.status === 'completed' && session.id !== excludeSessionId,
    ),
    isLoading: false,
  };
}
