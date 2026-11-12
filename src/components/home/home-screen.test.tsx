import { act, render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { HomeScreen } from '@/components/home/home-screen';
import { useSession } from '@/contexts/session';
import { bench, line, log, session } from '@/lib/session/session-test-helpers';
import { signOut } from '@/services/auth';
import {
  logActivity,
  moveScheduledWorkouts,
  skipScheduledWorkout,
  subscribeToProgressSettings,
  subscribeToRecentActivities,
  subscribeToScheduledWorkouts,
} from '@/services/firestore/home-repository';
import {
  createSession,
  subscribeToPlans,
  subscribeToRecentSessions,
} from '@/services/firestore/workout-repository';
import type { Activity } from '@/types/activity';
import type { DatedScheduledWorkout } from '@/types/planner';
import type { WorkoutPlan, WorkoutSession } from '@/types/workout';

jest.mock('@/contexts/session');
jest.mock('@/services/auth');
jest.mock('@/services/firestore/workout-repository');
jest.mock('@/services/firestore/home-repository');
jest.mock('expo-router', () => ({
  router: { canGoBack: jest.fn(() => true), back: jest.fn(), replace: jest.fn(), push: jest.fn() },
}));

const mockedRouter = jest.mocked(router);
const mockedCreate = jest.mocked(createSession);
const mockedMove = jest.mocked(moveScheduledWorkouts);
const mockedSkip = jest.mocked(skipScheduledWorkout);
const mockedLog = jest.mocked(logActivity);

// Wednesday, Nov 11, 2026. The week runs Sun Nov 8 – Sat Nov 14.
const NOW = new Date(2026, 10, 11, 9, 0);

let sessions: WorkoutSession[];
let plans: WorkoutPlan[];
let entries: DatedScheduledWorkout[];
let activities: Activity[];

function plan(id: string, name: string): WorkoutPlan {
  return {
    id,
    name,
    source: 'custom',
    createdAt: new Date(2026, 0, 1),
    updatedAt: new Date(2026, 0, 1),
    lines: [
      {
        lineId: `${id}-1`,
        exerciseId: bench.id,
        nameSnapshot: bench.name,
        metric: 'weight_reps',
        targetSets: 3,
        notes: null,
      },
    ],
  };
}

function entry(id: string, dateKey: string): DatedScheduledWorkout {
  return {
    id,
    dateKey,
    label: 'Leg day',
    planId: 'legs',
    exerciseIds: ['squat'],
    status: 'planned',
    sessionId: null,
    createdAt: new Date(2026, 10, 1),
    sharedPlanId: null,
    groupId: null,
  };
}

const done = (id: string, workoutDate: string, planId: string | null = null) =>
  session(id, [line(bench, [log({ weight: 135, reps: 8, done: true })])], {
    title: id,
    workoutDate,
    planId,
  });

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  sessions = [];
  plans = [];
  entries = [];
  activities = [];

  jest.mocked(useSession).mockReturnValue({
    user: { uid: 'user-1', displayName: 'Shane', email: 'shane@example.com' } as never,
    isLoading: false,
  });
  jest.mocked(subscribeToRecentSessions).mockImplementation((_uid, { onData }) => {
    onData(sessions);
    return jest.fn();
  });
  jest.mocked(subscribeToPlans).mockImplementation((_uid, { onData }) => {
    onData(plans);
    return jest.fn();
  });
  jest.mocked(subscribeToScheduledWorkouts).mockImplementation((_uid, _start, _end, { onData }) => {
    onData(entries);
    return jest.fn();
  });
  jest.mocked(subscribeToRecentActivities).mockImplementation((_uid, _max, { onData }) => {
    onData(activities);
    return jest.fn();
  });
  jest.mocked(subscribeToProgressSettings).mockImplementation((_uid, { onData }) => {
    onData({ weeklyGoal: 3, movementGoalDays: 5, goalWeightLbs: null });
    return jest.fn();
  });
  mockedCreate.mockResolvedValue('new-session');
  mockedMove.mockResolvedValue(undefined);
  mockedSkip.mockResolvedValue(undefined);
  mockedLog.mockResolvedValue('new-activity');
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

const user = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

describe('Home', () => {
  it('shows the day and the app name', async () => {
    await render(<HomeScreen />);

    expect(screen.getByText('Wednesday, Nov 11')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Built Daily' })).toBeTruthy();
  });

  it('starts an empty workout when there is nothing to suggest', async () => {
    await render(<HomeScreen />);

    await user().press(screen.getByRole('button', { name: 'Start empty workout' }));

    expect(mockedCreate).toHaveBeenCalledWith('user-1', expect.objectContaining({ lines: [] }));
    expect(mockedRouter.push).toHaveBeenCalledWith('/session/new-session');
  });

  // The rotation: the template done longest ago is next.
  it('suggests the template done longest ago, and starts it in one tap', async () => {
    plans = [plan('push', 'Push day'), plan('pull', 'Pull day')];
    sessions = [done('a', '2026-11-09', 'push'), done('b', '2026-11-07', 'pull')];
    await render(<HomeScreen />);

    await user().press(screen.getByRole('button', { name: /^Start Pull day/ }));

    expect(mockedCreate).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ title: 'Pull day', planId: 'pull' }),
    );
  });

  it('offers the other templates and an empty workout in the Start menu', async () => {
    plans = [plan('push', 'Push day'), plan('pull', 'Pull day')];
    sessions = [done('a', '2026-11-09', 'push')];
    await render(<HomeScreen />);

    await user().press(screen.getByRole('button', { name: 'Start a different workout' }));
    await user().press(screen.getByRole('button', { name: /^Push day/ }));

    expect(mockedCreate).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ title: 'Push day', planId: 'push' }),
    );
  });

  it('offers to resume a workout in progress instead of starting one', async () => {
    sessions = [
      session('open', [line(bench, [log({ weight: 135, reps: 8, done: true }), log()])], {
        status: 'in_progress',
        title: 'Push day',
      }),
    ];
    await render(<HomeScreen />);

    expect(screen.queryByRole('button', { name: 'Start empty workout' })).toBeNull();
    await user().press(screen.getByRole('button', { name: 'Resume workout' }));

    expect(mockedRouter.push).toHaveBeenCalledWith('/session/open');
  });

  it('counts this week against the goal', async () => {
    sessions = [done('mon', '2026-11-09'), done('last-week', '2026-11-04')];
    await render(<HomeScreen />);

    expect(screen.getByLabelText('1 of 3 workouts this week')).toBeTruthy();
    expect(screen.getByText('Two more by Saturday hits your weekly goal.')).toBeTruthy();
  });

  it('starts a planned workout from its day in the week', async () => {
    plans = [plan('legs', 'Leg day')];
    entries = [entry('thu', '2026-11-12')];
    await render(<HomeScreen />);

    await user().press(screen.getByRole('button', { name: 'Thu, Nov 12: Leg day planned' }));

    expect(mockedCreate).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ title: 'Leg day', planId: 'legs' }),
    );
  });

  it('lists recent workouts and activities, and opens a workout', async () => {
    sessions = [done('Push day', '2026-11-09')];
    activities = [
      {
        id: 'walk',
        activityTypeId: 'walk',
        activityDate: '2026-11-10',
        activityTime: null,
        durationMin: 35,
        distanceMiles: null,
        locationName: null,
        notes: null,
        createdAt: new Date(2026, 10, 10),
        updatedAt: new Date(2026, 10, 10),
      },
    ];
    await render(<HomeScreen />);

    expect(screen.getByText('Tue, Nov 10 · 35 min · activity')).toBeTruthy();
    await user().press(screen.getByRole('button', { name: /^Push day, Mon, Nov 9/ }));

    expect(mockedRouter.push).toHaveBeenCalledWith('/session/Push day');
  });

  describe('a planned workout that slid past', () => {
    beforeEach(() => {
      entries = [entry('tue', '2026-11-10')];
    });

    it('gets a calm catch-up card', async () => {
      await render(<HomeScreen />);

      expect(screen.getByRole('header', { name: 'Leg day slid past yesterday' })).toBeTruthy();
    });

    it('moves to today with "Do it today"', async () => {
      await render(<HomeScreen />);

      await user().press(screen.getByRole('button', { name: 'Do it today' }));

      expect(mockedMove).toHaveBeenCalledWith('user-1', [{ id: 'tue', dateKey: '2026-11-11' }]);
    });

    it('moves to another day, or to no day, with "Pick a day"', async () => {
      await render(<HomeScreen />);

      await user().press(screen.getByRole('button', { name: 'Pick a day' }));
      await user().press(screen.getByRole('button', { name: /^No day yet/ }));

      expect(mockedMove).toHaveBeenCalledWith('user-1', [{ id: 'tue', dateKey: null }]);
    });

    it('is skipped with "Skip it"', async () => {
      await render(<HomeScreen />);

      await user().press(screen.getByRole('button', { name: 'Skip it' }));

      expect(mockedSkip).toHaveBeenCalledWith('user-1', 'tue');
    });

    // A workout logged that day counts: showing up is what matters.
    it('is not shown once a workout was logged that day', async () => {
      sessions = [done('a', '2026-11-10')];
      await render(<HomeScreen />);

      expect(screen.queryByRole('button', { name: 'Do it today' })).toBeNull();
    });
  });

  it('logs an activity', async () => {
    await render(<HomeScreen />);

    await user().press(screen.getByRole('button', { name: 'Log activity' }));
    await user().press(screen.getByRole('radio', { name: 'Walk' }));
    await user().type(screen.getByLabelText('Minutes'), '35');
    await user().press(screen.getByRole('button', { name: 'Log walk' }));

    expect(mockedLog).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        activityTypeId: 'walk',
        activityDate: '2026-11-11',
        durationMin: 35,
      }),
    );
  });

  it('keeps the activity sheet open, with an error, when logging fails', async () => {
    mockedLog.mockRejectedValue(new Error('offline'));
    await render(<HomeScreen />);

    await user().press(screen.getByRole('button', { name: 'Log activity' }));
    await user().press(screen.getByRole('radio', { name: 'Walk' }));
    await user().press(screen.getByRole('button', { name: 'Log walk' }));

    expect(screen.getByText(/Could not log that/)).toBeTruthy();
  });

  it('opens the catalog and history, and signs out, from the account menu', async () => {
    await render(<HomeScreen />);

    await user().press(screen.getByRole('button', { name: 'Account menu' }));
    expect(screen.getByText('shane@example.com')).toBeTruthy();
    await user().press(screen.getByRole('button', { name: 'Exercise catalog' }));
    expect(mockedRouter.push).toHaveBeenCalledWith('/exercises');

    await user().press(screen.getByRole('button', { name: 'Account menu' }));
    await user().press(screen.getByRole('button', { name: 'Sign out' }));
    expect(signOut).toHaveBeenCalled();
  });

  it('says so when workouts cannot be loaded', async () => {
    jest.mocked(subscribeToRecentSessions).mockImplementation((_uid, { onError }) => {
      onError(new Error('network'));
      return jest.fn();
    });
    await render(<HomeScreen />);
    await act(async () => {});

    expect(screen.getByText('Could not load your workouts.')).toBeTruthy();
  });
});
