import { toDate } from '@/services/firestore/mappers';
import { USER_PROFILE_LIMITS, type UserProfile } from '@/types/user-profile';

// No firebase import, for the same reason as `mappers.ts`: these run over plain
// document data so they can be tested without a Firestore instance.

type DocData = Record<string, unknown>;

function trimmed(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

/**
 * `users/{uid}` document data → profile, or null when the document is missing
 * a field the profile cannot do without. A document like that is treated as if
 * there were none, and gets rewritten whole on the next sign-in — the same
 * call the web app makes.
 */
export function toUserProfile(raw: DocData): UserProfile | null {
  const displayName = trimmed(raw.displayName, USER_PROFILE_LIMITS.displayName);
  const timezone = trimmed(raw.timezone, USER_PROFILE_LIMITS.timezone);
  const createdAt = toDate(raw.createdAt);
  const updatedAt = toDate(raw.updatedAt);

  if (!displayName || !timezone || !createdAt || !updatedAt) return null;

  return {
    displayName,
    timezone,
    units: raw.units === 'metric' ? 'metric' : 'imperial',
    onboardingCompletedAt: toDate(raw.onboardingCompletedAt),
    createdAt,
    updatedAt,
  };
}

/**
 * Profile → document data. Every field is written, every time: the Firestore
 * rules require all six on create *and* update. `Date` values go through the
 * SDK unchanged and are stored as `Timestamp`, which is what the rules check.
 */
export function fromUserProfile(profile: UserProfile): DocData {
  return {
    displayName: profile.displayName,
    timezone: profile.timezone,
    units: profile.units,
    onboardingCompletedAt: profile.onboardingCompletedAt,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}
