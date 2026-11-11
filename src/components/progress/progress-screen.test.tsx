import { render, screen, userEvent, within } from '@testing-library/react-native';

import { ProgressScreen } from '@/components/progress/progress-screen';
import { useSession } from '@/contexts/session';
import { line, log, session } from '@/lib/session/session-test-helpers';
import type { CatalogExercise } from '@/lib/exercise-catalog';
import {
  subscribeToProgressSettings,
  subscribeToRecentActivities,
  subscribeToScheduledWorkouts,
} from '@/services/firestore/home-repository';
import { saveProgressSettings } from '@/services/firestore/planner-repository';
import { logBodyWeight, subscribeToBodyWeight } from '@/services/firestore/progress-repository';
import { subscribeToRecentSessions } from '@/services/firestore/workout-repository';
import type { Activity } from '@/types/activity';
import type { BodyWeightEntry, ProgressSettings } from '@/types/progress';
import type { WorkoutSession } from '@/types/workout';

jest.mock('@/contexts/session');
jest.mock('@/services/firestore/workout-repository');
jest.mock('@/services/firestore/home-repository');
jest.mock('@/services/firestore/planner-repository');
jest.mock('@/services/firestore/progress-repository');
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
}));

// Wednesday, Nov 11, 2026. The week runs Sun Nov 8 – Sat Nov 14.
const NOW = new Date(2026, 10, 11, 9, 0);

const lift = (id: string, name: string): CatalogExercise => ({ id, name, metric: 'weight_reps' });
const bench = lift('bench', 'Barbell bench press');
const squat = lift('squat', 'Barbell back squat');

let sessions: WorkoutSession[];
let activities: Activity[];
let weights: BodyWeightEntry[];
let settings: ProgressSettings;

const walk = (activityDate: string): Activity => ({
  id: `walk-${activityDate}`,
  activityTypeId: 'walk',
  activityDate,
  activityTime: null,
  durationMin: 30,
  distanceMiles: null,
  locationName: null,
  notes: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
});

const weighIn = (dateKey: string, weightLbs: number): BodyWeightEntry => ({
  id: dateKey,
  dateKey,
  weightLbs,
  createdAt: new Date(0),
});

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  sessions = [];
  activities = [];
  weights = [];
  settings = { weeklyGoal: 3, movementGoalDays: 5, goalWeightLbs: null };

  jest.mocked(useSession).mockReturnValue({ user: { uid: 'user-1' } as never, isLoading: false });
  jest.mocked(subscribeToRecentSessions).mockImplementation((_uid, { onData }) => {
    onData(sessions);
    return jest.fn();
  });
  jest.mocked(subscribeToRecentActivities).mockImplementation((_uid, _max, { onData }) => {
    onData(activities);
    return jest.fn();
  });
  jest.mocked(subscribeToScheduledWorkouts).mockImplementation((_uid, _start, _end, { onData }) => {
    onData([]);
    return jest.fn();
  });
  jest.mocked(subscribeToBodyWeight).mockImplementation((_uid, _max, { onData }) => {
    onData(weights);
    return jest.fn();
  });
  jest.mocked(subscribeToProgressSettings).mockImplementation((_uid, { onData }) => {
    onData(settings);
    return jest.fn();
  });
  jest.mocked(saveProgressSettings).mockResolvedValue(undefined);
  jest.mocked(logBodyWeight).mockResolvedValue('new-weigh-in');
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

const user = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

describe('Progress', () => {
  it('shows this week, the best lifts and what has been earned', async () => {
    sessions = [
      session('old', [line(squat, [log({ weight: 205, reps: 5, done: true })])], { workoutDate: '2026-10-01' }),
      session('push', [line(bench, [log({ weight: 145, reps: 6, done: true })])], { workoutDate: '2026-11-09' }),
    ];
    activities = [walk('2026-11-10')];

    await render(<ProgressScreen />);

    expect(screen.getByRole('header', { name: 'Progress' })).toBeTruthy();
    expect(screen.getByLabelText('1 of 3 workouts this week')).toBeTruthy();
    expect(screen.getByLabelText('Active days, workouts or activities: 2 of 5')).toBeTruthy();

    expect(screen.getByText('Barbell bench press')).toBeTruthy();
    expect(screen.getByText('145 × 6')).toBeTruthy();
    expect(screen.getByText('205 × 5')).toBeTruthy();
    // Only the lift from the last two weeks is new.
    expect(screen.getAllByText('New PR')).toHaveLength(1);

    expect(screen.getByLabelText(/^First workout, earned/)).toBeTruthy();
    expect(screen.getByLabelText(/^First personal record, earned/)).toBeTruthy();
    expect(screen.getByText('Next: 10 workouts')).toBeTruthy();
  });

  it('starts out calm for someone with nothing logged', async () => {
    await render(<ProgressScreen />);

    expect(screen.getByText(/your best lifts show up here/)).toBeTruthy();
    expect(screen.getByText(/Log a weigh-in whenever you like/)).toBeTruthy();
    expect(screen.getByText('Next: First workout')).toBeTruthy();
  });

  it('shows the latest weigh-in against a month ago, and the goal', async () => {
    weights = [weighIn('2026-10-05', 184), weighIn('2026-11-10', 182.4)];
    settings = { ...settings, goalWeightLbs: 178 };

    await render(<ProgressScreen />);

    expect(screen.getByText('182.4')).toBeTruthy();
    expect(screen.getByText('lb · −1.6 in 30 days')).toBeTruthy();
    expect(screen.getByText('Goal 178 lb')).toBeTruthy();
    expect(screen.getByLabelText(/^Weight trend over the last 2 weigh-ins/)).toBeTruthy();
  });

  it('logs today’s weight', async () => {
    await render(<ProgressScreen />);

    await user().type(screen.getByLabelText('Today’s weight in pounds'), '181.5');
    await user().press(screen.getByRole('button', { name: 'Log today’s weight' }));

    expect(logBodyWeight).toHaveBeenCalledWith('user-1', '2026-11-11', 181.5);
    expect(screen.getByLabelText('Today’s weight in pounds').props.value).toBe('');
  });

  it('refuses a weight that is not one', async () => {
    await render(<ProgressScreen />);

    await user().type(screen.getByLabelText('Today’s weight in pounds'), '0');
    await user().press(screen.getByRole('button', { name: 'Log today’s weight' }));

    expect(logBodyWeight).not.toHaveBeenCalled();
    expect(screen.getByText('Enter a weight in pounds.')).toBeTruthy();
  });

  it('saves new goals from the sheet', async () => {
    await render(<ProgressScreen />);

    await user().press(screen.getByRole('button', { name: 'Edit goals' }));
    const sheet = screen.getByRole('header', { name: 'Goals' });
    expect(sheet).toBeTruthy();

    await user().press(screen.getByRole('radio', { name: '4 workouts a week' }));
    await user().press(screen.getByRole('radio', { name: 'Active every day' }));
    await user().type(screen.getByLabelText('Goal weight (optional, lb)'), '178');
    await user().press(screen.getByRole('button', { name: 'Save goals' }));

    expect(saveProgressSettings).toHaveBeenCalledWith('user-1', {
      weeklyGoal: 4,
      movementGoalDays: 7,
      goalWeightLbs: 178,
    });
    expect(screen.queryByRole('header', { name: 'Goals' })).toBeNull();
  });

  it('keeps the sheet open when a goal weight is not a weight', async () => {
    await render(<ProgressScreen />);

    await user().press(screen.getByRole('button', { name: 'Edit goals' }));
    await user().type(screen.getByLabelText('Goal weight (optional, lb)'), 'lots');
    await user().press(screen.getByRole('button', { name: 'Save goals' }));

    expect(saveProgressSettings).not.toHaveBeenCalled();
    expect(within(screen.getByTestId('goals-sheet')).getByText(/Enter a goal weight/)).toBeTruthy();
  });
});
