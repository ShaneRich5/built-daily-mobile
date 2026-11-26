import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useSession } from '@/contexts/session';
import { addDays } from '@/lib/date-keys';
import {
  buildLogStepsDay,
  buildStepChallengeCardView,
  challengeDaysWindow,
  challengeRange,
  ENDED_VISIBLE_DAYS,
  pickHomeChallenge,
  repeatRange,
} from '@/lib/step-challenge-model';
import {
  markChallengeCompleted,
  setManualDailyMetric,
  startChallenge,
  subscribeToChallengesEndingSince,
  subscribeToDailyMetrics,
  updateChallengeRule,
} from '@/services/firestore/challenge-repository';
import type { ChallengePeriod, ChallengeRule, SavedChallenge } from '@/types/challenge';
import type { DailyMetricsDay } from '@/types/daily-metric';

type Raw = { challenges: SavedChallenge[] | null; days: Record<string, DailyMetricsDay> };

const EMPTY: Raw = { challenges: null, days: {} };

/** Tagged with what it was loaded for, so another user's or day's data never shows. */
type Loaded = { key: string; raw: Raw };

const SAVE_FAILED = 'Couldn’t save that. Check your connection and try again.';

/**
 * Home's step challenge: the challenge it shows, the step days behind it, and
 * the writes its card and sheets make — live from Firestore, as on the web.
 *
 * Writes are not awaited by the sheets. Firestore applies them to its local
 * cache and the subscriptions deliver them straight away, so a sheet closes
 * without waiting on the network; a write the server later refuses is
 * reported through `error`.
 *
 * Also records `completedAt` the first time the shown challenge is done.
 * Progress itself is always derived, never stored.
 */
export function useStepChallenge(todayKey: string) {
  const { user } = useSession();
  const uid = user?.uid;
  const key = `${uid ?? ''}/${todayKey}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;

    const patch = (next: Partial<Raw>) =>
      setLoaded((current) => ({
        key,
        raw: { ...(current?.key === key ? current.raw : EMPTY), ...next },
      }));
    const range = challengeDaysWindow(todayKey);

    const unsubscribes = [
      subscribeToChallengesEndingSince(uid, addDays(todayKey, -ENDED_VISIBLE_DAYS), {
        onData: (challenges) => patch({ challenges }),
        // Unreadable (rules not deployed, offline on first launch): no card, not an error.
        onError: () => patch({ challenges: [] }),
      }),
      subscribeToDailyMetrics(uid, range.startDate, range.endDate, {
        onData: (days) => patch({ days }),
        onError: () => patch({ days: {} }),
      }),
    ];
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [uid, todayKey, key]);

  const raw = loaded && loaded.key === key ? loaded.raw : EMPTY;
  const { shown, upcoming } = useMemo(
    () => pickHomeChallenge(raw.challenges ?? [], todayKey),
    [raw.challenges, todayKey],
  );
  const view = useMemo(
    () => (shown ? buildStepChallengeCardView(shown, raw.days, todayKey, upcoming) : null),
    [shown, raw.days, todayKey, upcoming],
  );

  // Write `completedAt` once per challenge version.
  const marked = useRef<string | null>(null);
  useEffect(() => {
    if (!uid || !shown || view?.state !== 'done' || shown.challenge.completedAt) return;

    const version = `${shown.id}:${shown.challenge.updatedAt.getTime()}`;
    if (marked.current === version) return;
    marked.current = version;
    markChallengeCompleted(uid, shown.id).catch(() => {
      marked.current = null;
    });
  }, [uid, shown, view?.state]);

  const inBackground = useCallback(
    (write: (userId: string) => Promise<unknown>) => {
      if (!uid) return;
      setError(null);
      write(uid).catch(() => setError(SAVE_FAILED));
    },
    [uid],
  );

  /** Starts a new challenge over the whole week or month containing today, so steps already in it count. */
  const start = useCallback(
    (rule: ChallengeRule, period: ChallengePeriod) =>
      inBackground((userId) =>
        startChallenge(userId, {
          metric: 'steps',
          rule,
          period,
          ...challengeRange(period, todayKey),
        }),
      ),
    [inBackground, todayKey],
  );

  const editRule = useCallback(
    (rule: ChallengeRule) => {
      if (shown) inBackground((userId) => updateChallengeRule(userId, shown.id, rule));
    },
    [inBackground, shown],
  );

  const repeat = useCallback(() => {
    if (!shown) return;
    const { metric, rule, period } = shown.challenge;
    inBackground((userId) =>
      startChallenge(userId, { metric, rule, period, ...repeatRange(shown, todayKey) }),
    );
  }, [inBackground, shown, todayKey]);

  /** A typed number for the day, or null to go back to the synced one. */
  const setSteps = useCallback(
    (dateKey: string, steps: number | null) =>
      inBackground((userId) => setManualDailyMetric(userId, dateKey, 'steps', steps)),
    [inBackground],
  );

  const logDay = useCallback((dateKey: string) => buildLogStepsDay(dateKey, raw.days), [raw.days]);

  return {
    /** False until the challenges have loaded, so "Start a step challenge" never flashes. */
    isLoaded: raw.challenges !== null,
    view,
    error,
    start,
    editRule,
    repeat,
    setSteps,
    logDay,
  };
}

export type StepChallengeData = ReturnType<typeof useStepChallenge>;
