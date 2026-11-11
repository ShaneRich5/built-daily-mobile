import { render, screen, userEvent } from '@testing-library/react-native';

import { Button } from '@/components/ui/button';
import { PlusIcon } from '@/components/ui/icons';

describe('Button', () => {
  it('calls back when pressed', async () => {
    const onPress = jest.fn();
    await render(<Button label="Finish workout" onPress={onPress} />);

    await userEvent.press(screen.getByRole('button', { name: 'Finish workout' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does nothing when disabled', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save" onPress={onPress} disabled />);

    await userEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  // A second tap while a save is in flight must not start a second save.
  it('swallows presses and hides the label while busy', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save" onPress={onPress} busy />);

    await userEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(onPress).not.toHaveBeenCalled();
    expect(screen.queryByText('Save')).toBeNull();
    expect(screen.getByRole('button', { name: 'Save' })).toBeBusy();
  });

  it('can be named for a screen reader differently from what it shows', async () => {
    await render(
      <Button label="Add" accessibilityLabel="Add Bench Press" onPress={jest.fn()} icon={PlusIcon} />,
    );

    expect(screen.getByRole('button', { name: 'Add Bench Press' })).toBeTruthy();
    expect(screen.getByText('Add')).toBeTruthy();
  });

  it.each(['primary', 'dark', 'secondary', 'dashed', 'ghost', 'danger'] as const)(
    'renders the %s variant',
    async (variant) => {
      await render(<Button label="Go" variant={variant} onPress={jest.fn()} />);

      expect(screen.getByRole('button', { name: 'Go' })).toBeTruthy();
    },
  );
});
