import { render, screen, userEvent } from '@testing-library/react-native';

import { NoteField } from '@/components/note-field';

describe('NoteField', () => {
  it('shows the placeholder when there is no note yet', async () => {
    await render(<NoteField label="Note for set 1" value="" onChange={jest.fn()} />);

    expect(screen.getByText('Note (optional)')).toBeTruthy();
  });

  it('keeps the dialog shut until the field is tapped', async () => {
    await render(<NoteField label="Note for set 1" value="" onChange={jest.fn()} />);

    expect(screen.queryByText('Save note')).toBeNull();
  });

  it('hands back the edited note', async () => {
    const onChange = jest.fn();
    await render(<NoteField label="Note for set 1" value="" onChange={onChange} />);

    await userEvent.press(screen.getByLabelText('Note for set 1'));
    await userEvent.type(screen.getByLabelText('Note'), 'felt light');
    await userEvent.press(screen.getByText('Save note'));

    expect(onChange).toHaveBeenCalledWith('felt light');
  });

  it('closes the dialog once the note is saved', async () => {
    await render(<NoteField label="Note for set 1" value="" onChange={jest.fn()} />);

    await userEvent.press(screen.getByLabelText('Note for set 1'));
    await userEvent.press(screen.getByText('Save note'));

    expect(screen.queryByText('Save note')).toBeNull();
  });

  it('reports nothing when the dialog is cancelled', async () => {
    const onChange = jest.fn();
    await render(<NoteField label="Note for set 1" value="old" onChange={onChange} />);

    await userEvent.press(screen.getByLabelText('Note for set 1'));
    await userEvent.type(screen.getByLabelText('Note'), ' and new');
    await userEvent.press(screen.getByText('Cancel'));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByText('Save note')).toBeNull();
  });

  it('reopens from what is stored, not from the abandoned draft', async () => {
    await render(<NoteField label="Note for set 1" value="felt light" onChange={jest.fn()} />);

    await userEvent.press(screen.getByLabelText('Note for set 1'));
    await userEvent.type(screen.getByLabelText('Note'), ' scrapped');
    await userEvent.press(screen.getByText('Cancel'));
    await userEvent.press(screen.getByLabelText('Note for set 1'));

    expect(screen.getByDisplayValue('felt light')).toBeTruthy();
  });

  it('can clear a note down to empty', async () => {
    const onChange = jest.fn();
    await render(<NoteField label="Note for set 1" value="felt light" onChange={onChange} />);

    await userEvent.press(screen.getByLabelText('Note for set 1'));
    await userEvent.clear(screen.getByLabelText('Note'));
    await userEvent.press(screen.getByText('Save note'));

    expect(onChange).toHaveBeenCalledWith('');
  });

  it('does not open while the form is saving', async () => {
    await render(<NoteField label="Note for set 1" value="" onChange={jest.fn()} disabled />);

    await userEvent.press(screen.getByLabelText('Note for set 1'));

    expect(screen.queryByText('Save note')).toBeNull();
  });

  it('draws the label as the caption by default', async () => {
    await render(<NoteField label="Note for set 1" value="" onChange={jest.fn()} />);

    expect(screen.getByText('Note for set 1')).toBeTruthy();
  });

  it('can show a shorter caption than it answers to', async () => {
    await render(
      <NoteField label="Note for Barbell bench press" caption="Note" value="" onChange={jest.fn()} />,
    );

    expect(screen.getByText('Note')).toBeTruthy();
    expect(screen.getByLabelText('Note for Barbell bench press')).toBeTruthy();
  });

  it('draws no caption where the row has no room for one', async () => {
    await render(
      <NoteField label="Note for set 1" caption={null} value="" onChange={jest.fn()} />,
    );

    // Still reachable by assistive tech, just not drawn as a caption.
    expect(screen.getByLabelText('Note for set 1')).toBeTruthy();
    expect(screen.queryByText('Note for set 1')).toBeNull();
  });
});
