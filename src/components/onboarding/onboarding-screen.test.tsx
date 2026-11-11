import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { OnboardingScreen } from '@/components/onboarding/onboarding-screen';
import { useSession } from '@/contexts/session';
import { getProgressSettings } from '@/services/firestore/home-repository';
import {
  addScheduledWorkout,
  saveProgressSettings,
} from '@/services/firestore/planner-repository';
import { completeOnboarding } from '@/services/firestore/user-profile-repository';

jest.mock('@/contexts/session');
jest.mock('@/services/firestore/home-repository');
jest.mock('@/services/firestore/planner-repository');
jest.mock('@/services/firestore/user-profile-repository');
jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
}));

// Wednesday, Nov 11, 2026: today to Saturday leaves four days.
const NOW = new Date(2026, 10, 11, 9, 0);
const signedIn = { uid: 'user-1', displayName: 'Shane', email: 'shane@example.com' };

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  jest.mocked(useSession).mockReturnValue({ user: signedIn as never, isLoading: false });
  jest.mocked(getProgressSettings).mockResolvedValue({
    weeklyGoal: 3,
    movementGoalDays: 6,
    goalWeightLbs: 180,
  });
  jest.mocked(saveProgressSettings).mockResolvedValue(undefined);
  jest.mocked(addScheduledWorkout).mockResolvedValue('entry');
  jest.mocked(completeOnboarding).mockResolvedValue(undefined);
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

const user = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

describe('OnboardingScreen', () => {
  it('plans the first week: a goal, days, and a workout for each', async () => {
    await render(<OnboardingScreen />);

    await user().press(screen.getByRole('radio', { name: '2x a week' }));
    await user().press(screen.getByRole('button', { name: 'Next' }));

    await user().press(screen.getByRole('checkbox', { name: 'Thu 12' }));
    await user().press(screen.getByRole('checkbox', { name: 'Sat 14' }));
    expect(screen.getByText(/2 \/ 2 picked/)).toBeTruthy();
    await user().press(screen.getByRole('button', { name: 'Next' }));

    await user().press(screen.getAllByRole('radio', { name: 'Upper body' })[0]);
    await user().press(screen.getAllByRole('radio', { name: 'Lower body' })[1]);
    await user().press(screen.getByRole('button', { name: 'Finish' }));

    // The goal weight set on the web is kept, not reset to the default.
    expect(saveProgressSettings).toHaveBeenCalledWith('user-1', {
      weeklyGoal: 2,
      movementGoalDays: 6,
      goalWeightLbs: 180,
    });
    expect(addScheduledWorkout).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ dateKey: '2026-11-12', planId: 'starter-upper' }),
    );
    expect(addScheduledWorkout).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ dateKey: '2026-11-14', planId: 'starter-lower' }),
    );
    expect(completeOnboarding).toHaveBeenCalledWith(signedIn);
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('offers only the days left this week', async () => {
    await render(<OnboardingScreen />);

    await user().press(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getAllByRole('checkbox').map((day) => day.props.accessibilityLabel ?? '')).toHaveLength(4);
    expect(screen.getByRole('checkbox', { name: 'Today' })).toBeTruthy();
  });

  it('skips without planning anything, and is not shown again', async () => {
    await render(<OnboardingScreen />);

    await user().press(screen.getByRole('button', { name: 'Skip for now' }));

    expect(saveProgressSettings).not.toHaveBeenCalled();
    expect(addScheduledWorkout).not.toHaveBeenCalled();
    expect(completeOnboarding).toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('stays put and says so when saving fails', async () => {
    jest.mocked(completeOnboarding).mockRejectedValue(new Error('offline'));
    await render(<OnboardingScreen />);

    await user().press(screen.getByRole('button', { name: 'Skip for now' }));

    expect(screen.getByText(/Could not save that/)).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
