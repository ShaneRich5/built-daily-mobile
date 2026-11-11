import {
  goalLabel,
  needsOnboarding,
  onboardingDayLabel,
  onboardingEntries,
  remainingDaysThisWeek,
  toggleDay,
} from '@/lib/onboarding';
import type { UserProfile } from '@/types/user-profile';

const profile = (onboardingCompletedAt: Date | null): UserProfile => ({
  displayName: 'Shane',
  timezone: 'America/New_York',
  units: 'imperial',
  onboardingCompletedAt,
  createdAt: new Date(2026, 0, 1),
  updatedAt: new Date(2026, 0, 1),
});

describe('needsOnboarding', () => {
  it('is needed for a profile that was never stamped', () => {
    expect(needsOnboarding(profile(null))).toBe(true);
  });

  it('is not needed once done on either app', () => {
    expect(needsOnboarding(profile(new Date()))).toBe(false);
  });

  // Never shown before the profile is known: someone who did it on the web
  // must not see it again while the document is still loading.
  it('is not shown while there is no profile to go on', () => {
    expect(needsOnboarding(null)).toBe(false);
  });
});

describe('goalLabel', () => {
  it('reads a weekly goal', () => {
    expect(goalLabel(3)).toBe('3x a week');
    expect(goalLabel(7)).toBe('Every day');
  });
});

describe('remainingDaysThisWeek', () => {
  it('runs from today to Saturday', () => {
    expect(remainingDaysThisWeek('2026-11-11')).toEqual([
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
    ]);
  });

  it('is just Saturday on a Saturday', () => {
    expect(remainingDaysThisWeek('2026-11-14')).toEqual(['2026-11-14']);
  });
});

describe('onboardingDayLabel', () => {
  it('names a day briefly', () => {
    expect(onboardingDayLabel('2026-11-11', '2026-11-11')).toBe('Today');
    expect(onboardingDayLabel('2026-11-12', '2026-11-11')).toBe('Thu 12');
  });
});

describe('toggleDay', () => {
  it('adds days in order and removes them again', () => {
    expect(toggleDay(['2026-11-13'], '2026-11-11', 3)).toEqual(['2026-11-11', '2026-11-13']);
    expect(toggleDay(['2026-11-11', '2026-11-13'], '2026-11-11', 3)).toEqual(['2026-11-13']);
  });

  it('stops at the most allowed', () => {
    expect(toggleDay(['2026-11-11', '2026-11-12'], '2026-11-13', 2)).toEqual([
      '2026-11-11',
      '2026-11-12',
    ]);
  });
});

describe('onboardingEntries', () => {
  it('plans each picked day that was given a starter', () => {
    expect(
      onboardingEntries(['2026-11-12', '2026-11-14'], { '2026-11-12': 'starter-upper' }),
    ).toEqual([
      {
        dateKey: '2026-11-12',
        label: 'Upper body',
        planId: 'starter-upper',
        exerciseIds: ['bench', 'row', 'ohp', 'pullup', 'dip'],
      },
    ]);
  });
});
