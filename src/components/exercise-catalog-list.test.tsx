import { render, screen, userEvent } from '@testing-library/react-native';

import { ExerciseCatalogList } from '@/components/exercise-catalog-list';

describe('ExerciseCatalogList', () => {
  it('groups exercises under their muscle group', async () => {
    await render(<ExerciseCatalogList query="bench press" onChangeQuery={jest.fn()} />);

    expect(screen.getByText('Chest')).toBeTruthy();
    expect(screen.getByText('Bench press')).toBeTruthy();
  });

  it('shows how an exercise is measured', async () => {
    await render(<ExerciseCatalogList query="side plank" onChangeQuery={jest.fn()} />);

    expect(screen.getByText('Hold time')).toBeTruthy();
  });

  it('says so when nothing matches', async () => {
    await render(<ExerciseCatalogList query="sauna sit" onChangeQuery={jest.fn()} />);

    expect(screen.getByText('No exercises match “sauna sit”.')).toBeTruthy();
  });

  it('reports what was entered', async () => {
    const onChangeQuery = jest.fn();
    await render(<ExerciseCatalogList query="" onChangeQuery={onChangeQuery} />);

    await userEvent.paste(screen.getByLabelText('Search'), 'rdl');

    expect(onChangeQuery).toHaveBeenCalled();
  });

  // Browsing and picking are the same list; only the callback differs.
  it('leaves rows unpressable when it is only being browsed', async () => {
    await render(<ExerciseCatalogList query="deadlift" onChangeQuery={jest.fn()} />);

    expect(screen.queryByLabelText('Add Deadlift')).toBeNull();
  });

  it('hands back the exercise that was picked', async () => {
    const onSelect = jest.fn();
    await render(
      <ExerciseCatalogList query="deadlift" onChangeQuery={jest.fn()} onSelect={onSelect} />,
    );

    await userEvent.press(screen.getByLabelText('Add Deadlift'));

    expect(onSelect).toHaveBeenCalledWith({
      id: 'deadlift',
      name: 'Deadlift',
      metric: 'weight_reps',
    });
  });
});
