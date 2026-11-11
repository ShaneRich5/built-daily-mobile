import {
  cardSubtitle,
  countDoneSets,
  exerciseProgress,
  isUntouchedMaybe,
  maybeSubtitle,
  setSummary,
  summarizeSetLogs,
  summarizeSetRows,
  volumeLine,
} from '@/lib/session/session-model';
import { bench, doneRow, item, log, plank, row } from '@/lib/session/session-test-helpers';

describe('exerciseProgress', () => {
  it('is not started with nothing typed and nothing ticked', () => {
    expect(exerciseProgress([row(), row()])).toBe('not_started');
  });

  it('is in progress once a number is typed, even before any tick', () => {
    expect(exerciseProgress([row({ weight: '135' }), row()])).toBe('in_progress');
  });

  it('is in progress while some sets are ticked and others are not', () => {
    expect(exerciseProgress([doneRow(), row()])).toBe('in_progress');
  });

  it('is done when every set is ticked', () => {
    expect(exerciseProgress([doneRow(), doneRow()])).toBe('done');
  });

  it('is never done with no sets at all', () => {
    expect(exerciseProgress([])).toBe('not_started');
  });
});

describe('isUntouchedMaybe', () => {
  it('is a maybe nobody started', () => {
    expect(isUntouchedMaybe(item(bench, { section: 'maybe' }))).toBe(true);
  });

  it('is not a maybe that has been started', () => {
    expect(isUntouchedMaybe(item(bench, { section: 'maybe', sets: [doneRow()] }))).toBe(false);
  });

  // An untouched planned exercise still counts: it was the plan.
  it('is never a planned exercise', () => {
    expect(isUntouchedMaybe(item(bench))).toBe(false);
  });
});

describe('countDoneSets', () => {
  it('counts ticked sets across exercises', () => {
    expect(
      countDoneSets([item(bench, { sets: [doneRow(), doneRow(), row()] }), item(plank, { sets: [doneRow()] })]),
    ).toBe(3);
  });
});

describe('setSummary', () => {
  it('reads a weighted set', () => {
    expect(setSummary(log({ weight: 135, reps: 8 }))).toBe('135 lb × 8');
  });

  it('reads weight alone and reps alone', () => {
    expect(setSummary(log({ weight: 45 }))).toBe('45 lb');
    expect(setSummary(log({ reps: 12 }))).toBe('12 reps');
  });

  it('reads a hold as a clock', () => {
    expect(setSummary(log({ durationSec: 90 }))).toBe('1:30');
  });

  it('adds the cardio fields after the time', () => {
    expect(
      setSummary(log({ durationSec: 1200, distanceMiles: 2.5, paceMph: 7.5, inclinePercent: 1, resistanceLevel: 4 })),
    ).toBe('20:00 · 2.5 mi · 7.5 mph · 1% · L4');
  });

  it('is empty for a set that recorded nothing', () => {
    expect(setSummary(log())).toBe('');
  });
});

describe('summarizeSetLogs', () => {
  it('collapses matching sets into a count', () => {
    const set = log({ weight: 30, reps: 12 });

    expect(summarizeSetLogs([set, set, set])).toBe('3 sets · 30 lb × 12');
  });

  it('lists sets that differ, in order', () => {
    expect(summarizeSetLogs([log({ weight: 135, reps: 8 }), log({ weight: 145, reps: 6 })])).toBe(
      '135 lb × 8, 145 lb × 6',
    );
  });

  it('shows a single set without a count', () => {
    expect(summarizeSetLogs([log({ weight: 135, reps: 8 })])).toBe('135 lb × 8');
  });

  it('skips sets that recorded nothing', () => {
    expect(summarizeSetLogs([log(), log({ reps: 10 })])).toBe('10 reps');
    expect(summarizeSetLogs([log()])).toBe('');
  });
});

describe('summarizeSetRows', () => {
  it('summarises only the rows with numbers, read by the metric', () => {
    expect(summarizeSetRows([row({ weight: '135', reps: '8' }), row()], 'weight_reps')).toBe(
      '135 lb × 8',
    );
  });
});

describe('cardSubtitle', () => {
  const lastTime = [log({ weight: 30, reps: 12 }), log({ weight: 30, reps: 12 })];

  it('shows last time on the open card', () => {
    expect(cardSubtitle(item(bench), true, lastTime)).toBe('Last time · 2 sets · 30 lb × 12');
  });

  it('shows how the exercise is logged when it is open with no history', () => {
    expect(cardSubtitle(item(bench), true, undefined)).toBe('Weight × reps');
  });

  it('shows what was done once every set is ticked', () => {
    expect(cardSubtitle(item(bench, { sets: [doneRow('135', '8'), doneRow('145', '6')] }), false, lastTime)).toBe(
      '135 lb × 8, 145 lb × 6',
    );
  });

  it('shows how far along a part-done exercise is', () => {
    expect(cardSubtitle(item(bench, { sets: [doneRow('135', '8'), row()] }), false, undefined)).toBe(
      '1 of 2 sets done · 135 lb × 8',
    );
  });

  it('shows what to expect on an exercise not started yet', () => {
    expect(cardSubtitle(item(bench), false, lastTime)).toBe('Not started · Last 2 sets · 30 lb × 12');
    expect(cardSubtitle(item(bench), false, undefined)).toBe('Not started');
  });

  it('flags that the exercise has a note', () => {
    expect(cardSubtitle(item(bench, { note: 'Low pulleys taken' }), false, undefined)).toBe(
      'Not started · Note',
    );
  });
});

describe('maybeSubtitle', () => {
  it('shows last time for a maybe not started', () => {
    expect(maybeSubtitle(item(bench, { section: 'maybe' }), [log({ weight: 30, reps: 12 })])).toBe(
      'Last 30 lb × 12',
    );
    expect(maybeSubtitle(item(bench, { section: 'maybe' }), undefined)).toBe('Not started');
  });

  it('shows what has been logged once it is started', () => {
    expect(maybeSubtitle(item(bench, { section: 'maybe', sets: [doneRow()] }), undefined)).toBe(
      '135 lb × 8',
    );
  });
});

describe('volumeLine', () => {
  it('counts exercises and how many sets are done', () => {
    expect(volumeLine(4, 12, 9)).toBe('4 exercises · 9 of 12 sets done');
  });

  it('uses the singular for one of each', () => {
    expect(volumeLine(1, 1, 0)).toBe('1 exercise · 0 of 1 set done');
  });

  it('says so when there is nothing yet', () => {
    expect(volumeLine(0, 0, 0)).toBe('No exercises yet');
  });
});
