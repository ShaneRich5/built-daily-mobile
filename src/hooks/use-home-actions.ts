import { useCallback, useState } from 'react';

import { useSession } from '@/contexts/session';
import {
  deleteActivity,
  logActivity,
  moveScheduledWorkouts,
  skipScheduledWorkout,
  updateActivity,
} from '@/services/firestore/home-repository';
import { syncGroups } from '@/services/group-sync';
import type { NewActivity } from '@/types/activity';

/**
 * The writes Home makes besides starting a workout: logging, editing and
 * deleting an activity, and the catch-up card's move and skip. Each resolves to whether it landed, so
 * the screen can close a sheet on success and keep it open on failure.
 *
 * Nothing here updates the screen by itself: Home's subscriptions deliver the
 * change, including Firestore's local echo before the server has answered.
 *
 * `error` is for Home to show. A failed activity write is left out of it: the
 * activity sheet stays open and says so itself, and a second copy on Home, under
 * the sheet, would still be there after it closed.
 */
export function useHomeActions() {
  const { user } = useSession();
  const uid = user?.uid;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (
      write: (userId: string) => Promise<unknown>,
      failure: string | null,
    ): Promise<boolean> => {
      if (!uid) {
        setError('You are not signed in.');
        return false;
      }

      setBusy(true);
      setError(null);
      try {
        await write(uid);
        // Days planned and trained are what groups see; keep them in step.
        if (user) syncGroups(user);
        return true;
      } catch {
        if (failure) setError(failure);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [uid, user],
  );

  const moveEntry = useCallback(
    (entryId: string, dateKey: string | null) =>
      run(
        (userId) => moveScheduledWorkouts(userId, [{ id: entryId, dateKey }]),
        'Could not update your plan. Check your connection and try again.',
      ),
    [run],
  );

  const skipEntry = useCallback(
    (entryId: string) =>
      run(
        (userId) => skipScheduledWorkout(userId, entryId),
        'Could not update your plan. Check your connection and try again.',
      ),
    [run],
  );

  const log = useCallback(
    (activity: NewActivity) => run((userId) => logActivity(userId, activity), null),
    [run],
  );

  const edit = useCallback(
    (activityId: string, activity: NewActivity) =>
      run((userId) => updateActivity(userId, activityId, activity), null),
    [run],
  );

  const remove = useCallback(
    (activityId: string) => run((userId) => deleteActivity(userId, activityId), null),
    [run],
  );

  return {
    busy,
    error,
    moveEntry,
    skipEntry,
    logActivity: log,
    updateActivity: edit,
    deleteActivity: remove,
  };
}
