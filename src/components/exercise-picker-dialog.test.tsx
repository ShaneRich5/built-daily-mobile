import { render, screen, userEvent } from '@testing-library/react-native';

import { ExercisePickerDialog } from '@/components/exercise-picker-dialog';

describe('ExercisePickerDialog', () => {
  it('hands back the catalog exercise that was picked', async () => {
    const onPick = jest.fn();
    await render(<ExercisePickerDialog onCancel={jest.fn()} onPick={onPick} />);

    await userEvent.type(screen.getByLabelText('Search'), 'goblet squat');
    await userEvent.press(screen.getByLabelText('Add Goblet squat'));

    expect(onPick).toHaveBeenCalledWith({
      id: 'goblet-squat',
      name: 'Goblet squat',
      metric: 'weight_reps',
    });
  });

  it('closes when it is cancelled', async () => {
    const onCancel = jest.fn();
    await render(<ExercisePickerDialog onCancel={onCancel} onPick={jest.fn()} />);

    await userEvent.press(screen.getByText('Cancel'));

    expect(onCancel).toHaveBeenCalled();
  });

  it('offers nothing custom until something has been typed', async () => {
    await render(<ExercisePickerDialog onCancel={jest.fn()} onPick={jest.fn()} />);

    expect(screen.queryByText(/^Add “/)).toBeNull();
  });

  it('offers a custom exercise for a move the catalog does not have', async () => {
    const onPick = jest.fn();
    await render(<ExercisePickerDialog onCancel={jest.fn()} onPick={onPick} />);

    await userEvent.type(screen.getByLabelText('Search'), 'sauna sit');
    await userEvent.press(screen.getByText('Add “sauna sit”'));

    expect(onPick).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'sauna sit', metric: 'weight_reps' }),
    );
  });

  // `custom-` is what tells both clients to trust the name over the id.
  it('marks a custom exercise with its own id namespace', async () => {
    const onPick = jest.fn();
    await render(<ExercisePickerDialog onCancel={jest.fn()} onPick={onPick} />);

    await userEvent.type(screen.getByLabelText('Search'), 'sauna sit');
    await userEvent.press(screen.getByText('Add “sauna sit”'));

    expect(onPick.mock.calls[0][0].id).toMatch(/^custom-[0-9a-f-]{36}$/);
  });

  it('records how a custom exercise is measured', async () => {
    const onPick = jest.fn();
    await render(<ExercisePickerDialog onCancel={jest.fn()} onPick={onPick} />);

    await userEvent.type(screen.getByLabelText('Search'), 'sauna sit');
    await userEvent.press(screen.getByLabelText('Hold time'));
    await userEvent.press(screen.getByText('Add “sauna sit”'));

    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ metric: 'duration' }));
  });

  // Otherwise a second "Bench press" shadows the catalog's own entry.
  it('does not offer to duplicate an exercise the catalog already has', async () => {
    await render(<ExercisePickerDialog onCancel={jest.fn()} onPick={jest.fn()} />);

    await userEvent.type(screen.getByLabelText('Search'), 'Bench press');

    expect(screen.queryByText('Add “Bench press”')).toBeNull();
  });
});
