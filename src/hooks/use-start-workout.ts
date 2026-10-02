import { router } from 'expo-router';
import { useCallback, useState } from 'react';

import { useSession } from '@/contexts/session';
import { blankSession, sessionFromPlan } from '@/lib/session-start';
import { createSession } from '@/services/firestore/workout-repository';
import { newLineId } from '@/services/ids';
import type { WorkoutPlan } from '@/types/workout';

type State = {
  /** Starts an empty workout, or one built from a saved plan. */
  start: (plan?: WorkoutPlan) => Promise<void>;
  isStarting: boolean;
  /**
   * The plan currently being started, if it came from one. A list of plans
   * shares one of these hooks, so it needs to know which row to spin — not
   * merely that something is in flight.
   */
  startingPlanId: string | null;
  error: string | null;
};

/**
 * Starting a workout and going straight to logging it.
 *
 * The session is written before the lifter types anything, which is what makes
 * it safe to log set by set: everything after this is an update to a document
 * that already exists, so a workout cannot be lost because the app was closed
 * before a save. It is also why the workout appears in the history, as "in
 * progress", from the first moment.
 *
 * Navigation lives here rather than in each caller so starting from the home
 * screen and starting from a plan cannot drift to different destinations.
 */
export function useStartWorkout(): State {
  const { user } = useSession();
  const uid = user?.uid;
  const [isStarting, setIsStarting] = useState(false);
  const [startingPlanId, setStartingPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(
    async (plan?: WorkoutPlan) => {
      if (!uid || isStarting) {
        if (!uid) setError('You are not signed in.');
        return;
      }

      setIsStarting(true);
      setStartingPlanId(plan?.id ?? null);
      setError(null);

      try {
        const now = new Date();
        const draft = plan ? sessionFromPlan(plan, now, newLineId) : blankSession(now);
        const sessionId = await createSession(uid, draft);

        // Into the exercise editor, not the read view: the workout is empty (or
        // a plan's worth of empty sets) and the next thing to do is fill it in.
        router.push(`/session/${sessionId}/exercises`);
      } catch {
        setError('Could not start a workout. Check your connection and try again.');
      } finally {
        setIsStarting(false);
        setStartingPlanId(null);
      }
    },
    [uid, isStarting],
  );

  return { start, isStarting, startingPlanId, error };
}
