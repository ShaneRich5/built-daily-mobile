import { fromUserProfile, toUserProfile } from '@/services/firestore/user-profile-mapper';
import type { UserProfile } from '@/types/user-profile';

// Stands in for a Firestore Timestamp, which the mappers accept structurally.
const timestamp = (iso: string) => ({ toDate: () => new Date(iso) });

const stored = {
  displayName: 'Shane',
  timezone: 'America/New_York',
  units: 'imperial',
  onboardingCompletedAt: timestamp('2026-09-01T00:00:00Z'),
  createdAt: timestamp('2026-08-01T00:00:00Z'),
  updatedAt: timestamp('2026-09-01T00:00:00Z'),
};

describe('toUserProfile', () => {
  it('maps a profile written by the web app', () => {
    expect(toUserProfile(stored)).toEqual({
      displayName: 'Shane',
      timezone: 'America/New_York',
      units: 'imperial',
      onboardingCompletedAt: new Date('2026-09-01T00:00:00Z'),
      createdAt: new Date('2026-08-01T00:00:00Z'),
      updatedAt: new Date('2026-09-01T00:00:00Z'),
    });
  });

  it('reads onboarding as not done when the stamp is null', () => {
    expect(toUserProfile({ ...stored, onboardingCompletedAt: null })?.onboardingCompletedAt).toBe(
      null,
    );
  });

  it('defaults to imperial for a units value it does not know', () => {
    expect(toUserProfile({ ...stored, units: 'stone' })?.units).toBe('imperial');
    expect(toUserProfile({ ...stored, units: 'metric' })?.units).toBe('metric');
  });

  it.each(['displayName', 'timezone', 'createdAt', 'updatedAt'] as const)(
    'treats a document without %s as no profile at all',
    (field) => {
      expect(toUserProfile({ ...stored, [field]: undefined })).toBeNull();
    },
  );

  it('treats a blank name as missing', () => {
    expect(toUserProfile({ ...stored, displayName: '   ' })).toBeNull();
  });
});

describe('fromUserProfile', () => {
  const profile: UserProfile = {
    displayName: 'Shane',
    timezone: 'America/New_York',
    units: 'imperial',
    onboardingCompletedAt: null,
    createdAt: new Date('2026-08-01T00:00:00Z'),
    updatedAt: new Date('2026-09-01T00:00:00Z'),
  };

  // The rules reject a write that leaves any of these out, even on update.
  it('writes all six fields the Firestore rules require', () => {
    expect(Object.keys(fromUserProfile(profile)).sort()).toEqual([
      'createdAt',
      'displayName',
      'onboardingCompletedAt',
      'timezone',
      'units',
      'updatedAt',
    ]);
  });

  it('keeps null for onboarding not yet done, which the rules accept', () => {
    expect(fromUserProfile(profile).onboardingCompletedAt).toBeNull();
  });

  it('survives a round trip back through the read mapper', () => {
    expect(toUserProfile(fromUserProfile(profile))).toEqual(profile);
  });
});
