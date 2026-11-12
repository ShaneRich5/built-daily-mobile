import { EXERCISE_CATALOG, exerciseGroup } from '@/lib/exercise-catalog';
import {
  formatCount,
  loggedSetCount,
  musclesWorkedLabel,
  sessionVolumeLbs,
  setChips,
  summaryStats,
  timeLabel,
} from '@/lib/session/session-summary';
import { bench, dips, line, log, plank } from '@/lib/session/session-test-helpers';

const benchLine = line(bench, [log({ weight: 135, reps: 8 }), log({ weight: 145, reps: 6 }), log()]);
const dipsLine = line(dips, [log({ reps: 12 })]);
const plankLine = line(plank, [log({ durationSec: 60 })]);

describe('loggedSetCount', () => {
  // The empty third bench row is a box nobody filled in, not a set.
  it('counts only sets that recorded something', () => {
    expect(loggedSetCount([benchLine, dipsLine])).toBe(3);
  });
});

describe('sessionVolumeLbs', () => {
  it('sums weight × reps over the sets that have both', () => {
    expect(sessionVolumeLbs([benchLine, dipsLine, plankLine])).toBe(135 * 8 + 145 * 6);
  });

  it('is zero for a workout with no weighted sets', () => {
    expect(sessionVolumeLbs([dipsLine, plankLine])).toBe(0);
  });
});

describe('formatCount', () => {
  it('groups thousands', () => {
    expect(formatCount(950)).toBe('950');
    expect(formatCount(1950)).toBe('1,950');
    expect(formatCount(1234567)).toBe('1,234,567');
  });
});

describe('summaryStats', () => {
  it('shows exercises, sets and the weight moved', () => {
    expect(summaryStats({ lines: [benchLine, dipsLine] })).toEqual([
      { value: '2', label: 'Exercises' },
      { value: '3', label: 'Sets' },
      { value: '1,950', label: 'lb moved' },
    ]);
  });

  // "0 lb" would read as a failure, not as "this was a bodyweight day".
  it('leaves volume out when there is none', () => {
    expect(summaryStats({ lines: [dipsLine] })).toEqual([
      { value: '1', label: 'Exercise' },
      { value: '1', label: 'Set' },
    ]);
  });
});

describe('musclesWorkedLabel', () => {
  const chest = EXERCISE_CATALOG.find((exercise) => exerciseGroup(exercise) === 'chest');

  it('names the muscles worked hardest', () => {
    if (!chest) throw new Error('the catalog has no chest exercise');

    expect(musclesWorkedLabel([line(chest, [log({ weight: 135, reps: 8 })])])).toMatch(/Chest/);
  });

  it('is empty when nothing in the workout can be placed', () => {
    expect(musclesWorkedLabel([line({ ...bench, name: 'Mystery move' }, [log({ reps: 5 })])])).toBe('');
  });
});

describe('setChips', () => {
  it('lists the sets that recorded something, numbered as they were done', () => {
    expect(setChips(line(bench, [log(), log({ weight: 135, reps: 8, note: 'paused' })]))).toEqual([
      { number: 2, text: '135 lb × 8', note: 'paused' },
    ]);
  });
});

describe('timeLabel', () => {
  it('reads a 24-hour time on a 12-hour clock', () => {
    expect(timeLabel('18:10')).toBe('6:10 PM');
    expect(timeLabel('06:05')).toBe('6:05 AM');
    expect(timeLabel('00:30')).toBe('12:30 AM');
    expect(timeLabel('12:00')).toBe('12:00 PM');
  });

  it('hands back anything that is not a time', () => {
    expect(timeLabel('evening')).toBe('evening');
    expect(timeLabel('25:00')).toBe('25:00');
  });
});
