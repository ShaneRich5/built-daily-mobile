import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { SavedWorkoutScreen } from '@/components/session/saved-workout-screen';
import { useSession } from '@/contexts/session';
import { bench, dips, line, log, session } from '@/lib/session/session-test-helpers';
import { confirm } from '@/services/confirm';
import { deleteSession, updateSession } from '@/services/firestore/workout-repository';

jest.mock('@/contexts/session');
jest.mock('@/services/firestore/workout-repository');
jest.mock('@/services/confirm');
jest.mock('expo-router', () => ({
  router: { canGoBack: jest.fn(() => true), back: jest.fn(), replace: jest.fn(), push: jest.fn() },
}));

const mockedUpdate = jest.mocked(updateSession);
const mockedDelete = jest.mocked(deleteSession);
const mockedConfirm = jest.mocked(confirm);
const mockedRouter = jest.mocked(router);

const pushDay = () =>
  session(
    'done',
    [
      line(bench, [
        log({ weight: 135, reps: 8, done: true }),
        log({ weight: 145, reps: 6, done: true, note: 'grinder' }),
        log(),
      ]),
      line(dips, [log({ reps: 12, done: true })]),
    ],
    {
      workoutNote: 'Felt strong today.',
      exerciseNotesByLineId: { 'line-custom-dips': 'Leaned forward.' },
    },
  );

beforeEach(() => {
  jest.mocked(useSession).mockReturnValue({ user: { uid: 'user-1' } as never, isLoading: false });
  mockedUpdate.mockResolvedValue(undefined);
  mockedDelete.mockResolvedValue(undefined);
  mockedConfirm.mockResolvedValue(true);
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('SavedWorkoutScreen', () => {
  it('reads back what the workout was', async () => {
    await render(<SavedWorkoutScreen session={pushDay()} />);

    expect(screen.getByRole('header', { name: 'Push day' })).toBeTruthy();
    expect(screen.getByText('Finished')).toBeTruthy();
    expect(screen.getByText('Tue, Nov 10 · 6:10 PM')).toBeTruthy();
    expect(screen.getByText('Felt strong today.')).toBeTruthy();
  });

  it('sums it up in a few figures', async () => {
    await render(<SavedWorkoutScreen session={pushDay()} />);

    expect(screen.getByLabelText('2 Exercises')).toBeTruthy();
    // The empty third bench row is not a set.
    expect(screen.getByLabelText('3 Sets')).toBeTruthy();
    expect(screen.getByLabelText('1,950 lb moved')).toBeTruthy();
  });

  it('lists each exercise with its logged sets and notes', async () => {
    await render(<SavedWorkoutScreen session={pushDay()} />);

    expect(screen.getByLabelText('Set 1: 135 lb × 8')).toBeTruthy();
    expect(screen.getByLabelText('Set 2: 145 lb × 6. grinder')).toBeTruthy();
    expect(screen.queryByLabelText(/^Set 3/)).toBeNull();
    expect(screen.getByLabelText('Set 1: 12 reps')).toBeTruthy();
    expect(screen.getByText('Leaned forward.')).toBeTruthy();
  });

  it('says so for a workout logged without any exercises', async () => {
    await render(<SavedWorkoutScreen session={session('empty', [])} />);

    expect(screen.getByText('Logged without details — you still showed up.')).toBeTruthy();
    expect(screen.queryByLabelText(/Exercises$/)).toBeNull();
  });

  it('goes to the edit screen', async () => {
    await render(<SavedWorkoutScreen session={pushDay()} />);

    await userEvent.press(screen.getByRole('button', { name: 'Edit workout' }));

    expect(mockedRouter.push).toHaveBeenCalledWith('/session/done/edit');
  });

  // Reopening clears `endedAt`, which is what marks a session as in progress.
  it('moves the workout back to in progress', async () => {
    await render(<SavedWorkoutScreen session={pushDay()} />);

    await userEvent.press(screen.getByRole('button', { name: 'More actions' }));
    await userEvent.press(screen.getByRole('button', { name: 'Move back to in progress' }));

    expect(mockedUpdate).toHaveBeenCalledWith('user-1', 'done', {
      status: 'in_progress',
      endedAt: null,
    });
  });

  it('deletes the workout after asking, and goes home', async () => {
    await render(<SavedWorkoutScreen session={pushDay()} />);

    await userEvent.press(screen.getByRole('button', { name: 'More actions' }));
    await userEvent.press(screen.getByRole('button', { name: 'Delete workout' }));

    expect(mockedDelete).toHaveBeenCalledWith('user-1', 'done');
    expect(mockedRouter.replace).toHaveBeenCalledWith('/');
  });

  it('keeps the workout when the delete is not confirmed', async () => {
    mockedConfirm.mockResolvedValue(false);
    await render(<SavedWorkoutScreen session={pushDay()} />);

    await userEvent.press(screen.getByRole('button', { name: 'More actions' }));
    await userEvent.press(screen.getByRole('button', { name: 'Delete workout' }));

    expect(mockedDelete).not.toHaveBeenCalled();
  });

  it('says so when reopening fails', async () => {
    mockedUpdate.mockRejectedValue(new Error('offline'));
    await render(<SavedWorkoutScreen session={pushDay()} />);

    await userEvent.press(screen.getByRole('button', { name: 'More actions' }));
    await userEvent.press(screen.getByRole('button', { name: 'Move back to in progress' }));

    expect(await screen.findByText(/Could not reopen this workout/)).toBeTruthy();
  });
});
