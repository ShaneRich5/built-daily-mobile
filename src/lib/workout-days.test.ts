import {
  goalWeekStreak,
  sessionDayKey,
  workoutsByDay,
  workoutsInWeek,
} from '@/lib/workout-days';

type Status = 'completed' | 'in_progress';

const session = (workoutDate: string | null, status: Status = 'completed') => ({
  status,
  workoutDate,
  startedAt: new Date(2026, 10, 9, 18, 0),
  endedAt: status === 'completed' ? new Date(2026, 10, 10, 0, 30) : null,
});

/** A history with a workout on each of the given days. */
const days = (...keys: string[]) => workoutsByDay(keys.map((key) => session(key)));

describe('sessionDayKey', () => {
  it('uses the day the workout was filed under', () => {
    expect(sessionDayKey(session('2026-11-05'))).toBe('2026-11-05');
  });

  // Started Monday evening, finished after midnight: it ended on Tuesday.
  it('falls back to the day it ended, then the day it started', () => {
    expect(sessionDayKey(session(null))).toBe('2026-11-10');
    expect(sessionDayKey(session(null, 'in_progress'))).toBe('2026-11-09');
  });
});

describe('workoutsByDay', () => {
  it('counts completed workouts per day', () => {
    const byDay = workoutsByDay([session('2026-11-09'), session('2026-11-09'), session('2026-11-11')]);

    expect(byDay.get('2026-11-09')).toBe(2);
    expect(byDay.get('2026-11-11')).toBe(1);
  });

  it('leaves out a workout still in progress', () => {
    expect(workoutsByDay([session('2026-11-09', 'in_progress')]).size).toBe(0);
  });
});

describe('workoutsInWeek', () => {
  it('counts the seven days from the week start', () => {
    const byDay = days('2026-11-08', '2026-11-14', '2026-11-15');

    expect(workoutsInWeek(byDay, '2026-11-08')).toBe(2);
  });
});

describe('goalWeekStreak', () => {
  // Wednesday Nov 11, 2026. Weeks start Sun Nov 8, Nov 1, Oct 25, Oct 18.
  const today = '2026-11-11';
  const lastWeek = ['2026-11-02', '2026-11-04', '2026-11-06'];
  const twoWeeksAgo = ['2026-10-26', '2026-10-28', '2026-10-30'];

  it('counts weeks in a row that reached the goal', () => {
    expect(goalWeekStreak(days(...lastWeek, ...twoWeeksAgo), 3, today).current).toBe(2);
  });

  // The streak must not drop on a Monday just because the week has barely begun.
  it('is not broken by this week still being in progress', () => {
    expect(goalWeekStreak(days(...lastWeek, '2026-11-09'), 3, today).current).toBe(1);
  });

  it('includes this week once it has reached the goal', () => {
    const thisWeek = ['2026-11-08', '2026-11-09', '2026-11-10'];

    expect(goalWeekStreak(days(...thisWeek, ...lastWeek), 3, today).current).toBe(2);
  });

  it('resets when a finished week fell short', () => {
    const shortLastWeek = ['2026-11-02', '2026-11-04'];

    expect(goalWeekStreak(days(...shortLastWeek, ...twoWeeksAgo), 3, today).current).toBe(0);
  });

  it('remembers the longest run even after it has ended', () => {
    const threeWeeksAgo = ['2026-10-19', '2026-10-21', '2026-10-23'];
    const streak = goalWeekStreak(days(...twoWeeksAgo, ...threeWeeksAgo), 3, today);

    expect(streak).toEqual({ current: 0, longest: 2 });
  });

  it('is zero with no history at all', () => {
    expect(goalWeekStreak(new Map(), 3, today)).toEqual({ current: 0, longest: 0 });
  });

  it('follows the goal it is given', () => {
    const twoADay = days('2026-11-02', '2026-11-04');

    expect(goalWeekStreak(twoADay, 2, today).current).toBe(1);
    expect(goalWeekStreak(twoADay, 3, today).current).toBe(0);
  });
});
