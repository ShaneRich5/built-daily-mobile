import { render, screen, userEvent } from '@testing-library/react-native';

import { ExerciseLineEditor } from '@/components/exercise-line-editor';
import type { ExercisePerformance } from '@/lib/exercise-history';
import { type DraftLine, toDraftLines } from '@/lib/session-edit';
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

function draft(metric: SessionLine['metric'], sets: SetLog[]): DraftLine {
  return toDraftLines([
    { lineId: 'l1', exerciseId: 'bench', nameSnapshot: 'Bench', metric, sets },
  ])[0];
}

function setup(line: DraftLine, history?: ExercisePerformance) {
  const onChangeLine = jest.fn();
  const onRemove = jest.fn();

  return {
    onChangeLine,
    onRemove,
    ui: (
      <ExerciseLineEditor
        line={line}
        note=""
        onChangeLine={onChangeLine}
        onChangeNote={jest.fn()}
        onRemove={onRemove}
        disabled={false}
        history={history}
      />
    ),
  };
}

function performance(
  sets: SetLog[],
  metric: SessionLine['metric'] = 'weight_reps',
): ExercisePerformance {
  return { sessionId: 'previous', performedAt: new Date(2026, 8, 29), metric, sets };
}

describe('ExerciseLineEditor', () => {
  it('shows weight and reps boxes for a loaded lift', async () => {
    const { ui } = setup(draft('weight_reps', [{ ...emptySet, weight: 135, reps: 8 }]));
    await render(ui);

    expect(screen.getByDisplayValue('135')).toBeTruthy();
    expect(screen.getByDisplayValue('8')).toBeTruthy();
  });

  it('shows only a reps box for a bodyweight move', async () => {
    const { ui } = setup(draft('bodyweight_reps', [{ ...emptySet, reps: 12 }]));
    await render(ui);

    expect(screen.getByLabelText('reps')).toBeTruthy();
    expect(screen.queryByLabelText('lb')).toBeNull();
  });

  it('adds a set by copying the one before it, since sets usually repeat', async () => {
    const line = draft('weight_reps', [{ ...emptySet, weight: 135, reps: 8 }]);
    const { ui, onChangeLine } = setup(line);
    await render(ui);

    await userEvent.press(screen.getByText('Add set'));

    const next = onChangeLine.mock.calls[0][0] as DraftLine;
    expect(next.sets).toHaveLength(2);
    expect(next.sets[1]).toMatchObject({ weight: '135', reps: '8' });
  });

  it('adds a blank set to an exercise that has none yet', async () => {
    const { ui, onChangeLine } = setup(draft('weight_reps', []));
    await render(ui);

    await userEvent.press(screen.getByText('Add set'));

    const next = onChangeLine.mock.calls[0][0] as DraftLine;
    expect(next.sets).toHaveLength(1);
    expect(next.sets[0]).toMatchObject({ weight: '', reps: '' });
  });

  it('removes the set that was tapped, not the last one', async () => {
    const line = draft('weight_reps', [
      { ...emptySet, weight: 135 },
      { ...emptySet, weight: 145 },
      { ...emptySet, weight: 155 },
    ]);
    const { ui, onChangeLine } = setup(line);
    await render(ui);

    await userEvent.press(screen.getAllByText('Remove')[1]);

    const next = onChangeLine.mock.calls[0][0] as DraftLine;
    expect(next.sets.map((s) => s.weight)).toEqual(['135', '155']);
  });

  it('says so when an exercise has no sets', async () => {
    const { ui } = setup(draft('weight_reps', []));
    await render(ui);

    expect(screen.getByText('No sets logged')).toBeTruthy();
  });

  it('removes the whole exercise', async () => {
    const { ui, onRemove } = setup(draft('weight_reps', [emptySet]));
    await render(ui);

    await userEvent.press(screen.getByText('Remove exercise'));

    expect(onRemove).toHaveBeenCalled();
  });
});

describe('set notes', () => {
  it('shows an existing note without opening anything', async () => {
    const { ui } = setup(draft('weight_reps', [{ ...emptySet, weight: 135, note: 'felt light' }]));
    await render(ui);

    expect(screen.getByText('felt light')).toBeTruthy();
  });

  it('offers a note control for every set, labelled by position', async () => {
    const { ui } = setup(draft('weight_reps', [emptySet, emptySet]));
    await render(ui);

    expect(screen.getByLabelText('Note for set 1')).toBeTruthy();
    expect(screen.getByLabelText('Note for set 2')).toBeTruthy();
  });

  it('edits a note through the dialog, and saves it to the right set', async () => {
    const line = draft('weight_reps', [emptySet, emptySet]);
    const { ui, onChangeLine } = setup(line);
    await render(ui);

    await userEvent.press(screen.getByLabelText('Note for set 2'));
    await userEvent.type(screen.getByLabelText('Note'), 'last rep was a grind');
    await userEvent.press(screen.getByText('Save note'));

    const next = onChangeLine.mock.calls.at(-1)?.[0] as DraftLine;
    expect(next.sets[1].note).toBe('last rep was a grind');
    expect(next.sets[0].note).toBe('');
  });

  it('seeds the dialog with the note already on the set', async () => {
    const { ui } = setup(draft('weight_reps', [{ ...emptySet, note: 'felt light' }]));
    await render(ui);

    await userEvent.press(screen.getByLabelText('Note for set 1'));

    expect(screen.getByDisplayValue('felt light')).toBeTruthy();
  });

  it('leaves the note alone when the dialog is cancelled', async () => {
    const { ui, onChangeLine } = setup(draft('weight_reps', [{ ...emptySet, note: 'felt light' }]));
    await render(ui);

    await userEvent.press(screen.getByLabelText('Note for set 1'));
    await userEvent.type(screen.getByLabelText('Note'), ' and fast');
    await userEvent.press(screen.getByText('Cancel'));

    expect(onChangeLine).not.toHaveBeenCalled();
    expect(screen.getByText('felt light')).toBeTruthy();
  });

  it('does not copy the previous note onto an added set', async () => {
    const line = draft('weight_reps', [{ ...emptySet, weight: 135, note: 'failed last rep' }]);
    const { ui, onChangeLine } = setup(line);
    await render(ui);

    await userEvent.press(screen.getByText('Add set'));

    const next = onChangeLine.mock.calls[0][0] as DraftLine;
    expect(next.sets[1]).toMatchObject({ weight: '135', note: '' });
  });

  describe('last time', () => {
    const lastTime = performance([
      { ...emptySet, weight: 135, reps: 8 },
      { ...emptySet, weight: 145, reps: 6 },
    ]);

    it('says nothing when the exercise has no history', async () => {
      const { ui } = setup(draft('weight_reps', [emptySet]));
      await render(ui);

      expect(screen.queryByText(/Last time/)).toBeNull();
    });

    it('spells out every set from last time, not just the top one', async () => {
      const { ui } = setup(draft('weight_reps', [emptySet]), lastTime);
      await render(ui);

      expect(screen.getByText('135 lb × 8 · 145 lb × 6')).toBeTruthy();
    });

    it('says when it was', async () => {
      const { ui } = setup(draft('weight_reps', [emptySet]), lastTime);
      await render(ui);

      expect(screen.getByText(/Last time · /)).toBeTruthy();
    });

    it('fills the sets in from last time', async () => {
      const { ui, onChangeLine } = setup(draft('weight_reps', [emptySet]), lastTime);
      await render(ui);

      await userEvent.press(screen.getByText('Start from last time'));

      const next = onChangeLine.mock.calls[0][0] as DraftLine;
      expect(next.sets.map((set) => [set.weight, set.reps])).toEqual([
        ['135', '8'],
        ['145', '6'],
      ]);
    });

    // Overwriting numbers somebody already typed would throw their work away.
    it('offers no prefill once something has been logged', async () => {
      const { ui } = setup(draft('weight_reps', [{ ...emptySet, weight: 95 }]), lastTime);
      await render(ui);

      expect(screen.getByText(/Last time · /)).toBeTruthy();
      expect(screen.queryByText('Start from last time')).toBeNull();
    });

    // A move logged for reps has nothing to hand a line now being timed.
    it('offers no prefill when the exercise is measured differently now', async () => {
      const { ui } = setup(draft('duration', [emptySet]), lastTime);
      await render(ui);

      expect(screen.queryByText('Start from last time')).toBeNull();
    });

    it('still shows the history while the form is saving', async () => {
      await render(
        <ExerciseLineEditor
          line={draft('weight_reps', [emptySet])}
          note=""
          onChangeLine={jest.fn()}
          onChangeNote={jest.fn()}
          onRemove={jest.fn()}
          disabled
          history={lastTime}
        />,
      );

      expect(screen.getByText('135 lb × 8 · 145 lb × 6')).toBeTruthy();
    });
  });
});
