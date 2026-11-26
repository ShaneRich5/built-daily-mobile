import { render, screen, userEvent } from '@testing-library/react-native';

import { StepChallengeSection } from '@/components/challenges/step-challenge-section';
import { useSession } from '@/contexts/session';
import { useStepChallenge } from '@/hooks/use-step-challenge';
import {
  markChallengeCompleted,
  setManualDailyMetric,
  startChallenge,
  subscribeToChallengesEndingSince,
  subscribeToDailyMetrics,
  updateChallengeRule,
} from '@/services/firestore/challenge-repository';
import type { SavedChallenge } from '@/types/challenge';
import type { DailyMetricsDay } from '@/types/daily-metric';

jest.mock('@/contexts/session');
jest.mock('@/services/firestore/challenge-repository');

/** Tuesday, Nov 24 2026. */
const TODAY = '2026-11-24';
const at = new Date('2026-11-20T12:00:00Z');

let challenges: SavedChallenge[] = [];
let days: Record<string, DailyMetricsDay> = {};

function running(
  rule: SavedChallenge['challenge']['rule'] = {
    kind: 'days_hit',
    dailyTarget: 7000,
    daysNeeded: 5,
  },
): SavedChallenge {
  return {
    id: 'c1',
    challenge: {
      metric: 'steps',
      rule,
      period: 'week',
      startDate: '2026-11-22',
      endDate: '2026-11-28',
      groupId: null,
      completedAt: null,
      createdAt: at,
      updatedAt: at,
    },
  };
}

function day(dateKey: string, value: number, source: 'manual' | 'apple_health' = 'manual') {
  days[dateKey] = {
    dateKey,
    updatedAt: at,
    metrics: {
      steps: { value, resolvedFrom: source, sources: { [source]: { value, updatedAt: at } } },
    },
  };
}

function Harness() {
  const challenge = useStepChallenge(TODAY);
  return <StepChallengeSection todayKey={TODAY} challenge={challenge} />;
}

beforeEach(() => {
  challenges = [];
  days = {};
  jest.mocked(useSession).mockReturnValue({ user: { uid: 'user-1' } as never, isLoading: false });
  jest.mocked(subscribeToChallengesEndingSince).mockImplementation((_uid, _since, { onData }) => {
    onData(challenges);
    return jest.fn();
  });
  jest.mocked(subscribeToDailyMetrics).mockImplementation((_uid, _start, _end, { onData }) => {
    onData(days);
    return jest.fn();
  });
  jest.mocked(startChallenge).mockResolvedValue('new');
  jest.mocked(updateChallengeRule).mockResolvedValue(undefined);
  jest.mocked(setManualDailyMetric).mockResolvedValue(undefined);
  jest.mocked(markChallengeCompleted).mockResolvedValue(undefined);
});

afterEach(() => jest.clearAllMocks());

describe('StepChallengeSection', () => {
  it('starts the default weekly challenge over the whole week', async () => {
    await render(<Harness />);

    await userEvent.press(screen.getByRole('button', { name: /Start a step challenge/ }));
    expect(screen.getByText('Runs Nov 22–28. Steps already in this week count.')).toBeTruthy();
    await userEvent.press(screen.getByRole('button', { name: 'Start challenge' }));

    expect(startChallenge).toHaveBeenCalledWith('user-1', {
      metric: 'steps',
      rule: { kind: 'days_hit', dailyTarget: 7000, daysNeeded: 5 },
      period: 'week',
      startDate: '2026-11-22',
      endDate: '2026-11-28',
    });
  });

  it('switches to a month and nudges the target', async () => {
    await render(<Harness />);

    await userEvent.press(screen.getByRole('button', { name: /Start a step challenge/ }));
    await userEvent.press(screen.getByRole('tab', { name: 'This month' }));
    await userEvent.press(screen.getByRole('button', { name: 'More: Days needed' }));
    await userEvent.press(screen.getByRole('button', { name: 'Start challenge' }));

    expect(startChallenge).toHaveBeenCalledWith('user-1', {
      metric: 'steps',
      rule: { kind: 'days_hit', dailyTarget: 7000, daysNeeded: 21 },
      period: 'month',
      startDate: '2026-11-01',
      endDate: '2026-11-30',
    });
  });

  it('shows a running week and logs today’s steps', async () => {
    challenges = [running()];
    day('2026-11-22', 8214);
    day('2026-11-23', 7480, 'apple_health');
    await render(<Harness />);

    expect(screen.getByText('This week’s steps')).toBeTruthy();
    expect(screen.getByText('Needs 3 of the 5 days left, 2 to spare.')).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: 'Monday, 7,480 steps, from Apple Health, target hit. Edit steps.',
      }),
    ).toBeTruthy();

    await userEvent.press(screen.getByRole('button', { name: 'Log today’s steps' }));
    await userEvent.type(screen.getByLabelText('Steps'), '9000');
    await userEvent.press(screen.getByRole('button', { name: 'Save steps' }));

    expect(setManualDailyMetric).toHaveBeenCalledWith('user-1', TODAY, 'steps', 9000);
  });

  it('adds quick steps on top of a synced day, and can go back to the sync', async () => {
    challenges = [running()];
    day('2026-11-23', 7480, 'apple_health');
    await render(<Harness />);

    await userEvent.press(screen.getByRole('button', { name: /^Monday, 7,480 steps/ }));
    expect(screen.getByText(/Synced from Apple Health: 7,480/)).toBeTruthy();
    await userEvent.press(screen.getByRole('button', { name: 'Add 500 steps' }));
    await userEvent.press(screen.getByRole('button', { name: 'Save steps' }));

    expect(setManualDailyMetric).toHaveBeenCalledWith('user-1', '2026-11-23', 'steps', 7980);
  });

  it('refuses a number past the daily limit', async () => {
    challenges = [running()];
    await render(<Harness />);

    await userEvent.press(screen.getByRole('button', { name: 'Log today’s steps' }));
    await userEvent.type(screen.getByLabelText('Steps'), '200000');
    await userEvent.press(screen.getByRole('button', { name: 'Save steps' }));

    expect(screen.getByText('That’s more than 100,000. Check the number?')).toBeTruthy();
    expect(setManualDailyMetric).not.toHaveBeenCalled();
  });

  it('marks a done challenge complete once, and offers the same again', async () => {
    challenges = [running({ kind: 'total', target: 10000 })];
    day('2026-11-22', 12000);
    await render(<Harness />);

    expect(screen.getByText('Challenge complete')).toBeTruthy();
    expect(markChallengeCompleted).toHaveBeenCalledTimes(1);
    await userEvent.press(screen.getByRole('button', { name: 'Same again next week' }));

    expect(startChallenge).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ startDate: '2026-11-29', endDate: '2026-12-05' }),
    );
  });

  it('edits the running challenge’s target', async () => {
    challenges = [running()];
    await render(<Harness />);

    await userEvent.press(screen.getByRole('button', { name: 'Edit' }));
    await userEvent.press(screen.getByRole('radio', { name: /50,000 steps this week/ }));
    await userEvent.press(screen.getByRole('button', { name: 'Save changes' }));

    expect(updateChallengeRule).toHaveBeenCalledWith('user-1', 'c1', {
      kind: 'total',
      target: 50000,
    });
  });

  it('says so when a write is refused', async () => {
    jest.mocked(startChallenge).mockRejectedValue(new Error('denied'));
    await render(<Harness />);

    await userEvent.press(screen.getByRole('button', { name: /Start a step challenge/ }));
    await userEvent.press(screen.getByRole('button', { name: 'Start challenge' }));

    expect(
      await screen.findByText('Couldn’t save that. Check your connection and try again.'),
    ).toBeTruthy();
  });
});
