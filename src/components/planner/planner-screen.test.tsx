import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { PlannerScreen } from '@/components/planner/planner-screen';
import { useSession } from '@/contexts/session';
import { bench } from '@/lib/session/session-test-helpers';
import { confirm } from '@/services/confirm';
import { syncGroups } from '@/services/group-sync';
import {
  moveScheduledWorkouts,
  skipScheduledWorkout,
  subscribeToProgressSettings,
  subscribeToRecentActivities,
  subscribeToScheduledWorkouts,
} from '@/services/firestore/home-repository';
import {
  addScheduledWorkout,
  deleteScheduledWorkout,
  subscribeToUnscheduledWorkouts,
} from '@/services/firestore/planner-repository';
import {
  createSession,
  subscribeToPlans,
  subscribeToRecentSessions,
} from '@/services/firestore/workout-repository';
import type { DatedScheduledWorkout, ScheduledWorkout } from '@/types/planner';
import type { WorkoutPlan } from '@/types/workout';

jest.mock('@/contexts/session');
jest.mock('@/services/confirm');
jest.mock('@/services/firestore/workout-repository');
jest.mock('@/services/firestore/home-repository');
jest.mock('@/services/firestore/planner-repository');
jest.mock('expo-router', () => ({
  router: { canGoBack: jest.fn(() => true), back: jest.fn(), replace: jest.fn(), push: jest.fn() },
}));

const mockedMove = jest.mocked(moveScheduledWorkouts);
const mockedAdd = jest.mocked(addScheduledWorkout);
const mockedSkip = jest.mocked(skipScheduledWorkout);
const mockedDelete = jest.mocked(deleteScheduledWorkout);
const mockedCreate = jest.mocked(createSession);

// Wednesday, Nov 11, 2026. The week runs Sun Nov 8 – Sat Nov 14.
const NOW = new Date(2026, 10, 11, 9, 0);

let dated: DatedScheduledWorkout[];
let tray: ScheduledWorkout[];
let plans: WorkoutPlan[];

function entry(id: string, dateKey: string | null, overrides: Partial<ScheduledWorkout> = {}) {
  return {
    id,
    dateKey,
    label: id,
    planId: null,
    exerciseIds: ['squat', 'bench'],
    status: 'planned' as const,
    sessionId: null,
    createdAt: new Date(2026, 10, 1),
    sharedPlanId: null,
    groupId: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  dated = [entry('Leg day', '2026-11-12') as DatedScheduledWorkout, entry('Pull day', '2026-11-14') as DatedScheduledWorkout];
  tray = [entry('Mobility', null, { exerciseIds: [] })];
  plans = [
    {
      id: 'push',
      name: 'Push day',
      source: 'custom',
      createdAt: new Date(2026, 0, 1),
      updatedAt: new Date(2026, 0, 1),
      lines: [
        { lineId: 'l1', exerciseId: bench.id, nameSnapshot: bench.name, metric: 'weight_reps', targetSets: 3, notes: null },
      ],
    },
  ];

  jest.mocked(useSession).mockReturnValue({ user: { uid: 'user-1' } as never, isLoading: false });
  jest.mocked(subscribeToRecentSessions).mockImplementation((_uid, { onData }) => {
    onData([]);
    return jest.fn();
  });
  jest.mocked(subscribeToPlans).mockImplementation((_uid, { onData }) => {
    onData(plans);
    return jest.fn();
  });
  jest.mocked(subscribeToRecentActivities).mockImplementation((_uid, _max, { onData }) => {
    onData([]);
    return jest.fn();
  });
  jest.mocked(subscribeToProgressSettings).mockImplementation((_uid, { onData }) => {
    onData({ weeklyGoal: 3, movementGoalDays: 5, goalWeightLbs: null });
    return jest.fn();
  });
  jest.mocked(subscribeToUnscheduledWorkouts).mockImplementation((_uid, { onData }) => {
    onData(tray);
    return jest.fn();
  });
  jest.mocked(subscribeToScheduledWorkouts).mockImplementation((_uid, start, _end, { onData }) => {
    onData(start === '2026-11-08' ? dated : []);
    return jest.fn();
  });
  mockedMove.mockResolvedValue(undefined);
  mockedAdd.mockResolvedValue('new-entry');
  mockedSkip.mockResolvedValue(undefined);
  mockedDelete.mockResolvedValue(undefined);
  mockedCreate.mockResolvedValue('new-session');
  jest.mocked(confirm).mockResolvedValue(true);
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

const user = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

describe('PlannerScreen', () => {
  it('shows the week with what is planned, and sums it up', async () => {
    await render(<PlannerScreen />);

    expect(screen.getByText('Nov 8 – 14')).toBeTruthy();
    expect(screen.getByText('2 planned · goal 3')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Leg day, 2 exercises' })).toBeTruthy();
  });

  it('shows the Unscheduled tray', async () => {
    await render(<PlannerScreen />);

    expect(screen.getByText('Unscheduled')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mobility, Idea' })).toBeTruthy();
  });

  // Tap a handle, tap a day.
  it('moves a plan to an empty day in two taps', async () => {
    await render(<PlannerScreen />);

    await user().press(screen.getByRole('button', { name: 'Move Leg day' }));
    expect(screen.getByText('Moving Leg day')).toBeTruthy();
    await user().press(screen.getByRole('button', { name: 'Move to Fri, Nov 13' }));

    expect(mockedMove).toHaveBeenCalledWith('user-1', [{ id: 'Leg day', dateKey: '2026-11-13' }]);
  });

  it('swaps two plans when one is dropped on the other’s day', async () => {
    await render(<PlannerScreen />);

    await user().press(screen.getByRole('button', { name: 'Move Leg day' }));
    await user().press(screen.getByRole('button', { name: 'Swap to Sat, Nov 14' }));

    expect(mockedMove).toHaveBeenCalledWith('user-1', [
      { id: 'Leg day', dateKey: '2026-11-14' },
      { id: 'Pull day', dateKey: '2026-11-12' },
    ]);
  });

  it('puts a plan back in the tray', async () => {
    await render(<PlannerScreen />);

    await user().press(screen.getByRole('button', { name: 'Move Leg day' }));
    await user().press(screen.getByRole('button', { name: 'Put back here, pick a day later' }));

    expect(mockedMove).toHaveBeenCalledWith('user-1', [{ id: 'Leg day', dateKey: null }]);
  });

  it('stops moving on Cancel', async () => {
    await render(<PlannerScreen />);

    await user().press(screen.getByRole('button', { name: 'Move Leg day' }));
    await user().press(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText('Moving Leg day')).toBeNull();
  });

  it('pages to the next week', async () => {
    await render(<PlannerScreen />);

    await user().press(screen.getByRole('button', { name: 'Next week' }));

    expect(screen.getByText('Nov 15 – 21')).toBeTruthy();
  });

  it('plans a starter workout on a day from its +', async () => {
    await render(<PlannerScreen />);

    await user().press(screen.getByRole('button', { name: 'Plan a workout on Fri, Nov 13' }));
    await user().press(screen.getByRole('radio', { name: /^Upper body/ }));
    await user().press(screen.getByRole('button', { name: 'Plan Upper body for Fri, Nov 13' }));

    expect(mockedAdd).toHaveBeenCalledWith('user-1', {
      dateKey: '2026-11-13',
      label: 'Upper body',
      planId: 'starter-upper',
      exerciseIds: ['bench', 'row', 'ohp', 'pullup', 'dip'],
    });
    // Groups see the days ahead that are planned.
    expect(syncGroups).toHaveBeenCalled();
  });

  it('plans one of the lifter’s own templates', async () => {
    await render(<PlannerScreen />);

    await user().press(screen.getByRole('button', { name: 'Plan a workout on Fri, Nov 13' }));
    await user().press(screen.getByRole('button', { name: 'Plan Push day for Fri, Nov 13' }));

    expect(mockedAdd).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ planId: 'push', label: 'Push day', exerciseIds: [bench.id] }),
    );
  });

  describe('a plan’s options', () => {
    const open = async () => {
      await render(<PlannerScreen />);
      await user().press(screen.getByRole('button', { name: 'Leg day, 2 exercises' }));
    };

    it('says when it is planned for', async () => {
      await open();

      expect(screen.getByText('Planned for Thu, Nov 12 · 2 exercises')).toBeTruthy();
    });

    it('starts it now', async () => {
      await open();
      await user().press(screen.getByRole('button', { name: 'Start now' }));

      expect(mockedCreate).toHaveBeenCalledWith('user-1', expect.objectContaining({ title: 'Leg day' }));
    });

    it('pushes the rest of the week back', async () => {
      await open();
      await user().press(screen.getByRole('button', { name: /^Push the rest of the week back/ }));

      expect(mockedMove).toHaveBeenCalledWith('user-1', [
        { id: 'Leg day', dateKey: '2026-11-13' },
        { id: 'Pull day', dateKey: '2026-11-15' },
      ]);
    });

    it('moves it to a day picked from the row', async () => {
      await open();
      await user().press(screen.getByRole('button', { name: 'Fri, Nov 13' }));

      expect(mockedMove).toHaveBeenCalledWith('user-1', [{ id: 'Leg day', dateKey: '2026-11-13' }]);
    });

    it('skips it', async () => {
      await open();
      await user().press(screen.getByRole('button', { name: /^Skip this one/ }));

      expect(mockedSkip).toHaveBeenCalledWith('user-1', 'Leg day');
    });

    it('deletes it after asking', async () => {
      await open();
      await user().press(screen.getByRole('button', { name: /^Delete/ }));

      expect(confirm).toHaveBeenCalled();
      expect(mockedDelete).toHaveBeenCalledWith('user-1', expect.objectContaining({ id: 'Leg day' }));
    });

    // Leaving a group plan also updates its going list, which waits for Groups.
    it('does not offer to delete a group plan', async () => {
      dated = [entry('Leg day', '2026-11-12', { sharedPlanId: 'shared', groupId: 'g' }) as DatedScheduledWorkout];
      await open();

      expect(screen.queryByRole('button', { name: /^Delete/ })).toBeNull();
      expect(screen.getByText(/Leave it from the website/)).toBeTruthy();
    });
  });

  it('lists templates, opens one, and starts one', async () => {
    await render(<PlannerScreen />);

    await user().press(screen.getByRole('button', { name: 'Start Push day' }));
    expect(mockedCreate).toHaveBeenCalledWith('user-1', expect.objectContaining({ planId: 'push' }));

    await user().press(screen.getByRole('button', { name: 'Push day, 1 exercise' }));
    expect(router.push).toHaveBeenCalledWith('/templates/push');

    await user().press(screen.getByRole('link', { name: 'New' }));
    expect(router.push).toHaveBeenCalledWith('/templates/new');
  });
});
