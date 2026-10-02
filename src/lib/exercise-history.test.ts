import {
  isLoggedSet,
  lastPerformanceByExercise,
  startingSetsFrom,
} from '@/lib/exercise-history';
import { EMPTY_SET } from '@/lib/session-edit';
import type { SessionLine, SessionStatus, SetLog, WorkoutSession } from '@/types/workout';

function set(overrides: Partial<SetLog> = {}): SetLog {
  return { ...EMPTY_SET, ...overrides };
}

function line(exerciseId: string, sets: SetLog[], nameSnapshot = exerciseId): SessionLine {
  return { lineId: `l-${exerciseId}`, exerciseId, nameSnapshot, metric: 'weight_reps', sets };
}

function session(
  id: string,
  endedAt: Date | null,
  lines: SessionLine[],
  status: SessionStatus = 'completed',
): WorkoutSession {
  return {
    id,
    status,
    title: id,
    planId: null,
    workoutDate: null,
    workoutTime: null,
    startedAt: endedAt ?? new Date(2026, 0, 1),
    endedAt,
    activeDurationSec: null,
    workoutNote: null,
    exerciseNotesByLineId: null,
    lines,
    exerciseCount: lines.length,
    setCount: lines.reduce((total, l) => total + l.sets.length, 0),
    previewExerciseNames: lines.map((l) => l.nameSnapshot),
  };
}

const day = (n: number) => new Date(2026, 8, n);

describe('isLoggedSet', () => {
  it('rejects a set with nothing in it', () => {
    expect(isLoggedSet(EMPTY_SET)).toBe(false);
  });

  it.each([
    ['weight', { weight: 135 }],
    ['reps', { reps: 8 }],
    ['durationSec', { durationSec: 60 }],
    ['timedSetSec', { timedSetSec: 45 }],
    ['paceMph', { paceMph: 3.5 }],
    ['inclinePercent', { inclinePercent: 2 }],
    ['resistanceLevel', { resistanceLevel: 7 }],
    ['distanceMiles', { distanceMiles: 1.5 }],
  ])('accepts a set that recorded %s', (_field, overrides) => {
    expect(isLoggedSet(set(overrides))).toBe(true);
  });

  // A note alone is not a performance — there is nothing to start from.
  it('rejects a set carrying only a note', () => {
    expect(isLoggedSet(set({ note: 'felt heavy' }))).toBe(false);
  });
});

describe('lastPerformanceByExercise', () => {
  it('finds the most recent time an exercise was done', () => {
    const sessions = [
      session('older', day(10), [line('bench', [set({ weight: 135, reps: 8 })])]),
      session('newer', day(20), [line('bench', [set({ weight: 145, reps: 6 })])]),
    ];

    expect(lastPerformanceByExercise(sessions).get('bench')).toMatchObject({
      sessionId: 'newer',
      performedAt: day(20),
    });
  });

  it('does not care what order the sessions arrive in', () => {
    const sessions = [
      session('newer', day(20), [line('bench', [set({ weight: 145 })])]),
      session('older', day(10), [line('bench', [set({ weight: 135 })])]),
    ];

    expect(lastPerformanceByExercise(sessions).get('bench')?.sessionId).toBe('newer');
  });

  it('tracks each exercise separately', () => {
    const sessions = [
      session('a', day(10), [line('bench', [set({ weight: 135 })]), line('row', [set({ weight: 95 })])]),
      session('b', day(20), [line('bench', [set({ weight: 145 })])]),
    ];

    const latest = lastPerformanceByExercise(sessions);

    expect(latest.get('bench')?.sessionId).toBe('b');
    expect(latest.get('row')?.sessionId).toBe('a');
  });

  // Half-entered numbers are a poor thing to start the next workout from.
  it('ignores a workout still in progress', () => {
    const sessions = [
      session('done', day(10), [line('bench', [set({ weight: 135 })])]),
      session('open', null, [line('bench', [set({ weight: 999 })])], 'in_progress'),
    ];

    expect(lastPerformanceByExercise(sessions).get('bench')?.sessionId).toBe('done');
  });

  it('ignores a discarded workout', () => {
    const sessions = [session('bin', day(20), [line('bench', [set({ weight: 999 })])], 'discarded')];

    expect(lastPerformanceByExercise(sessions).has('bench')).toBe(false);
  });

  // Reopening a completed workout must not offer that workout as its own history.
  it('leaves out the session being edited', () => {
    const sessions = [
      session('older', day(10), [line('bench', [set({ weight: 135 })])]),
      session('editing', day(20), [line('bench', [set({ weight: 145 })])]),
    ];

    expect(lastPerformanceByExercise(sessions, 'editing').get('bench')?.sessionId).toBe('older');
  });

  it('keeps only the sets that recorded something', () => {
    const sessions = [
      session('a', day(10), [line('bench', [set({ weight: 135, reps: 8 }), set(), set({ reps: 5 })])]),
    ];

    expect(lastPerformanceByExercise(sessions).get('bench')?.sets).toEqual([
      set({ weight: 135, reps: 8 }),
      set({ reps: 5 }),
    ]);
  });

  it('skips an exercise that was added but never logged', () => {
    const sessions = [session('a', day(10), [line('bench', [set(), set()])])];

    expect(lastPerformanceByExercise(sessions).has('bench')).toBe(false);
  });

  it('falls back to the start time when a workout has no end time', () => {
    const noEnd = session('a', null, [line('bench', [set({ weight: 135 })])]);

    expect(lastPerformanceByExercise([noEnd]).get('bench')?.performedAt).toEqual(noEnd.startedAt);
  });

  it('records the metric the exercise was logged under', () => {
    const sessions = [
      session('a', day(10), [
        { ...line('plank', [set({ durationSec: 60 })]), metric: 'duration' as const },
      ]),
    ];

    expect(lastPerformanceByExercise(sessions).get('plank')?.metric).toBe('duration');
  });

  it('finds nothing in an empty history', () => {
    expect(lastPerformanceByExercise([]).size).toBe(0);
  });
});

describe('startingSetsFrom', () => {
  const performance = {
    sessionId: 'a',
    performedAt: day(10),
    metric: 'weight_reps' as const,
    sets: [set({ weight: 135, reps: 8, note: 'felt heavy' }), set({ weight: 135, reps: 6 })],
  };

  it('carries the numbers over', () => {
    expect(startingSetsFrom(performance).map((s) => [s.weight, s.reps])).toEqual([
      [135, 8],
      [135, 6],
    ]);
  });

  // The note described the set it was written for, not the one about to be done.
  it('drops the notes', () => {
    expect(startingSetsFrom(performance).every((s) => s.note === null)).toBe(true);
  });

  it('does not hand back the stored sets themselves', () => {
    const copied = startingSetsFrom(performance);
    copied[0].weight = 999;

    expect(performance.sets[0].weight).toBe(135);
  });
});
