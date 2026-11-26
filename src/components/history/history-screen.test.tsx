import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { HistoryScreen } from '@/components/history/history-screen';
import { useSession } from '@/contexts/session';
import { bench, line, log, session } from '@/lib/session/session-test-helpers';
import { confirm } from '@/services/confirm';
import { deleteSessions, subscribeToRecentSessions } from '@/services/firestore/workout-repository';
import { syncGroups } from '@/services/group-sync';

jest.mock('@/contexts/session');
jest.mock('@/services/confirm');
jest.mock('@/services/firestore/workout-repository');
jest.mock('@/services/group-sync');
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
}));

const USER = { uid: 'user-1' };
const done = (id: string, title: string) => ({
  ...session(id, [line(bench, [log({ weight: 135, reps: 8, done: true })])], {
    status: 'completed',
  }),
  title,
});

beforeEach(() => {
  jest.mocked(useSession).mockReturnValue({ user: USER as never, isLoading: false });
  jest.mocked(subscribeToRecentSessions).mockImplementation((_uid, { onData }) => {
    onData([done('s1', 'Push day'), done('s2', 'Pull day'), done('s3', 'Leg day')]);
    return jest.fn();
  });
  jest.mocked(confirm).mockResolvedValue(true);
  jest.mocked(deleteSessions).mockResolvedValue(undefined);
});

afterEach(() => jest.clearAllMocks());

describe('History', () => {
  it('opens a workout when not selecting', async () => {
    await render(<HistoryScreen />);

    await userEvent.press(screen.getByRole('button', { name: /^Push day/ }));
    expect(router.push).toHaveBeenCalledWith('/session/s1');
  });

  it('selects several workouts and deletes them in one go', async () => {
    await render(<HistoryScreen />);

    await userEvent.press(screen.getByRole('button', { name: 'Select' }));
    await userEvent.press(screen.getByRole('button', { name: 'Push day' }));
    await userEvent.press(screen.getByRole('button', { name: 'Leg day' }));
    expect(screen.getByRole('button', { name: 'Push day, selected' })).toBeTruthy();
    await userEvent.press(screen.getByRole('button', { name: 'Delete 2 workouts' }));

    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ title: 'Delete 2 workouts?' }));
    expect(deleteSessions).toHaveBeenCalledWith('user-1', ['s1', 's3']);
    expect(syncGroups).toHaveBeenCalledWith(USER);
    expect(router.push).not.toHaveBeenCalled();
  });

  it('deletes nothing when the lifter thinks better of it', async () => {
    jest.mocked(confirm).mockResolvedValue(false);
    await render(<HistoryScreen />);

    await userEvent.press(screen.getByRole('button', { name: 'Select' }));
    await userEvent.press(screen.getByRole('button', { name: 'Pull day' }));
    await userEvent.press(screen.getByRole('button', { name: 'Delete 1 workout' }));

    expect(deleteSessions).not.toHaveBeenCalled();
  });
});
