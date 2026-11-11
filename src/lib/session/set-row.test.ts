import { EMPTY_SET } from '@/lib/session-edit';
import {
  combineToTotalSeconds,
  copySetRow,
  emptySetRow,
  extraFieldsForMetric,
  fillFromSuggestion,
  quickFieldsForMetric,
  rowsFromHistory,
  setLogToSetRow,
  setRowHasMeasurements,
  setRowIsBlank,
  setRowToSetLog,
  splitTotalSeconds,
  suggestionForSet,
  type SetRow,
} from '@/lib/session/set-row';
import type { SetLog } from '@/types/workout';

const row = (overrides: Partial<SetRow> = {}): SetRow => ({ ...emptySetRow(), ...overrides });
const log = (overrides: Partial<SetLog> = {}): SetLog => ({ ...EMPTY_SET, ...overrides });

describe('setLogToSetRow', () => {
  it('shows stored numbers as text and nulls as empty boxes', () => {
    expect(setLogToSetRow(log({ weight: 135, reps: 8, note: 'felt heavy' }))).toMatchObject({
      weight: '135',
      reps: '8',
      seconds: '',
      note: 'felt heavy',
    });
  });

  it('reads the tick from the flag when there is one', () => {
    expect(setLogToSetRow(log({ weight: 135, reps: 8, done: false })).done).toBe(false);
    expect(setLogToSetRow(log({ done: true })).done).toBe(true);
  });

  // Sets from before the flag existed, or written by the MCP server.
  it('counts a set with values and no flag as ticked', () => {
    expect(setLogToSetRow(log({ weight: 135, reps: 8 })).done).toBe(true);
    expect(setLogToSetRow(log()).done).toBe(false);
  });
});

describe('setRowToSetLog', () => {
  it('writes weight and reps for a weighted lift', () => {
    expect(setRowToSetLog(row({ weight: '137.5', reps: '8', done: true }), 'weight_reps')).toEqual(
      log({ weight: 137.5, reps: 8, done: true }),
    );
  });

  it('writes only reps for a bodyweight move', () => {
    const set = setRowToSetLog(row({ weight: '45', reps: '12' }), 'bodyweight_reps');

    expect(set.weight).toBeNull();
    expect(set.reps).toBe(12);
  });

  it('writes the hold time for a duration move', () => {
    expect(setRowToSetLog(row({ seconds: '90' }), 'duration').durationSec).toBe(90);
  });

  it('writes the cardio fields for cardio', () => {
    const set = setRowToSetLog(
      row({ seconds: '1200', distanceMiles: '2.5', paceMph: '7.5', inclinePercent: '1' }),
      'cardio',
    );

    expect(set).toMatchObject({
      durationSec: 1200,
      distanceMiles: 2.5,
      paceMph: 7.5,
      inclinePercent: 1,
      resistanceLevel: null,
    });
  });

  it('always writes the tick, ticked or not', () => {
    expect(setRowToSetLog(row(), 'weight_reps').done).toBe(false);
    expect(setRowToSetLog(row({ done: true }), 'weight_reps').done).toBe(true);
  });

  it('stores a blank note as null and trims a real one', () => {
    expect(setRowToSetLog(row({ note: '   ' }), 'weight_reps').note).toBeNull();
    expect(setRowToSetLog(row({ note: '  slow lowering ' }), 'weight_reps').note).toBe(
      'slow lowering',
    );
  });

  it('treats text that is not a number as an empty box, never NaN', () => {
    const set = setRowToSetLog(row({ weight: 'abc', reps: '.' }), 'weight_reps');

    expect(set.weight).toBeNull();
    expect(set.reps).toBeNull();
  });

  // The stopwatch is gone from both apps, but old sets still carry a reading.
  it('keeps a stopwatch reading through an edit', () => {
    const stored = log({ weight: 135, reps: 8, timedSetSec: 42, done: true });

    expect(setRowToSetLog(setLogToSetRow(stored), 'weight_reps')).toEqual(stored);
  });
});

describe('measurements', () => {
  it('knows a row with a number in it from an empty one', () => {
    expect(setRowHasMeasurements(row({ reps: '8' }))).toBe(true);
    expect(setRowHasMeasurements(row({ note: 'only a note' }))).toBe(false);
  });

  it('calls a row blank only when nothing at all was typed', () => {
    expect(setRowIsBlank(row())).toBe(true);
    expect(setRowIsBlank(row({ note: 'x' }))).toBe(false);
    expect(setRowIsBlank(row({ weight: '5' }))).toBe(false);
  });

  // A ticked blank row is still blank: the tick alone is nothing to lose.
  it('ignores the tick when deciding a row is blank', () => {
    expect(setRowIsBlank(row({ done: true }))).toBe(true);
  });
});

describe('copySetRow', () => {
  it('carries the numbers into a fresh set, without the tick or the note', () => {
    expect(copySetRow(row({ weight: '135', reps: '8', note: 'failed last rep', done: true }))).toEqual(
      row({ weight: '135', reps: '8' }),
    );
  });
});

describe('fillFromSuggestion', () => {
  it('fills the empty boxes with what was showing greyed out', () => {
    expect(fillFromSuggestion(row(), row({ weight: '135', reps: '8' }))).toMatchObject({
      weight: '135',
      reps: '8',
    });
  });

  it('never overwrites what was typed', () => {
    expect(fillFromSuggestion(row({ weight: '140' }), row({ weight: '135', reps: '8' }))).toMatchObject({
      weight: '140',
      reps: '8',
    });
  });

  it('leaves the row alone when there is nothing to suggest', () => {
    const typed = row({ reps: '5' });

    expect(fillFromSuggestion(typed, null)).toBe(typed);
  });
});

describe('rowsFromHistory', () => {
  it('starts from last time’s numbers, unticked and without notes', () => {
    expect(
      rowsFromHistory([log({ weight: 135, reps: 8, note: 'felt heavy', timedSetSec: 40, done: true })]),
    ).toEqual([row({ weight: '135', reps: '8' })]);
  });
});

describe('suggestionForSet', () => {
  const lastTime = [log({ weight: 100, reps: 10 }), log({ weight: 110, reps: 8 })];

  it('suggests the set before it in this workout first', () => {
    const sets = [row({ weight: '120', reps: '6' }), row()];

    expect(suggestionForSet(sets, 1, lastTime)).toBe(sets[0]);
  });

  it('skips back over empty sets to the last one with numbers', () => {
    const sets = [row({ weight: '120', reps: '6' }), row(), row()];

    expect(suggestionForSet(sets, 2, lastTime)).toBe(sets[0]);
  });

  it('falls back to the same-numbered set from last time', () => {
    expect(suggestionForSet([row()], 0, lastTime)).toMatchObject({ weight: '100', reps: '10' });
  });

  it('uses last time’s final set once this workout has more sets', () => {
    expect(suggestionForSet([row(), row(), row()], 2, lastTime)).toMatchObject({
      weight: '110',
      reps: '8',
    });
  });

  it('suggests nothing with no earlier set and no history', () => {
    expect(suggestionForSet([row()], 0, undefined)).toBeNull();
  });
});

describe('minutes and seconds', () => {
  it('splits total seconds into the two boxes', () => {
    expect(splitTotalSeconds('90')).toEqual({ minutes: '1', seconds: '30' });
    expect(splitTotalSeconds('45')).toEqual({ minutes: '0', seconds: '45' });
    expect(splitTotalSeconds('')).toEqual({ minutes: '', seconds: '' });
  });

  it('combines the two boxes back into total seconds', () => {
    expect(combineToTotalSeconds('1', '30')).toBe('90');
    expect(combineToTotalSeconds('', '45')).toBe('45');
    expect(combineToTotalSeconds('2', '')).toBe('120');
    expect(combineToTotalSeconds('', '')).toBe('');
  });

  it('gives an empty value for something that is not a time', () => {
    expect(combineToTotalSeconds('x', '10')).toBe('');
    expect(splitTotalSeconds('-5')).toEqual({ minutes: '', seconds: '' });
  });
});

describe('field specs', () => {
  it('offers the boxes each metric needs on the quick card', () => {
    const ids = (metric: Parameters<typeof quickFieldsForMetric>[0]) =>
      quickFieldsForMetric(metric).map((field) => field.id);

    expect(ids('weight_reps')).toEqual(['weight', 'reps']);
    expect(ids('bodyweight_reps')).toEqual(['reps']);
    expect(ids('duration')).toEqual(['minutes', 'seconds']);
    expect(ids('cardio')).toEqual(['minutes', 'seconds', 'distance']);
  });

  it('keeps pace, incline and resistance for cardio details only', () => {
    expect(extraFieldsForMetric('cardio').map((field) => field.id)).toEqual([
      'pace',
      'incline',
      'resistance',
    ]);
    expect(extraFieldsForMetric('weight_reps')).toEqual([]);
  });

  it('edits minutes without disturbing seconds, and the other way round', () => {
    const [minutes, seconds] = quickFieldsForMetric('duration');
    const held = row({ seconds: '90' });

    expect(minutes.write(held, '2')).toEqual({ seconds: '150' });
    expect(seconds.write(held, '15')).toEqual({ seconds: '75' });
  });

  it('keeps the seconds box under a minute', () => {
    const [, seconds] = quickFieldsForMetric('duration');

    expect(seconds.write(row({ seconds: '60' }), '75')).toEqual({ seconds: '119' });
  });

  it('labels each box for a screen reader by set number', () => {
    const [weight] = quickFieldsForMetric('weight_reps');

    expect(weight.accessibilityLabel(2)).toBe('Weight for set 2');
  });
});
