import {
  formatClock,
  formatSet,
  sessionDayLabel,
  sessionDurationLabel,
  sessionStatusColor,
  sessionStatusLabel,
  sessionVolumeLabel,
} from '@/lib/session-format';
import type { SetLog } from '@/types/workout';

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

describe('sessionDayLabel', () => {
  it('uses the local calendar day recorded on the web, not the timestamp', () => {
    // 23:00 UTC on the 20th is still the 20th for the user who logged it, and
    // workoutDate carries that intent.
    const label = sessionDayLabel({
      workoutDate: '2026-09-20',
      endedAt: new Date('2026-09-20T23:00:00Z'),
      startedAt: new Date('2026-09-20T22:00:00Z'),
    });

    expect(label).toContain('20');
    expect(label).toContain('Sep');
  });

  it('does not shift the day backwards for timezones behind UTC', () => {
    // Guards the `new Date('2026-09-20')` trap, which is midnight UTC.
    expect(sessionDayLabel({ workoutDate: '2026-09-20', endedAt: null, startedAt: new Date(0) })).toContain(
      '20',
    );
  });

  it('falls back to endedAt when workoutDate is absent', () => {
    const label = sessionDayLabel({
      workoutDate: null,
      endedAt: new Date(2026, 8, 15),
      startedAt: new Date(2026, 8, 14),
    });

    expect(label).toContain('15');
  });

  it('falls back to startedAt for an unfinished session', () => {
    const label = sessionDayLabel({
      workoutDate: null,
      endedAt: null,
      startedAt: new Date(2026, 8, 14),
    });

    expect(label).toContain('14');
  });
});

describe('sessionVolumeLabel', () => {
  it('pluralizes both counts', () => {
    expect(sessionVolumeLabel({ exerciseCount: 3, setCount: 9 })).toBe('3 exercises · 9 sets');
  });

  it('uses singular forms for one', () => {
    expect(sessionVolumeLabel({ exerciseCount: 1, setCount: 1 })).toBe('1 exercise · 1 set');
  });
});

describe('sessionDurationLabel', () => {
  it('shows minutes under an hour', () => {
    expect(sessionDurationLabel(2700)).toBe('45 min');
  });

  it('shows hours and minutes past an hour', () => {
    expect(sessionDurationLabel(5400)).toBe('1 hr 30 min');
  });

  it('omits minutes on a whole hour', () => {
    expect(sessionDurationLabel(3600)).toBe('1 hr');
  });

  it('returns null when there is no recorded duration', () => {
    expect(sessionDurationLabel(null)).toBeNull();
    expect(sessionDurationLabel(0)).toBeNull();
  });
});

describe('formatClock', () => {
  it('zero-pads the seconds', () => {
    expect(formatClock(45)).toBe('0:45');
    expect(formatClock(90)).toBe('1:30');
    expect(formatClock(605)).toBe('10:05');
  });
});

describe('formatSet', () => {
  it('reads weight and reps together', () => {
    expect(formatSet({ ...emptySet, weight: 135, reps: 10 }, 'weight_reps')).toBe('135 lb × 10');
  });

  it('handles a weight-only or reps-only weighted set', () => {
    expect(formatSet({ ...emptySet, weight: 135 }, 'weight_reps')).toBe('135 lb');
    expect(formatSet({ ...emptySet, reps: 10 }, 'weight_reps')).toBe('10 reps');
  });

  it('shows reps alone for bodyweight movements', () => {
    expect(formatSet({ ...emptySet, reps: 12 }, 'bodyweight_reps')).toBe('12 reps');
  });

  it('shows a clock for a hold', () => {
    expect(formatSet({ ...emptySet, durationSec: 45 }, 'duration')).toBe('0:45');
  });

  it('combines the cardio fields that were filled in', () => {
    const set = { ...emptySet, durationSec: 1200, distanceMiles: 2.5, paceMph: 6 };

    expect(formatSet(set, 'cardio')).toBe('20:00 · 2.5 mi · 6 mph');
  });

  it('omits cardio fields that were left blank', () => {
    expect(formatSet({ ...emptySet, durationSec: 600 }, 'cardio')).toBe('10:00');
  });

  it('appends a set stopwatch to non-duration metrics', () => {
    expect(formatSet({ ...emptySet, reps: 8, timedSetSec: 30 }, 'bodyweight_reps')).toBe(
      '8 reps · 0:30',
    );
  });

  it('does not double-count the clock for a duration hold', () => {
    expect(formatSet({ ...emptySet, durationSec: 60, timedSetSec: 60 }, 'duration')).toBe('1:00');
  });

  it('falls back to a dash when a set has no usable values', () => {
    expect(formatSet(emptySet, 'weight_reps')).toBe('—');
  });
});

describe('sessionStatusLabel', () => {
  it('names every status a session can hold', () => {
    expect(sessionStatusLabel('in_progress')).toBe('In progress');
    expect(sessionStatusLabel('completed')).toBe('Completed');
    expect(sessionStatusLabel('discarded')).toBe('Discarded');
  });
});

describe('sessionStatusColor', () => {
  it('pulls the eye to a workout still waiting to be finished', () => {
    expect(sessionStatusColor('in_progress')).toBe('tint');
  });

  it('keeps a completed workout quiet, since that is the norm', () => {
    expect(sessionStatusColor('completed')).toBe('textSecondary');
  });

  it('calls out a discarded workout', () => {
    expect(sessionStatusColor('discarded')).toBe('danger');
  });
});
