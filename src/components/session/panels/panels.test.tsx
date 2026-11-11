import { render, screen, userEvent } from '@testing-library/react-native';

import { ExerciseDetailsPanel } from '@/components/session/panels/exercise-details-panel';
import { ExerciseSearchPanel } from '@/components/session/panels/exercise-search-panel';
import {
  MoveExercisePanel,
  ReorderPanel,
  SwapExercisePanel,
} from '@/components/session/panels/list-panels';
import { WorkoutDetailsPanel } from '@/components/session/panels/workout-details-panel';
import { cleanNumberInput } from '@/components/session/set-inputs';
import { EXERCISE_CATALOG } from '@/lib/exercise-catalog';
import { bench, dips, doneRow, fly, item, log, plank, row } from '@/lib/session/session-test-helpers';

jest.mock('@/services/ids', () => ({
  newCustomExerciseId: () => 'custom-new',
  newLineId: () => 'line-new',
}));

describe('cleanNumberInput', () => {
  it('keeps digits and one decimal point', () => {
    expect(cleanNumberInput('137.5', true)).toBe('137.5');
    expect(cleanNumberInput('1.2.3', true)).toBe('1.23');
  });

  // The decimal key types a comma on many keyboards.
  it('reads a comma as the decimal point', () => {
    expect(cleanNumberInput('137,5', true)).toBe('137.5');
  });

  it('drops the point from a whole-number field', () => {
    expect(cleanNumberInput('8.5', false)).toBe('85');
  });

  it('drops anything that is not a number', () => {
    expect(cleanNumberInput('12 reps', false)).toBe('12');
    expect(cleanNumberInput('-5', true)).toBe('5');
  });
});

describe('ExerciseSearchPanel', () => {
  const [first, second] = EXERCISE_CATALOG;

  it('numbers picks in the order tapped and adds them in that order', async () => {
    const onAdd = jest.fn();
    await render(
      <ExerciseSearchPanel
        mode={{ kind: 'add', afterName: 'Bench', room: 10 }}
        suggested={[]}
        recent={[]}
        onAdd={onAdd}
        onReplace={jest.fn()}
      />,
    );

    expect(screen.getByText('Added after Bench, in the order you pick')).toBeTruthy();
    await userEvent.press(screen.getByRole('button', { name: second.name }));
    await userEvent.press(screen.getByRole('button', { name: first.name }));

    expect(screen.getByRole('button', { name: `${second.name}, picked, number 1` })).toBeTruthy();
    await userEvent.press(screen.getByRole('button', { name: 'Add 2 exercises' }));

    expect(onAdd).toHaveBeenCalledWith([second, first]);
  });

  it('unpicks an exercise tapped a second time', async () => {
    await render(
      <ExerciseSearchPanel
        mode={{ kind: 'add', afterName: null, room: 10 }}
        suggested={[]}
        recent={[]}
        onAdd={jest.fn()}
        onReplace={jest.fn()}
      />,
    );

    await userEvent.press(screen.getByRole('button', { name: first.name }));
    await userEvent.press(screen.getByRole('button', { name: `${first.name}, picked, number 1` }));

    expect(screen.getByRole('button', { name: 'Pick exercises to add' })).toBeDisabled();
  });

  it('will not pick more than there is room for', async () => {
    await render(
      <ExerciseSearchPanel
        mode={{ kind: 'add', afterName: null, room: 1 }}
        suggested={[]}
        recent={[]}
        onAdd={jest.fn()}
        onReplace={jest.fn()}
      />,
    );

    await userEvent.press(screen.getByRole('button', { name: first.name }));
    await userEvent.press(screen.getByRole('button', { name: second.name }));

    expect(screen.getByRole('button', { name: 'Add 1 exercise' })).toBeTruthy();
  });

  it('opens on suggestions when there are some', async () => {
    await render(
      <ExerciseSearchPanel
        mode={{ kind: 'add', afterName: null, room: 10 }}
        suggested={[dips]}
        recent={[]}
        onAdd={jest.fn()}
        onReplace={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Dips' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: first.name })).toBeNull();
  });

  it('adds a name the catalog does not have as a custom exercise', async () => {
    const onAdd = jest.fn();
    await render(
      <ExerciseSearchPanel
        mode={{ kind: 'add', afterName: null, room: 10 }}
        suggested={[]}
        recent={[]}
        onAdd={onAdd}
        onReplace={jest.fn()}
      />,
    );

    await userEvent.type(screen.getByLabelText('Search exercises'), 'Landmine twist');
    expect(screen.getByText('No matches for “Landmine twist”.')).toBeTruthy();

    await userEvent.press(screen.getByRole('tab', { name: 'Hold time' }));
    await userEvent.press(screen.getByRole('button', { name: 'Add “Landmine twist”' }));
    await userEvent.press(screen.getByRole('button', { name: 'Add 1 exercise' }));

    expect(onAdd).toHaveBeenCalledWith([
      { id: 'custom-new', name: 'Landmine twist', metric: 'duration' },
    ]);
  });

  it('replaces straight away when picking a replacement', async () => {
    const onReplace = jest.fn();
    await render(
      <ExerciseSearchPanel
        mode={{ kind: 'replace', currentName: 'Bench' }}
        suggested={[]}
        recent={[]}
        onAdd={jest.fn()}
        onReplace={onReplace}
      />,
    );

    expect(screen.getByText('Pick a replacement for Bench')).toBeTruthy();
    await userEvent.press(screen.getByRole('button', { name: `Use ${first.name}` }));

    expect(onReplace).toHaveBeenCalledWith(first);
  });
});

describe('MoveExercisePanel', () => {
  const exercises = [item(bench), item(fly), item(dips)];

  it('offers every slot, with slots counted among the other exercises', async () => {
    const onMove = jest.fn();
    await render(
      <MoveExercisePanel
        exercises={exercises}
        lineId="line-custom-dips"
        onMove={onMove}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.getByText('Currently 3 of 3 · pick where it goes')).toBeTruthy();
    await userEvent.press(screen.getByRole('button', { name: 'Move to the top' }));
    await userEvent.press(screen.getByRole('button', { name: 'After Bench' }));

    expect(onMove).toHaveBeenNthCalledWith(1, 'line-custom-dips', 0);
    expect(onMove).toHaveBeenNthCalledWith(2, 'line-custom-dips', 1);
  });

  // "After Cable fly" is where Dips already is.
  it('marks where the exercise is now and does not offer it', async () => {
    await render(
      <MoveExercisePanel
        exercises={exercises}
        lineId="line-custom-dips"
        onMove={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.getByText('Here now')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'After Cable fly' })).toBeDisabled();
  });
});

describe('ReorderPanel', () => {
  const exercises = [item(bench), item(fly), item(dips)];

  it('nudges an exercise up or down by one', async () => {
    const onMove = jest.fn();
    await render(<ReorderPanel exercises={exercises} onMove={onMove} onDone={jest.fn()} />);

    await userEvent.press(screen.getByRole('button', { name: 'Move Cable fly up' }));
    await userEvent.press(screen.getByRole('button', { name: 'Move Cable fly down' }));

    expect(onMove).toHaveBeenNthCalledWith(1, 'line-custom-fly', 0);
    expect(onMove).toHaveBeenNthCalledWith(2, 'line-custom-fly', 2);
  });

  it('has nowhere to move the first one up or the last one down', async () => {
    await render(<ReorderPanel exercises={exercises} onMove={jest.fn()} onDone={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Move Bench up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Dips down' })).toBeDisabled();
  });
});

describe('SwapExercisePanel', () => {
  it('offers the alternates saved on the slot', async () => {
    const onSwap = jest.fn();
    await render(
      <SwapExercisePanel
        item={item(bench, { alternates: [fly] })}
        onSwap={onSwap}
        onSearchAll={jest.fn()}
        onKeep={jest.fn()}
      />,
    );

    expect(screen.getByText('Your alternates for this slot')).toBeTruthy();
    await userEvent.press(screen.getByRole('button', { name: 'Use Cable fly' }));

    expect(onSwap).toHaveBeenCalledWith(fly);
  });

  it('can keep the exercise or search for any other', async () => {
    const onKeep = jest.fn();
    const onSearchAll = jest.fn();
    await render(
      <SwapExercisePanel
        item={item(bench)}
        onSwap={jest.fn()}
        onSearchAll={onSearchAll}
        onKeep={onKeep}
      />,
    );

    await userEvent.press(screen.getByRole('button', { name: 'Search any exercise' }));
    await userEvent.press(screen.getByRole('button', { name: 'Keep Bench' }));

    expect(onSearchAll).toHaveBeenCalled();
    expect(onKeep).toHaveBeenCalled();
  });
});

describe('ExerciseDetailsPanel', () => {
  const noop = jest.fn();
  const past = {
    sessionId: 'past',
    performedAt: new Date(2026, 9, 17),
    workoutDate: '2026-10-17',
    metric: 'weight_reps' as const,
    sets: [log({ weight: 30, reps: 12 }), log({ weight: 30, reps: 11 })],
  };

  function renderDetails(overrides: Partial<React.ComponentProps<typeof ExerciseDetailsPanel>> = {}) {
    return render(
      <ExerciseDetailsPanel
        item={item(fly, { sets: [doneRow('30', '12'), row()] })}
        position={3}
        total={4}
        history={[past]}
        historyLoading={false}
        onUpdateSet={noop}
        onAddSet={noop}
        onCopyLastSet={noop}
        onRemoveSet={noop}
        onUseHistory={noop}
        onNoteChange={noop}
        onSwapExercise={noop}
        onMoveExercise={noop}
        onToggleSection={noop}
        onRemoveExercise={noop}
        onDone={noop}
        {...overrides}
      />,
    );
  }

  it('says which exercise this is and where it sits', async () => {
    await renderDetails();

    expect(screen.getByRole('header', { name: 'Cable fly' })).toBeTruthy();
    expect(screen.getByText(/3 of 4$/)).toBeTruthy();
  });

  it('lists previous sessions and hands one back to reuse', async () => {
    const onUseHistory = jest.fn();
    await renderDetails({ onUseHistory });

    expect(screen.getByText('Sat, Oct 17')).toBeTruthy();
    expect(screen.getByText('30 lb × 12, 30 lb × 11')).toBeTruthy();
    await userEvent.press(screen.getByRole('button', { name: 'Use the sets from Sat, Oct 17' }));

    expect(onUseHistory).toHaveBeenCalledWith(past);
  });

  it('says so when there is no history yet', async () => {
    await renderDetails({ history: [] });

    expect(screen.getByText(/No previous sessions yet/)).toBeTruthy();
  });

  it('removes a set and edits a set note', async () => {
    const onRemoveSet = jest.fn();
    const onUpdateSet = jest.fn();
    await renderDetails({ onRemoveSet, onUpdateSet });

    await userEvent.press(screen.getByRole('button', { name: 'Remove set 2' }));
    expect(onRemoveSet).toHaveBeenCalledWith(1);

    // The note box is tucked away until asked for.
    expect(screen.queryByLabelText('Note for set 1')).toBeNull();
    await userEvent.press(screen.getByRole('button', { name: 'Add a note to set 1' }));
    await userEvent.type(screen.getByLabelText('Note for set 1'), 'x');

    expect(onUpdateSet).toHaveBeenCalledWith(0, { note: 'x' });
  });

  it('shows the cardio extras only for cardio', async () => {
    await renderDetails();
    expect(screen.queryByLabelText('Pace in mph for set 1')).toBeNull();

    await renderDetails({
      item: item({ id: 'custom-run', name: 'Run', metric: 'cardio' }),
    });
    expect(screen.getByLabelText('Pace in mph for set 1')).toBeTruthy();
  });

  it('offers to move it to maybe, or back to the plan', async () => {
    const onToggleSection = jest.fn();
    await renderDetails({ onToggleSection });
    await userEvent.press(screen.getByRole('button', { name: 'To maybe' }));
    expect(onToggleSection).toHaveBeenCalled();

    await renderDetails({ item: item(plank, { section: 'maybe' }) });
    expect(screen.getByRole('button', { name: 'To plan' })).toBeTruthy();
  });

  it('cannot move an exercise that is alone in its section', async () => {
    await renderDetails({ position: 1, total: 1 });

    expect(screen.getByRole('button', { name: 'Move…' })).toBeDisabled();
  });
});

describe('WorkoutDetailsPanel', () => {
  const meta = { title: 'Push day', workoutDate: '2026-11-10', workoutTime: '18:10', workoutNote: '' };

  it('hands back a complete date, and keeps a half-typed one to itself', async () => {
    const onChange = jest.fn();
    await render(
      <WorkoutDetailsPanel meta={meta} defaultTitle="Workout on 2026-11-10" onChange={onChange} onDone={jest.fn()} />,
    );

    const date = screen.getByLabelText('Date');
    await userEvent.clear(date);
    await userEvent.type(date, '2026-11-0');

    // Cleared, then nothing while it is not a date yet.
    expect(onChange).toHaveBeenLastCalledWith({ workoutDate: '' });
    expect(screen.getByText('Use the form 2026-11-10.')).toBeTruthy();

    await userEvent.type(date, '9');
    expect(onChange).toHaveBeenLastCalledWith({ workoutDate: '2026-11-09' });
  });

  it('edits the name and the note as typed', async () => {
    const onChange = jest.fn();
    await render(
      <WorkoutDetailsPanel meta={meta} defaultTitle="Workout on 2026-11-10" onChange={onChange} onDone={jest.fn()} />,
    );

    await userEvent.type(screen.getByLabelText('Workout note'), 'F');

    expect(onChange).toHaveBeenLastCalledWith({ workoutNote: 'F' });
  });
});
