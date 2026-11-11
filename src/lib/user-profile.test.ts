import { displayNameFromAuth, profileAfterSignIn, resolveDeviceTimezone } from '@/lib/user-profile';
import type { UserProfile } from '@/types/user-profile';

describe('displayNameFromAuth', () => {
  it('uses the name the account was given', () => {
    expect(displayNameFromAuth({ displayName: '  Shane  ', email: 'shane@example.com' })).toBe(
      'Shane',
    );
  });

  it('falls back to the part of the email before the @', () => {
    expect(displayNameFromAuth({ displayName: null, email: 'shane@example.com' })).toBe('shane');
    expect(displayNameFromAuth({ displayName: '   ', email: 'shane@example.com' })).toBe('shane');
  });

  // The Firestore rules reject an empty name, so there is always something.
  it('falls back to a placeholder when there is nothing to go on', () => {
    expect(displayNameFromAuth({ displayName: null, email: null })).toBe('Member');
    expect(displayNameFromAuth({ displayName: null, email: '@example.com' })).toBe('Member');
  });

  it('keeps the name within what the rules allow', () => {
    expect(displayNameFromAuth({ displayName: 'x'.repeat(200), email: null })).toHaveLength(80);
  });
});

describe('resolveDeviceTimezone', () => {
  const original = Intl.DateTimeFormat;

  afterEach(() => {
    Intl.DateTimeFormat = original;
  });

  it('reports the zone the runtime gives', () => {
    Intl.DateTimeFormat = (() => ({
      resolvedOptions: () => ({ timeZone: 'America/New_York' }),
    })) as unknown as typeof Intl.DateTimeFormat;

    expect(resolveDeviceTimezone()).toBe('America/New_York');
  });

  it('falls back to UTC when the runtime reports none', () => {
    Intl.DateTimeFormat = (() => ({
      resolvedOptions: () => ({ timeZone: undefined }),
    })) as unknown as typeof Intl.DateTimeFormat;

    expect(resolveDeviceTimezone()).toBe('UTC');
  });

  it('falls back to UTC when asking throws', () => {
    Intl.DateTimeFormat = (() => {
      throw new Error('no Intl here');
    }) as unknown as typeof Intl.DateTimeFormat;

    expect(resolveDeviceTimezone()).toBe('UTC');
  });
});

describe('profileAfterSignIn', () => {
  const now = new Date('2026-11-10T12:00:00Z');
  const identity = { displayName: 'Shane', timezone: 'America/New_York' };

  const stored: UserProfile = {
    displayName: 'Shane',
    timezone: 'America/New_York',
    units: 'metric',
    onboardingCompletedAt: new Date('2026-09-01T00:00:00Z'),
    createdAt: new Date('2026-08-01T00:00:00Z'),
    updatedAt: new Date('2026-09-01T00:00:00Z'),
  };

  it('creates a profile, with onboarding still to do, when there is none', () => {
    expect(profileAfterSignIn(null, identity, now)).toEqual({
      displayName: 'Shane',
      timezone: 'America/New_York',
      units: 'imperial',
      onboardingCompletedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  });

  it('writes nothing when the stored profile is already right', () => {
    expect(profileAfterSignIn(stored, identity, now)).toBeNull();
  });

  it('refreshes the timezone when the phone has moved', () => {
    const next = profileAfterSignIn(stored, { ...identity, timezone: 'Europe/London' }, now);

    expect(next).toMatchObject({ timezone: 'Europe/London', updatedAt: now });
  });

  it('refreshes the name when the account was renamed', () => {
    const next = profileAfterSignIn(stored, { ...identity, displayName: 'Shane R' }, now);

    expect(next).toMatchObject({ displayName: 'Shane R', updatedAt: now });
  });

  // Onboarding finished on the web must not come back because of a sign-in here.
  it('keeps units, the onboarding stamp and createdAt through a refresh', () => {
    const next = profileAfterSignIn(stored, { ...identity, timezone: 'Europe/London' }, now);

    expect(next).toMatchObject({
      units: 'metric',
      onboardingCompletedAt: stored.onboardingCompletedAt,
      createdAt: stored.createdAt,
    });
  });
});
