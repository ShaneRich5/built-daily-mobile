import {
  applyStatusTransition,
  blankToNull,
  deriveCounters,
  editableSetFields,
  fromDraftLines,
  isValidWorkoutDate,
  isValidWorkoutTime,
  numericFieldValue,
  parseNumericField,
  pruneExerciseNotes,
  toDraftLines,
} from '@/lib/session-edit';
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

function line(lineId: string, nameSnapshot: string, sets: SetLog[]): SessionLine {
  return { lineId, exerciseId: 'bench', nameSnapshot, metric: 'weight_reps', sets };
}

describe('deriveCounters', () => {
  it('counts exercises and sets, and previews the first names', () => {
    const lines = [
      line('a', 'Bench', [emptySet, emptySet]),
      line('b', 'Squat', [emptySet]),
    ];

    expect(deriveCounters(lines)).toEqual({
      exerciseCount: 2,
      setCount: 3,
      previewExerciseNames: ['Bench', 'Squat'],
    });
  });

  it('caps the preview at five names', () => {
    const lines = Array.from({ length: 8 }, (_, i) => line(`l${i}`, `Move ${i}`, []));

    expect(deriveCounters(lines).previewExerciseNames).toEqual([
      'Move 0',
      'Move 1',
      'Move 2',
      'Move 3',
      'Move 4',
    ]);
  });

  it('zeroes out for a session with nothing left in it', () => {
    expect(deriveCounters([])).toEqual({
      exerciseCount: 0,
      setCount: 0,
      previewExerciseNames: [],
    });
  });
});

describe('applyStatusTransition', () => {
  const now = new Date('2026-09-29T18:00:00Z');

  it('stamps endedAt when a workout is finished', () => {
    const patch = applyStatusTransition({ status: 'in_progress', endedAt: null }, 'completed', now);

    expect(patch).toEqual({ status: 'completed', endedAt: now });
  });

  it('clears endedAt when a workout is reopened, since the query orders on it', () => {
    const ended = new Date('2026-09-20T10:00:00Z');
    const patch = applyStatusTransition({ status: 'completed', endedAt: ended }, 'in_progress', now);

    expect(patch).toEqual({ status: 'in_progress', endedAt: null });
  });

  it('keeps the original endedAt rather than restamping an already-ended session', () => {
    const ended = new Date('2026-09-20T10:00:00Z');
    const patch = applyStatusTransition({ status: 'completed', endedAt: ended }, 'discarded', now);

    expect(patch).toEqual({ status: 'discarded', endedAt: ended });
  });

  it('stamps endedAt when an unfinished workout is discarded', () => {
    const patch = applyStatusTransition({ status: 'in_progress', endedAt: null }, 'discarded', now);

    expect(patch.endedAt).toEqual(now);
  });
});

describe('isValidWorkoutDate', () => {
  it('accepts a real day', () => {
    expect(isValidWorkoutDate('2026-09-29')).toBe(true);
  });

  it('rejects a day that does not exist', () => {
    expect(isValidWorkoutDate('2026-02-31')).toBe(false);
    expect(isValidWorkoutDate('2026-13-01')).toBe(false);
  });

  it('rejects anything that is not YYYY-MM-DD', () => {
    expect(isValidWorkoutDate('9/29/2026')).toBe(false);
    expect(isValidWorkoutDate('2026-9-29')).toBe(false);
    expect(isValidWorkoutDate('')).toBe(false);
  });
});

describe('isValidWorkoutTime', () => {
  it('accepts a 24-hour time', () => {
    expect(isValidWorkoutTime('18:30')).toBe(true);
    expect(isValidWorkoutTime('00:00')).toBe(true);
  });

  it('rejects an out-of-range time', () => {
    expect(isValidWorkoutTime('24:00')).toBe(false);
    expect(isValidWorkoutTime('12:60')).toBe(false);
    expect(isValidWorkoutTime('6:30')).toBe(false);
  });
});

describe('blankToNull', () => {
  it('stores null rather than an empty string', () => {
    expect(blankToNull('   ')).toBeNull();
    expect(blankToNull('')).toBeNull();
  });

  it('trims a real value', () => {
    expect(blankToNull('  Leg day ')).toBe('Leg day');
  });
});

describe('parseNumericField', () => {
  it('reads a typed number', () => {
    expect(parseNumericField('135')).toBe(135);
    expect(parseNumericField('2.5')).toBe(2.5);
  });

  it('treats an empty box as no value', () => {
    expect(parseNumericField('')).toBeNull();
    expect(parseNumericField('  ')).toBeNull();
  });

  it('never yields NaN for junk', () => {
    expect(parseNumericField('heavy')).toBeNull();
  });

  it('round-trips through the display helper', () => {
    expect(parseNumericField(numericFieldValue(null))).toBeNull();
    expect(parseNumericField(numericFieldValue(225))).toBe(225);
  });
});

describe('pruneExerciseNotes', () => {
  it('drops notes whose exercise was removed', () => {
    const lines = [line('a', 'Bench', [])];

    expect(pruneExerciseNotes({ a: 'felt good', b: 'orphan' }, lines)).toEqual({ a: 'felt good' });
  });

  it('drops notes that were blanked out', () => {
    const lines = [line('a', 'Bench', [])];

    expect(pruneExerciseNotes({ a: '   ' }, lines)).toBeNull();
  });

  it('stores null rather than an empty map', () => {
    expect(pruneExerciseNotes({}, [])).toBeNull();
    expect(pruneExerciseNotes(null, [])).toBeNull();
  });
});

describe('draft round trip', () => {
  it('preserves fields the editor never shows', () => {
    // A cardio set logged on the web carries pace, incline and a note. Editing
    // the workout on the phone must not silently drop them.
    const rich: SetLog = {
      ...emptySet,
      durationSec: 1800,
      distanceMiles: 3,
      paceMph: 6.5,
      inclinePercent: 2,
      resistanceLevel: 7,
      timedSetSec: 45,
      note: 'easy pace',
    };

    const [restored] = fromDraftLines(toDraftLines([line('a', 'Treadmill', [rich])]));

    expect(restored.sets[0]).toEqual(rich);
  });

  it('carries edited numbers back', () => {
    const draft = toDraftLines([line('a', 'Bench', [{ ...emptySet, weight: 135, reps: 8 }])]);
    draft[0].sets[0].weight = '145';

    expect(fromDraftLines(draft)[0].sets[0]).toMatchObject({ weight: 145, reps: 8 });
  });

  it('clears a number when its box is emptied', () => {
    const draft = toDraftLines([line('a', 'Bench', [{ ...emptySet, weight: 135, reps: 8 }])]);
    draft[0].sets[0].weight = '';

    expect(fromDraftLines(draft)[0].sets[0].weight).toBeNull();
  });

  it('trims a renamed exercise', () => {
    const draft = toDraftLines([line('a', 'Bench', [])]);
    draft[0].nameSnapshot = '  Incline bench  ';

    expect(fromDraftLines(draft)[0].nameSnapshot).toBe('Incline bench');
  });
});

describe('editableSetFields', () => {
  it('shows weight and reps for a loaded lift', () => {
    expect(editableSetFields('weight_reps').map((f) => f.key)).toEqual(['weight', 'reps']);
  });

  it('shows only reps for a bodyweight move', () => {
    expect(editableSetFields('bodyweight_reps').map((f) => f.key)).toEqual(['reps']);
  });

  it('shows seconds for a hold', () => {
    expect(editableSetFields('duration').map((f) => f.key)).toEqual(['durationSec']);
  });

  it('shows time and distance for cardio', () => {
    expect(editableSetFields('cardio').map((f) => f.key)).toEqual(['durationSec', 'distanceMiles']);
  });
});
