import { act, renderHook } from '@testing-library/react-native';

import { useSession } from '@/contexts/session';
import { useRecentSessions } from '@/hooks/use-recent-sessions';
import { subscribeToRecentSessions } from '@/services/firestore/workout-repository';
import type { WorkoutSession } from '@/types/workout';

jest.mock('@/contexts/session');
jest.mock('@/services/firestore/workout-repository');

const mockedUseSession = jest.mocked(useSession);
const mockedSubscribe = jest.mocked(subscribeToRecentSessions);

/** The listeners handed to each live subscription, in the order they opened. */
let listeners: Parameters<typeof subscribeToRecentSessions>[1][];
let unsubscribes: jest.Mock[];

function signedInAs(uid: string | null) {
  mockedUseSession.mockReturnValue({
    user: uid ? ({ uid } as never) : null,
    isLoading: false,
  });
}

function session(id: string): WorkoutSession {
  return {
    id,
    status: 'completed',
    title: id,
    planId: null,
    workoutDate: null,
    workoutTime: null,
    startedAt: new Date(0),
    endedAt: null,
    activeDurationSec: null,
    workoutNote: null,
    exerciseNotesByLineId: null,
    lines: [],
    exerciseCount: 0,
    setCount: 0,
    previewExerciseNames: [],
  };
}

beforeEach(() => {
  listeners = [];
  unsubscribes = [];

  mockedSubscribe.mockImplementation((_uid, listener) => {
    listeners.push(listener);
    const unsubscribe = jest.fn();
    unsubscribes.push(unsubscribe);
    return unsubscribe;
  });

  signedInAs('user-1');
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('useRecentSessions', () => {
  it('loads until the first snapshot arrives', async () => {
    const { result } = await renderHook(() => useRecentSessions());

    expect(result.current.isLoading).toBe(true);

    await act(async () => listeners[0].onData([session('a')]));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.sessions.map((s) => s.id)).toEqual(['a']);
  });

  it('reports nothing to load when signed out', async () => {
    signedInAs(null);
    const { result } = await renderHook(() => useRecentSessions());

    expect(result.current).toMatchObject({ isLoading: false, sessions: [] });
    expect(mockedSubscribe).not.toHaveBeenCalled();
  });

  it('describes a failed read', async () => {
    const { result } = await renderHook(() => useRecentSessions());

    await act(async () => listeners[0].onError(new Error('network')));

    expect(result.current.error).toBe('Could not load your workouts.');
  });

  describe('refresh', () => {
    it('drops the old subscription and opens a new one', async () => {
      const { result } = await renderHook(() => useRecentSessions());
      await act(async () => listeners[0].onData([session('a')]));

      await act(async () => result.current.refresh());

      expect(unsubscribes[0]).toHaveBeenCalled();
      expect(mockedSubscribe).toHaveBeenCalledTimes(2);
    });

    // The point of keeping them: the list must not blink out under the spinner.
    it('keeps the workouts on screen while refreshing', async () => {
      const { result } = await renderHook(() => useRecentSessions());
      await act(async () => listeners[0].onData([session('a')]));

      await act(async () => result.current.refresh());

      expect(result.current.isRefreshing).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.sessions.map((s) => s.id)).toEqual(['a']);
    });

    it('settles once the new subscription reports', async () => {
      const { result } = await renderHook(() => useRecentSessions());
      await act(async () => listeners[0].onData([session('a')]));
      await act(async () => result.current.refresh());

      await act(async () => listeners[1].onData([session('a'), session('b')]));

      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.sessions.map((s) => s.id)).toEqual(['a', 'b']);
    });

    it('surfaces an error the refreshed subscription hits', async () => {
      const { result } = await renderHook(() => useRecentSessions());
      await act(async () => listeners[0].onData([session('a')]));
      await act(async () => result.current.refresh());

      await act(async () => listeners[1].onError(new Error('network')));

      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.error).toBe('Could not load your workouts.');
    });
  });

  // A refresh must not resurrect the previous user's workouts, which is why
  // the result carries the uid as well as the attempt.
  it('shows nothing from the previous user after a switch', async () => {
    const { result, rerender } = await renderHook(() => useRecentSessions());
    await act(async () => listeners[0].onData([session('a')]));

    signedInAs('user-2');
    await act(async () => rerender({}));

    expect(result.current.sessions).toEqual([]);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isRefreshing).toBe(false);
  });
});
