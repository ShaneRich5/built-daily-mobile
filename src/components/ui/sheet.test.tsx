import { render, screen, userEvent } from '@testing-library/react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';

function renderSheet(props: Partial<React.ComponentProps<typeof Sheet>> = {}) {
  const onClose = jest.fn();

  return {
    onClose,
    ready: render(
      <Sheet visible onClose={onClose} title="Add exercises" {...props}>
        <ThemedText>Sheet body</ThemedText>
      </Sheet>,
    ),
  };
}

describe('Sheet', () => {
  it('shows its title, subtitle and content when open', async () => {
    await renderSheet({ subtitle: 'Added after Tricep Pushdown' }).ready;

    expect(screen.getByRole('header', { name: 'Add exercises' })).toBeTruthy();
    expect(screen.getByText('Added after Tricep Pushdown')).toBeTruthy();
    expect(screen.getByText('Sheet body')).toBeTruthy();
  });

  it('renders nothing while closed', async () => {
    await renderSheet({ visible: false }).ready;

    expect(screen.queryByText('Sheet body')).toBeNull();
  });

  it('pins a footer under the content', async () => {
    await renderSheet({ footer: <Button label="Add 2 exercises" onPress={jest.fn()} /> }).ready;

    expect(screen.getByRole('button', { name: 'Add 2 exercises' })).toBeTruthy();
  });

  it('closes from the close button', async () => {
    const { onClose, ready } = renderSheet();
    await ready;

    await userEvent.press(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when the scrim behind it is tapped', async () => {
    const { onClose, ready } = renderSheet();
    await ready;

    // Hidden from screen readers on purpose (the panel is modal), so it has to
    // be asked for explicitly.
    await userEvent.press(screen.getByTestId('sheet-scrim', { includeHiddenElements: true }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // One "Close" for a screen reader, not a second one the size of the screen.
  it('offers a screen reader a single way to close', async () => {
    await renderSheet().ready;

    expect(screen.getAllByRole('button', { name: 'Close' })).toHaveLength(1);
  });
});
