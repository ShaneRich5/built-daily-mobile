import { USER_PROFILE_LIMITS, type UserProfile } from '@/types/user-profile';

/** The parts of a signed-in Firebase user a profile is built from. */
export type AuthIdentity = {
  displayName: string | null;
  email: string | null;
};

/**
 * The name to show for an account: the one it was given, else the part of the
 * email before the `@`, else a placeholder. Never empty — the Firestore rules
 * reject a profile without a name. Matches the web's `displayNameFromAuth`, so
 * the two apps do not take turns rewriting each other's value.
 */
export function displayNameFromAuth(user: AuthIdentity): string {
  const name = user.displayName?.trim();
  if (name) return name.slice(0, USER_PROFILE_LIMITS.displayName);

  const local = user.email?.trim().split('@')[0]?.trim();
  if (local) return local.slice(0, USER_PROFILE_LIMITS.displayName);

  return 'Member';
}

/** The phone's IANA timezone, or UTC when the runtime will not report one. */
export function resolveDeviceTimezone(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone?.trim();
    if (zone) return zone.slice(0, USER_PROFILE_LIMITS.timezone);
  } catch {
    // Fall through to UTC.
  }
  return 'UTC';
}

/**
 * What the profile document should be after a sign-in, or null when the stored
 * one is already right and nothing needs writing.
 *
 * - No profile yet: a new one, with onboarding still to do.
 * - Name or timezone moved on (renamed account, travelled, new phone): the same
 *   profile with those refreshed. Everything else — units, the onboarding
 *   stamp, `createdAt` — is kept as it was.
 */
export function profileAfterSignIn(
  existing: UserProfile | null,
  identity: { displayName: string; timezone: string },
  now: Date,
): UserProfile | null {
  if (!existing) {
    return {
      displayName: identity.displayName,
      timezone: identity.timezone,
      units: 'imperial',
      onboardingCompletedAt: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  if (existing.displayName === identity.displayName && existing.timezone === identity.timezone) {
    return null;
  }

  return {
    ...existing,
    displayName: identity.displayName,
    timezone: identity.timezone,
    updatedAt: now,
  };
}
