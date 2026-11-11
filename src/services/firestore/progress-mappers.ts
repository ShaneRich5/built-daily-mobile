import { toDate } from '@/services/firestore/mappers';
import { type BodyWeightEntry, MAX_BODY_WEIGHT_LBS } from '@/types/progress';

// Body weight document data ↔ entries. No firebase import, as in `mappers.ts`.
// Matches the web app's `firestoreToBodyWeightEntry` and
// `bodyWeightEntryToFirestore` in `lib/progress-mapper.ts`.

type DocData = Record<string, unknown>;

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

const tenth = (value: number) => Math.round(value * 10) / 10;

/** `bodyWeight` document data → entry, or null for one without a day, a weight or a time. */
export function toBodyWeightEntry(id: string, data: DocData | undefined): BodyWeightEntry | null {
  if (!data) return null;

  const dateKey = typeof data.dateKey === 'string' && DATE_KEY.test(data.dateKey) ? data.dateKey : null;
  const weight = typeof data.weightLbs === 'number' && Number.isFinite(data.weightLbs) ? tenth(data.weightLbs) : 0;
  const createdAt = toDate(data.createdAt);
  if (!dateKey || weight <= 0 || !createdAt) return null;

  return { id, dateKey, weightLbs: weight, createdAt };
}

/**
 * A weigh-in to write: exactly the fields the rules require on create, or null
 * for a day or weight they would refuse.
 */
export function fromNewBodyWeight(dateKey: string, weightLbs: number, now: Date): DocData | null {
  const weight = tenth(weightLbs);
  if (!DATE_KEY.test(dateKey) || !(weight > 0) || weight > MAX_BODY_WEIGHT_LBS) return null;

  return { dateKey, weightLbs: weight, createdAt: now };
}
