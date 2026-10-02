import { useCallback, useEffect, useState } from 'react';

import { useSession } from '@/contexts/session';
import { describeReadError } from '@/lib/read-error';
import { subscribeToRecentSessions } from '@/services/firestore/workout-repository';
import type { WorkoutSession } from '@/types/workout';

type State = {
  sessions: WorkoutSession[];
  isLoading: boolean;
  /** True while a pull-to-refresh is in flight. The list stays on screen. */
  isRefreshing: boolean;
  /** Drops the live subscription and opens a new one. */
  refresh: () => void;
  error: string | null;
};

/**
 * Tagged with the uid *and* the attempt it belongs to, so a previous user's
 * data is never shown and a refresh can tell the new subscription's first
 * snapshot from the one already on screen.
 */
type Result = {
  uid: string;
  attempt: number;
  sessions: WorkoutSession[];
  error: string | null;
};

export function useRecentSessions(): State {
  const { user } = useSession();
  const uid = user?.uid;
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!uid) return;

    return subscribeToRecentSessions(uid, {
      onData: (sessions) => setResult({ uid, attempt, sessions, error: null }),
      onError: (error) =>
        setResult({
          uid,
          attempt,
          sessions: [],
          error: describeReadError(error, 'Could not load your workouts.'),
        }),
    });
  }, [uid, attempt]);

  /**
   * The list is already live, so this is not how new workouts arrive — they
   * arrive on their own. What a pull buys is a way out of a subscription that
   * has gone quiet (a dropped connection, a failed read): bumping the attempt
   * tears the listener down through the effect's cleanup and opens a fresh one.
   */
  const refresh = useCallback(() => setAttempt((current) => current + 1), []);

  // Derived rather than assigned in the effect: setting state in an effect body
  // triggers a second render pass, and deriving also covers the window after a
  // user switch where `result` still holds the previous user's data.
  if (!uid) {
    return { sessions: [], isLoading: false, isRefreshing: false, refresh, error: null };
  }

  if (result?.uid !== uid) {
    return { sessions: [], isLoading: true, isRefreshing: false, refresh, error: null };
  }

  // Same user, earlier attempt: the refreshed subscription has not reported
  // yet. The workouts already on screen are still this user's, so they stay put
  // under the spinner rather than blinking out and back.
  if (result.attempt !== attempt) {
    return {
      sessions: result.sessions,
      isLoading: false,
      isRefreshing: true,
      refresh,
      error: result.error,
    };
  }

  return {
    sessions: result.sessions,
    isLoading: false,
    isRefreshing: false,
    refresh,
    error: result.error,
  };
}
