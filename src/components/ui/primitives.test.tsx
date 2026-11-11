import { render, screen, userEvent } from '@testing-library/react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { IconButton } from '@/components/ui/icon-button';
import { EllipsisIcon } from '@/components/ui/icons';
import { ListRow } from '@/components/ui/list-row';
import { Pill } from '@/components/ui/pill';
import { SectionLabel } from '@/components/ui/section-label';
import { Segmented } from '@/components/ui/segmented';
import { StatTile } from '@/components/ui/stat-tile';

describe('Card', () => {
  it('renders what it is given', async () => {
    await render(
      <Card variant="emphasis">
        <ThemedText>Push day</ThemedText>
      </Card>,
    );

    expect(screen.getByText('Push day')).toBeTruthy();
  });
});

describe('IconButton', () => {
  // An icon says nothing to a screen reader; the label is the only name it has.
  it('is found by its accessibility label and calls back', async () => {
    const onPress = jest.fn();
    await render(
      <IconButton icon={EllipsisIcon} accessibilityLabel="More actions" onPress={onPress} />,
    );

    await userEvent.press(screen.getByRole('button', { name: 'More actions' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does nothing when disabled', async () => {
    const onPress = jest.fn();
    await render(
      <IconButton icon={EllipsisIcon} accessibilityLabel="More actions" onPress={onPress} disabled />,
    );

    await userEvent.press(screen.getByRole('button', { name: 'More actions' }));

    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('ListRow', () => {
  it('reads as one button named by its title and meta', async () => {
    const onPress = jest.fn();
    await render(
      <ListRow title="Push day" meta="Mon, Nov 9 · 5 exercises · 17 sets" onPress={onPress} />,
    );

    await userEvent.press(
      screen.getByRole('button', { name: 'Push day, Mon, Nov 9 · 5 exercises · 17 sets' }),
    );

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  // No `onPress`, no button: a row that goes nowhere must not announce as one.
  it('is plain content when it has nowhere to go', async () => {
    await render(<ListRow title="Push day" meta="5 exercises" />);

    expect(screen.getByText('Push day')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('draws what it is handed in place of the chevron', async () => {
    await render(
      <ListRow title="Leg day" onPress={jest.fn()} trailing={<Pill label="Planned" />} />,
    );

    expect(screen.getByText('Planned')).toBeTruthy();
  });
});

describe('Pill', () => {
  it.each(['warning', 'success', 'neutral', 'danger'] as const)(
    'shows its label in the %s tone',
    async (tone) => {
      await render(<Pill label="In progress" tone={tone} dot />);

      expect(screen.getByText('In progress')).toBeTruthy();
    },
  );
});

describe('SectionLabel', () => {
  it('is a heading', async () => {
    await render(<SectionLabel>Recent</SectionLabel>);

    expect(screen.getByRole('header', { name: 'Recent' })).toBeTruthy();
  });

  it('offers its action as a link', async () => {
    const onPress = jest.fn();
    await render(<SectionLabel action={{ label: 'See all', onPress }}>Recent</SectionLabel>);

    await userEvent.press(screen.getByRole('link', { name: 'See all' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('Segmented', () => {
  const options = [
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
  ] as const;

  it('marks the current option as selected', async () => {
    await render(
      <Segmented
        options={options}
        value="week"
        onChange={jest.fn()}
        accessibilityLabel="Calendar view"
      />,
    );

    expect(screen.getByRole('tab', { name: 'Week' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Month' })).not.toBeSelected();
  });

  it('reports the option that was tapped', async () => {
    const onChange = jest.fn();
    await render(
      <Segmented
        options={options}
        value="week"
        onChange={onChange}
        accessibilityLabel="Calendar view"
      />,
    );

    await userEvent.press(screen.getByRole('tab', { name: 'Month' }));

    expect(onChange).toHaveBeenCalledWith('month');
  });
});

describe('StatTile', () => {
  it('reads as one figure with its label', async () => {
    await render(<StatTile value="14" label="Sets" />);

    expect(screen.getByLabelText('14 Sets')).toBeTruthy();
  });
});
