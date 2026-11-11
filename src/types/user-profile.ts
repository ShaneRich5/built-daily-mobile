// Mirrors the web app's `lib/user-profile-types.ts`. docs/DATA_MODEL.md is the
// contract between the two clients — change it there first.

/** Max lengths the Firestore rules enforce on the profile document. */
export const USER_PROFILE_LIMITS = {
  displayName: 80,
  timezone: 64,
} as const;

/**
 * Logged numbers (lb, miles) are imperial regardless of this setting — it
 * records the user's preference for display, which no screen reads yet.
 */
export type MeasurementUnits = 'imperial' | 'metric';

/** `users/{uid}` — account-level identity and the onboarding gate. */
export type UserProfile = {
  displayName: string;
  /** IANA zone, e.g. `America/New_York`. */
  timezone: string;
  units: MeasurementUnits;
  /** Null until the user finishes (or skips) onboarding, on either app. */
  onboardingCompletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
