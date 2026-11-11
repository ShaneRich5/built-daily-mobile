import { useCallback, useState } from 'react';

import { useSession } from '@/contexts/session';
import type { BoardMove } from '@/lib/week-board';
import {
  moveScheduledWorkouts,
  skipScheduledWorkout,
} from '@/services/firestore/home-repository';
import {
  addScheduledWorkout,
  deleteScheduledWorkout,
} from '@/services/firestore/planner-repository';
import type { NewScheduledWorkout } from '@/services/firestore/planner-mappers';
import type { ScheduledWorkout } from '@/types/planner';

const FAILURE = 'Could not update your plan. Check your connection and try again.';

/**
 * The planner's writes. Each resolves to whether it landed; the planner's own
 * subscriptions deliver the result, so nothing here touches the screen's data.
 */
export function usePlannerActions() {
  const { user } = useSession();
  const uid = user?.uid;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (write: (userId: string) => Promise<unknown>): Promise<boolean> => {
      if (!uid) {
        setError('You are not signed in.');
        return false;
      }

      setBusy(true);
      setError(null);
      try {
        await write(uid);
        return true;
      } catch {
        setError(FAILURE);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [uid],
  );

  return {
    busy,
    error,
    move: useCallback(
      (moves: readonly BoardMove[]) => run((userId) => moveScheduledWorkouts(userId, moves)),
      [run],
    ),
    add: useCallback(
      (entry: NewScheduledWorkout) => run((userId) => addScheduledWorkout(userId, entry)),
      [run],
    ),
    skip: useCallback(
      (entry: ScheduledWorkout) => run((userId) => skipScheduledWorkout(userId, entry.id)),
      [run],
    ),
    remove: useCallback(
      (entry: ScheduledWorkout) => run((userId) => deleteScheduledWorkout(userId, entry)),
      [run],
    ),
  };
}
