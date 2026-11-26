import {
  addDoc,
  collection,
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { normalizeDailyMetricValue, withSourceValue } from '@/lib/daily-metrics';
import { getDb } from '@/services/firebase';
import {
  fromChallengeRule,
  fromDailyMetricEntry,
  fromNewChallenge,
  toChallenge,
  toDailyMetricsDay,
} from '@/services/firestore/challenge-mappers';
import type { ChallengeRule, NewChallenge, SavedChallenge } from '@/types/challenge';
import type { DailyMetricKey, DailyMetricsDay } from '@/types/daily-metric';

// Step challenges, `users/{uid}/challenges`, and the day docs their progress
// is derived from, `users/{uid}/dailyMetrics/{YYYY-MM-DD}`. Paths, queries and
// write shapes match the web app's `lib/challenge-repository.ts` and
// `lib/daily-metric-repository.ts`, so a challenge started on one client shows
// on the other.

type Unsubscribe = () => void;

type Listener<T> = {
  onData: (value: T) => void;
  onError: (error: Error) => void;
};

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Challenges that end on or after `sinceDateKey`: the running one, one that
 * just finished, and the next one if it's already set. A single-field range,
 * so no composite index.
 */
export function subscribeToChallengesEndingSince(
  userId: string,
  sinceDateKey: string,
  { onData, onError }: Listener<SavedChallenge[]>,
): Unsubscribe {
  const challenges = query(
    collection(getDb(), 'users', userId, 'challenges'),
    where('endDate', '>=', sinceDateKey),
  );

  return onSnapshot(
    challenges,
    (snapshot) => {
      const rows: SavedChallenge[] = [];
      for (const document of snapshot.docs) {
        const challenge = toChallenge(document.data());
        if (challenge) rows.push({ id: document.id, challenge });
      }
      rows.sort(
        (a, b) =>
          a.challenge.startDate.localeCompare(b.challenge.startDate) ||
          a.challenge.createdAt.getTime() - b.challenge.createdAt.getTime(),
      );
      onData(rows);
    },
    onError,
  );
}

/** Starts a personal challenge over a Sunday–Saturday week or a calendar month. */
export async function startChallenge(userId: string, input: NewChallenge): Promise<string> {
  const ref = await addDoc(
    collection(getDb(), 'users', userId, 'challenges'),
    fromNewChallenge(input, new Date()),
  );
  return ref.id;
}

/**
 * Changes the target. Clears `completedAt`, since "done" meant the old rule;
 * the app sets it again if the new rule is already met.
 */
export async function updateChallengeRule(
  userId: string,
  challengeId: string,
  rule: ChallengeRule,
): Promise<void> {
  await updateDoc(doc(getDb(), 'users', userId, 'challenges', challengeId), {
    rule: fromChallengeRule(rule),
    completedAt: null,
    updatedAt: new Date(),
  });
}

/** Records the first time a challenge was done. */
export async function markChallengeCompleted(userId: string, challengeId: string): Promise<void> {
  const now = new Date();
  await updateDoc(doc(getDb(), 'users', userId, 'challenges', challengeId), {
    completedAt: now,
    updatedAt: now,
  });
}

/** Day docs from `startKey` to `endKey` (inclusive), keyed by date. */
export function subscribeToDailyMetrics(
  userId: string,
  startKey: string,
  endKey: string,
  { onData, onError }: Listener<Record<string, DailyMetricsDay>>,
): Unsubscribe {
  const days = query(
    collection(getDb(), 'users', userId, 'dailyMetrics'),
    where('dateKey', '>=', startKey),
    where('dateKey', '<=', endKey),
  );

  return onSnapshot(
    days,
    (snapshot) => {
      const byDate: Record<string, DailyMetricsDay> = {};
      for (const document of snapshot.docs) {
        const day = toDailyMetricsDay(document.id, document.data());
        if (day) byDate[day.dateKey] = day;
      }
      onData(byDate);
    },
    onError,
  );
}

/**
 * Sets the number the user typed for one day, or with `value: null` removes
 * it so the day falls back to its synced value. Only `sources.manual` and the
 * resolved `value` / `resolvedFrom` change; synced sources are kept.
 *
 * Setting needs no read, because a manual value always wins — the write lands
 * in the offline cache at once. Removing reads the day (from the cache if
 * offline) to find what to fall back to.
 */
export async function setManualDailyMetric(
  userId: string,
  dateKey: string,
  metric: DailyMetricKey,
  value: number | null,
): Promise<void> {
  if (!DATE_KEY.test(dateKey)) throw new Error(`Not a day: ${dateKey}`);

  const ref = doc(getDb(), 'users', userId, 'dailyMetrics', dateKey);
  const now = new Date();

  if (value != null) {
    const normalized = normalizeDailyMetricValue(metric, value);
    if (normalized == null) throw new Error(`Out of range: ${value}`);

    const entry = withSourceValue(null, 'manual', normalized, now);
    await setDoc(ref, fromDailyMetricEntry(dateKey, metric, entry, now), { merge: true });
    return;
  }

  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return;

  const day = toDailyMetricsDay(snapshot.id, snapshot.data());
  const entry = withSourceValue(day?.metrics[metric], 'manual', null, now);
  const write = fromDailyMetricEntry(dateKey, metric, entry, now);
  const metrics = write.metrics as Record<string, { sources: Record<string, unknown> }>;
  metrics[metric].sources.manual = deleteField();
  await setDoc(ref, write, { merge: true });
}
