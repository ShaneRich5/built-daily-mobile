import { render, screen, userEvent } from '@testing-library/react-native';

import { MuscleChart } from '@/components/muscle-chart';
import type { SessionLine, SetLog } from '@/types/workout';

const emptySet: SetLog = {
  weight: null,
  reps: null,
  durationSec: null,
  timedSetSec: null,
  paceMph: null,
  inclinePercent: null,
  resistanceLevel: null,
  distanceMiles: null,
  note: null,
};

function line(exerciseId: string, sets: number, nameSnapshot = exerciseId): SessionLine {
  return {
    lineId: `line-${exerciseId}`,
    exerciseId,
    nameSnapshot,
    metric: 'weight_reps',
    sets: Array.from({ length: sets }, () => ({ ...emptySet })),
  };
}

describe('MuscleChart', () => {
  it('names the muscles the workout leaned on hardest', async () => {
    await render(<MuscleChart lines={[line('bench', 4), line('barbell-curl', 2)]} />);

    expect(screen.getByText(/Worked hardest: Chest/)).toBeTruthy();
  });

  it('shows the front of the body first', async () => {
    await render(<MuscleChart lines={[line('bench', 3)]} />);

    expect(screen.getByLabelText('male-body-front')).toBeTruthy();
  });

  it('switches to the back of the body', async () => {
    await render(<MuscleChart lines={[line('deadlift', 3)]} />);

    await userEvent.press(screen.getByText('Back'));

    expect(screen.getByLabelText('male-body-back')).toBeTruthy();
  });

  it('says so when it cannot chart anything, rather than showing a bare body', async () => {
    await render(<MuscleChart lines={[line('custom-xyz', 3, 'Sauna sit')]} />);

    expect(screen.getByText('No muscles charted for this workout.')).toBeTruthy();
  });

  it('renders the female body when asked', async () => {
    await render(<MuscleChart lines={[line('bench', 3)]} gender="female" />);

    expect(screen.getByLabelText('female-body-front')).toBeTruthy();
  });
});
