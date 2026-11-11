import { act, render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { WorkoutScreen } from '@/components/session/workout-screen';
import { useSession } from '@/contexts/session';
import { bench, dips, fly, line, log, session } from '@/lib/session/session-test-helpers';
import { confirm } from '@/services/confirm';
import { syncGroups } from '@/services/group-sync';
import {
  deleteSession,
  subscribeToRecentSessions,
  updateSession,
} from '@/services/firestore/workout-repository';
import type { WorkoutSession } from '@/types/workout';

jest.mock('@/contexts/session');
jest.mock('@/services/firestore/workout-repository');
jest.mock('@/services/confirm');
jest.mock('expo-router', () => ({
  router: { canGoBack: jest.fn(() => true), back: jest.fn(), replace: jest.fn(), push: jest.fn() },
}));

const mockedUpdate = jest.mocked(updateSession);
const mockedDelete = jest.mocked(deleteSession);
const mockedSubscribe = jest.mocked(subscribeToRecentSessions);
const mockedConfirm = jest.mocked(confirm);
const mockedRouter = jest.mocked(router);

/** Past workouts the screen reads "last time" and "usually next" from. */
let history: WorkoutSession[];

/** The workout on screen: bench with one set done and one to go, then an untouched fly. */
const live = () =>
  session(
    'live',
    [
      line(bench, [log({ weight: 135, reps: 8, done: true }), log({ done: false })]),
      line(fly, [log({ done: false })]),
    ],
    { status: 'in_progress' },
  );

const finished = () =>
  session('done', [line(bench, [log({ weight: 135, reps: 8, done: true })])], {
    status: 'completed',
  });

/** The patch handed to the most recent save. */
const lastSave = () => mockedUpdate.mock.calls[mockedUpdate.mock.calls.length - 1][2];

beforeEach(() => {
  jest.useFakeTimers();
  history = [];

  jest.mocked(useSession).mockReturnValue({ user: { uid: 'user-1' } as never, isLoading: false });
  mockedSubscribe.mockImplementation((_uid, { onData }) => {
    onData(history);
    return jest.fn();
  });
  mockedUpdate.mockResolvedValue(undefined);
  mockedDelete.mockResolvedValue(undefined);
  mockedConfirm.mockResolvedValue(true);
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

const user = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

/** Lets the autosave debounce run and its write settle. */
async function waitForAutosave() {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(1500);
  });
}

describe('a workout in progress', () => {
  it('opens on the first exercise that still has sets to do', async () => {
    await render(<WorkoutScreen session={live()} mode="live" />);

    // Bench has a set left, so its card is the open one: its set boxes are showing.
    expect(screen.getByLabelText('Weight for set 2')).toBeTruthy();
    expect(screen.getByText('2 exercises · 1 of 3 sets done')).toBeTruthy();
  });

  it('does not write anything just from being opened', async () => {
    await render(<WorkoutScreen session={live()} mode="live" />);
    await waitForAutosave();

    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it('saves a ticked set on its own, a moment later', async () => {
    await render(<WorkoutScreen session={live()} mode="live" />);

    await user().type(screen.getByLabelText('Weight for set 2'), '145');
    await user().type(screen.getByLabelText('Reps for set 2'), '6');
    await user().press(screen.getByRole('checkbox', { name: 'Set 2 done' }));
    await waitForAutosave();

    expect(mockedUpdate).toHaveBeenCalledWith('user-1', 'live', expect.anything());
    expect(lastSave().lines?.[0].sets).toEqual([
      log({ weight: 135, reps: 8, done: true }),
      log({ weight: 145, reps: 6, done: true }),
    ]);
    // An autosave writes content only — never the status.
    expect(lastSave()).not.toHaveProperty('status');
  });

  // Ticking an empty set means "same as the set before".
  it('fills an empty set from the suggestion when it is ticked', async () => {
    await render(<WorkoutScreen session={live()} mode="live" />);

    await user().press(screen.getByRole('checkbox', { name: 'Set 2 done' }));
    await waitForAutosave();

    expect(lastSave().lines?.[0].sets[1]).toEqual(log({ weight: 135, reps: 8, done: true }));
  });

  it('offers the next exercise once this one is done, and opens it', async () => {
    await render(<WorkoutScreen session={live()} mode="live" />);

    await user().press(screen.getByRole('checkbox', { name: 'Set 2 done' }));
    await user().press(screen.getByRole('button', { name: 'Next exercise' }));

    // The fly card is open now: its own first set is on screen.
    expect(screen.getByRole('button', { name: 'Collapse Cable fly' })).toBeTruthy();
  });

  it('shows what the exercise looked like last time', async () => {
    history = [session('past', [line(fly, [log({ weight: 30, reps: 12, done: true })])])];
    await render(<WorkoutScreen session={live()} mode="live" />);

    expect(screen.getByText('Not started · Last 30 lb × 12')).toBeTruthy();
  });

  it('finishes the workout', async () => {
    await render(<WorkoutScreen session={live()} mode="live" />);

    await user().press(screen.getByRole('button', { name: 'Finish workout' }));

    expect(lastSave()).toMatchObject({ status: 'completed', endedAt: expect.any(Date) });
    // Groups see the day and the workout's name.
    expect(syncGroups).toHaveBeenCalled();
  });

  // Skipping a maybe is not a miss, so it leaves no trace in the saved workout.
  it('leaves untouched maybes out of the finished workout', async () => {
    const withMaybe = session(
      'live',
      [
        line(bench, [log({ weight: 135, reps: 8, done: true })]),
        { ...line(dips, [log({ done: false })]), section: 'maybe' },
      ],
      { status: 'in_progress' },
    );
    await render(<WorkoutScreen session={withMaybe} mode="live" />);

    expect(screen.getByText('Maybe · 1')).toBeTruthy();
    await user().press(screen.getByRole('button', { name: 'Finish workout' }));

    expect(lastSave().lines?.map((l) => l.nameSnapshot)).toEqual(['Bench']);
  });

  it('writes nothing more once it has finished', async () => {
    await render(<WorkoutScreen session={live()} mode="live" />);

    await user().press(screen.getByRole('checkbox', { name: 'Set 2 done' }));
    await user().press(screen.getByRole('button', { name: 'Finish workout' }));
    const writes = mockedUpdate.mock.calls.length;
    await waitForAutosave();

    // The tick's pending autosave must not land after the finish and undo it.
    expect(mockedUpdate).toHaveBeenCalledTimes(writes);
  });

  it('moves a maybe into the plan with "Do it"', async () => {
    const withMaybe = session(
      'live',
      [{ ...line(dips, [log({ done: false })]), section: 'maybe' }],
      { status: 'in_progress' },
    );
    await render(<WorkoutScreen session={withMaybe} mode="live" />);

    await user().press(screen.getByRole('button', { name: 'Do it: move Dips into the plan' }));

    expect(screen.getByRole('button', { name: 'Collapse Dips' })).toBeTruthy();
    expect(screen.queryByText('Maybe · 1')).toBeNull();
  });

  it('adds the exercises picked in the search sheet, in the order picked', async () => {
    history = [session('past', [line(dips, [log({ reps: 10, done: true })])])];
    await render(<WorkoutScreen session={live()} mode="live" />);

    // Two ways in: the button under the list and the + in the action bar.
    await user().press(screen.getAllByRole('button', { name: 'Add exercise' })[0]);
    await user().press(screen.getByRole('button', { name: 'Dips' }));
    await user().press(screen.getByRole('button', { name: 'Add 1 exercise' }));
    await waitForAutosave();

    expect(lastSave().lines?.map((l) => l.nameSnapshot)).toEqual(['Bench', 'Cable fly', 'Dips']);
    expect(lastSave()).toMatchObject({ exerciseCount: 3 });
  });

  it('adds a "usually next" suggestion in one tap', async () => {
    history = [session('past', [line(fly, []), line(dips, [log({ reps: 10, done: true })])])];
    await render(<WorkoutScreen session={live()} mode="live" />);

    await user().press(screen.getByRole('button', { name: 'Add Dips' }));

    expect(screen.getByRole('button', { name: 'Collapse Dips' })).toBeTruthy();
  });

  it('deletes the workout after asking, and goes home', async () => {
    await render(<WorkoutScreen session={live()} mode="live" />);

    await user().press(screen.getByRole('button', { name: 'More actions' }));
    await user().press(screen.getByRole('button', { name: 'Delete workout' }));

    expect(mockedConfirm).toHaveBeenCalled();
    expect(mockedDelete).toHaveBeenCalledWith('user-1', 'live');
    expect(mockedRouter.replace).toHaveBeenCalledWith('/');
  });

  it('keeps the workout when the delete is not confirmed', async () => {
    mockedConfirm.mockResolvedValue(false);
    await render(<WorkoutScreen session={live()} mode="live" />);

    await user().press(screen.getByRole('button', { name: 'More actions' }));
    await user().press(screen.getByRole('button', { name: 'Delete workout' }));

    expect(mockedDelete).not.toHaveBeenCalled();
  });

  it('says so when a save fails', async () => {
    mockedUpdate.mockRejectedValue(new Error('offline'));
    await render(<WorkoutScreen session={live()} mode="live" />);

    await user().press(screen.getByRole('checkbox', { name: 'Set 2 done' }));
    await waitForAutosave();

    expect(screen.getByText('Not saved yet')).toBeTruthy();
  });
});

describe('editing a finished workout', () => {
  it('has nothing to save until something changes', async () => {
    await render(<WorkoutScreen session={finished()} mode="edit" />);

    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    expect(screen.queryByText('Unsaved')).toBeNull();
  });

  it('does not save as you type', async () => {
    await render(<WorkoutScreen session={finished()} mode="edit" />);

    await user().press(screen.getByRole('button', { name: /^Bench,/ }));
    await user().clear(screen.getByLabelText('Reps for set 1'));
    await user().type(screen.getByLabelText('Reps for set 1'), '10');
    await waitForAutosave();

    expect(screen.getByText('Unsaved')).toBeTruthy();
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it('saves on "Save changes" and goes back', async () => {
    await render(<WorkoutScreen session={finished()} mode="edit" />);

    await user().press(screen.getByRole('button', { name: /^Bench,/ }));
    await user().clear(screen.getByLabelText('Reps for set 1'));
    await user().type(screen.getByLabelText('Reps for set 1'), '10');
    await user().press(screen.getByRole('button', { name: 'Save changes' }));

    expect(lastSave().lines?.[0].sets).toEqual([log({ weight: 135, reps: 10, done: true })]);
    // Still a finished workout: the status is not part of an edit.
    expect(lastSave()).not.toHaveProperty('status');
    expect(mockedRouter.back).toHaveBeenCalled();
  });

  // No ticks to press here, so a set with numbers in it is a set that was done.
  it('stores a set added while editing as done', async () => {
    await render(<WorkoutScreen session={finished()} mode="edit" />);

    await user().press(screen.getByRole('button', { name: /^Bench,/ }));
    await user().press(screen.getByRole('button', { name: 'Copy last set' }));
    await user().press(screen.getByRole('button', { name: 'Save changes' }));

    expect(lastSave().lines?.[0].sets).toEqual([
      log({ weight: 135, reps: 8, done: true }),
      log({ weight: 135, reps: 8, done: true }),
    ]);
  });

  it('offers a remove button on each set instead of a tick', async () => {
    await render(<WorkoutScreen session={finished()} mode="edit" />);

    await user().press(screen.getByRole('button', { name: /^Bench,/ }));

    expect(screen.getByRole('button', { name: 'Remove set 1' })).toBeTruthy();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('asks before throwing away changes on Cancel', async () => {
    mockedConfirm.mockResolvedValue(false);
    await render(<WorkoutScreen session={finished()} mode="edit" />);

    await user().press(screen.getByRole('button', { name: /^Bench,/ }));
    await user().press(screen.getByRole('button', { name: 'Copy last set' }));
    await user().press(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockedConfirm).toHaveBeenCalled();
    expect(mockedRouter.back).not.toHaveBeenCalled();
  });

  it('leaves straight away on Cancel when nothing changed', async () => {
    await render(<WorkoutScreen session={finished()} mode="edit" />);

    await user().press(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockedConfirm).not.toHaveBeenCalled();
    expect(mockedRouter.back).toHaveBeenCalled();
    expect(mockedUpdate).not.toHaveBeenCalled();
  });
});
