import { router } from 'expo-router';
import { useCallback, useState } from 'react';

import { useSession } from '@/contexts/session';
import {
  blankSession,
  type NewSession,
  sessionFromPlan,
  sessionFromPlanned,
} from '@/lib/session-start';
import { createSession } from '@/services/firestore/workout-repository';
import { newLineId } from '@/services/ids';
import type { ScheduledWorkout } from '@/types/planner';
import type { WorkoutPlan } from '@/types/workout';

type State = {
  /** Starts an empty workout, or one built from a saved plan. */
  start: (plan?: WorkoutPlan) => Promise<void>;
  /**
   * Starts a workout pencilled in on the planner. Pass the template it came
   * from when it is one of the lifter's own, so its set counts and notes come
   * along; without one, the entry's own exercise list is used.
   */
  startPlanned: (entry: ScheduledWorkout, plan?: WorkoutPlan) => Promise<void>;
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
 *
 * Starting a planned workout writes nothing to the planner entry. Neither app
 * marks a plan completed: a planned day counts as done when a workout was
 * logged on it, which both work out from the sessions themselves.
 */
export function useStartWorkout(): State {
  const { user } = useSession();
  const uid = user?.uid;
  const [isStarting, setIsStarting] = useState(false);
  const [startingPlanId, setStartingPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const begin = useCallback(
    async (build: (now: Date) => NewSession, planId: string | null) => {
      if (!uid || isStarting) {
        if (!uid) setError('You are not signed in.');
        return;
      }

      setIsStarting(true);
      setStartingPlanId(planId);
      setError(null);

      try {
        const sessionId = await createSession(uid, build(new Date()));

        // Straight to the workout: it is in progress, so the route shows the
        // logging screen, with the first exercise open.
        router.push(`/session/${sessionId}`);
      } catch {
        setError('Could not start a workout. Check your connection and try again.');
      } finally {
        setIsStarting(false);
        setStartingPlanId(null);
      }
    },
    [uid, isStarting],
  );

  const start = useCallback(
    (plan?: WorkoutPlan) =>
      begin(
        (now) => (plan ? sessionFromPlan(plan, now, newLineId) : blankSession(now)),
        plan?.id ?? null,
      ),
    [begin],
  );

  const startPlanned = useCallback(
    (entry: ScheduledWorkout, plan?: WorkoutPlan) =>
      begin(
        (now) =>
          plan
            ? { ...sessionFromPlan(plan, now, newLineId), title: entry.label.trim() || plan.name }
            : sessionFromPlanned(entry, now, newLineId),
        plan?.id ?? null,
      ),
    [begin],
  );

  return { start, startPlanned, isStarting, startingPlanId, error };
}
