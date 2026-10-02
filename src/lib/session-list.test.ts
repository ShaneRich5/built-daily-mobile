import { orderRecentSessions } from '@/lib/session-list';
import type { SessionStatus, WorkoutSession } from '@/types/workout';

function session(
  id: string,
  status: SessionStatus,
  startedAt: Date,
  endedAt: Date | null = null,
): WorkoutSession {
  return {
    id,
    status,
    title: id,
    planId: null,
    workoutDate: null,
    workoutTime: null,
    startedAt,
    endedAt,
    activeDurationSec: null,
    workoutNote: null,
    exerciseNotesByLineId: null,
    lines: [],
    exerciseCount: 0,
    setCount: 0,
    previewExerciseNames: [],
  };
}

const day = (n: number) => new Date(2026, 8, n);

describe('orderRecentSessions', () => {
  it('puts the workout still in progress above the finished ones', () => {
    const open = session('open', 'in_progress', day(10));
    const done = [
      session('done-1', 'completed', day(14), day(14)),
      session('done-2', 'completed', day(13), day(13)),
    ];

    expect(orderRecentSessions([open], done).map((s) => s.id)).toEqual([
      'open',
      'done-1',
      'done-2',
    ]);
  });

  // This is the bug it exists to prevent: an unfinished workout started days
  // ago still belongs at the top, even though every completed one is newer.
  it('keeps an older unfinished workout above newer finished ones', () => {
    const open = session('open', 'in_progress', day(1));
    const done = [session('done', 'completed', day(20), day(20))];

    expect(orderRecentSessions([open], done)[0].id).toBe('open');
  });

  it('sorts several unfinished workouts by when they started, newest first', () => {
    const open = [
      session('older', 'in_progress', day(5)),
      session('newest', 'in_progress', day(12)),
      session('middle', 'in_progress', day(9)),
    ];

    expect(orderRecentSessions(open, []).map((s) => s.id)).toEqual([
      'newest',
      'middle',
      'older',
    ]);
  });

  // The completed query already ordered them by `endedAt`; re-sorting here on
  // a different field would quietly disagree with it.
  it('leaves the finished workouts in the order the query returned', () => {
    const done = [
      session('first', 'completed', day(1), day(20)),
      session('second', 'completed', day(19), day(19)),
    ];

    expect(orderRecentSessions([], done).map((s) => s.id)).toEqual(['first', 'second']);
  });

  it('copes with either group being empty', () => {
    expect(orderRecentSessions([], [])).toEqual([]);
    expect(orderRecentSessions([session('open', 'in_progress', day(3))], [])).toHaveLength(1);
  });

  it('does not mutate what it was given', () => {
    const open = [
      session('older', 'in_progress', day(5)),
      session('newest', 'in_progress', day(12)),
    ];

    orderRecentSessions(open, []);

    expect(open.map((s) => s.id)).toEqual(['older', 'newest']);
  });
});
