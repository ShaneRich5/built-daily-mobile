import { addDoc, collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';

import { getDb } from '@/services/firebase';
import { fromNewBodyWeight, toBodyWeightEntry } from '@/services/firestore/progress-mappers';
import type { BodyWeightEntry } from '@/types/progress';

// Body weight, `users/{uid}/bodyWeight`. The goals document is read in
// `home-repository.ts` and written in `planner-repository.ts`.

type Unsubscribe = () => void;

type Listener<T> = {
  onData: (value: T) => void;
  onError: (error: Error) => void;
};

/**
 * The latest `maxDocs` weigh-ins, oldest first. Read newest first so the limit
 * keeps the recent ones — the web reads oldest first, which for a long-time
 * weigher would stop short of today — then put back in date order.
 */
export function subscribeToBodyWeight(
  userId: string,
  maxDocs: number,
  { onData, onError }: Listener<BodyWeightEntry[]>,
): Unsubscribe {
  const entries = query(
    collection(getDb(), 'users', userId, 'bodyWeight'),
    orderBy('dateKey', 'desc'),
    limit(maxDocs),
  );

  return onSnapshot(
    entries,
    (snapshot) => {
      const mapped = snapshot.docs
        .map((document) => toBodyWeightEntry(document.id, document.data()))
        .filter((entry): entry is BodyWeightEntry => entry !== null);

      mapped.sort(
        (a, b) => a.dateKey.localeCompare(b.dateKey) || a.createdAt.getTime() - b.createdAt.getTime(),
      );
      onData(mapped);
    },
    onError,
  );
}

/** Logs a weigh-in and answers with its id. Rejects a day or weight the rules would refuse. */
export async function logBodyWeight(userId: string, dateKey: string, weightLbs: number): Promise<string> {
  const data = fromNewBodyWeight(dateKey, weightLbs, new Date());
  if (!data) throw new Error('That weight could not be logged.');

  const created = await addDoc(collection(getDb(), 'users', userId, 'bodyWeight'), data);
  return created.id;
}
