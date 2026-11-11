import { EXERCISE_CATALOG } from '@/lib/exercise-catalog';
import {
  exerciseFromLine,
  finishState,
  sessionContent,
  sessionStateFrom,
} from '@/lib/session/session-state';
import {
  bench,
  doneRow,
  fly,
  item,
  line,
  log,
  row,
  session,
  state,
} from '@/lib/session/session-test-helpers';

const startedAt = new Date(2026, 10, 10, 18, 10);

describe('exerciseFromLine', () => {
  const known = EXERCISE_CATALOG[0];

  it('uses the catalog entry for an id it knows', () => {
    expect(
      exerciseFromLine({ exerciseId: known.id, nameSnapshot: known.name, metric: known.metric }),
    ).toEqual(known);
  });

  // History should read the way it was written, even if the catalog reworded it.
  it('keeps the name the line was logged under', () => {
    expect(
      exerciseFromLine({ exerciseId: known.id, nameSnapshot: 'Old name', metric: known.metric }).name,
    ).toBe('Old name');
  });

  it('falls back to the snapshot for a custom move', () => {
    expect(
      exerciseFromLine({ exerciseId: 'custom-1', nameSnapshot: 'Landmine twist', metric: 'weight_reps' }),
    ).toEqual({ id: 'custom-1', name: 'Landmine twist', metric: 'weight_reps' });
  });
});

describe('sessionStateFrom', () => {
  it('turns stored lines into editable exercises', () => {
    const stored = session('s1', [line(bench, [log({ weight: 135, reps: 8, done: true })])], {
      status: 'in_progress',
      exerciseNotesByLineId: { 'line-custom-bench': 'Pause at the chest' },
    });

    expect(sessionStateFrom(stored)).toMatchObject({
      title: 'Push day',
      workoutDate: '2026-11-10',
      workoutTime: '18:10',
      exercises: [
        {
          lineId: 'line-custom-bench',
          exercise: bench,
          sets: [doneRow('135', '8')],
          note: 'Pause at the chest',
          section: 'plan',
          alternates: [],
        },
      ],
    });
  });

  it('shows empty boxes for fields the document leaves null', () => {
    const stored = session('s1', [], { workoutDate: null, workoutTime: null, workoutNote: null });

    expect(sessionStateFrom(stored)).toMatchObject({ workoutDate: '', workoutTime: '', workoutNote: '' });
  });

  it('gives an exercise with no sets one empty row to type into', () => {
    expect(sessionStateFrom(session('s1', [line(bench, [])])).exercises[0].sets).toEqual([row()]);
  });

  it('reads maybes and alternates', () => {
    const stored = session('s1', [
      {
        ...line(bench, []),
        section: 'maybe',
        alternates: [{ exerciseId: fly.id, nameSnapshot: fly.name, metric: fly.metric }],
      },
    ]);

    expect(sessionStateFrom(stored).exercises[0]).toMatchObject({ section: 'maybe', alternates: [fly] });
  });

  // Resume where you left off.
  it('opens the first planned exercise that still has sets to do', () => {
    const stored = session(
      's1',
      [line(bench, [log({ weight: 135, reps: 8, done: true })]), line(fly, [log()])],
      { status: 'in_progress' },
    );

    expect(sessionStateFrom(stored).openLineId).toBe('line-custom-fly');
  });

  it('opens nothing when every planned exercise is done', () => {
    const stored = session('s1', [line(bench, [log({ weight: 135, reps: 8, done: true })])]);

    expect(sessionStateFrom(stored).openLineId).toBeNull();
  });
});

describe('sessionContent', () => {
  it('writes lines, notes and the counters the list screens read', () => {
    const content = sessionContent(
      state([
        item(bench, { sets: [doneRow('135', '8'), row()], note: '  Pause at the chest ' }),
        item(fly),
      ]),
      startedAt,
    );

    expect(content.lines).toEqual([
      line(bench, [log({ weight: 135, reps: 8, done: true }), log({ done: false })]),
      line(fly, [log({ done: false })]),
    ]);
    expect(content.exerciseNotesByLineId).toEqual({ 'line-custom-bench': 'Pause at the chest' });
    expect(content).toMatchObject({
      exerciseCount: 2,
      setCount: 3,
      previewExerciseNames: ['Bench', 'Cable fly'],
    });
  });

  it('stores no notes map at all when no exercise has a note', () => {
    expect(sessionContent(state([item(bench)]), startedAt).exerciseNotesByLineId).toBeNull();
  });

  // The Firestore rules reject an empty title.
  it('names an untitled workout after its start date', () => {
    expect(sessionContent(state([], { title: '   ' }), startedAt).title).toBe('Workout on 2026-11-10');
  });

  it('keeps a valid date and time, and stores blanks as null', () => {
    expect(sessionContent(state([]), startedAt)).toMatchObject({
      workoutDate: '2026-11-10',
      workoutTime: '18:10',
    });
    expect(sessionContent(state([], { workoutDate: '', workoutTime: '' }), startedAt)).toMatchObject({
      workoutDate: null,
      workoutTime: null,
    });
  });

  // Half-typed values must never reach the document — the rules would reject them.
  it('stores a date or time that is not valid as null', () => {
    expect(
      sessionContent(state([], { workoutDate: '2026-11-1', workoutTime: '25:00' }), startedAt),
    ).toMatchObject({ workoutDate: null, workoutTime: null });
  });

  it('stores a blank workout note as null', () => {
    expect(sessionContent(state([], { workoutNote: '  ' }), startedAt).workoutNote).toBeNull();
    expect(sessionContent(state([], { workoutNote: ' Felt strong ' }), startedAt).workoutNote).toBe(
      'Felt strong',
    );
  });

  it('writes section and alternates only when they say something', () => {
    const content = sessionContent(
      state([item(bench), item(fly, { section: 'maybe', alternates: [bench] })]),
      startedAt,
    );

    expect('section' in content.lines[0]).toBe(false);
    expect('alternates' in content.lines[0]).toBe(false);
    expect(content.lines[1]).toMatchObject({
      section: 'maybe',
      alternates: [{ exerciseId: bench.id, nameSnapshot: bench.name, metric: bench.metric }],
    });
  });

  it('survives a round trip back through the state', () => {
    const stored = session(
      's1',
      [
        line(bench, [log({ weight: 135, reps: 8, done: true }), log({ weight: 145, reps: 6, done: false })]),
        { ...line(fly, [log({ done: false })]), section: 'maybe' },
      ],
      { exerciseNotesByLineId: { 'line-custom-bench': 'Pause' }, workoutNote: 'Felt strong' },
    );

    const content = sessionContent(sessionStateFrom(stored), stored.startedAt);

    expect(content.lines).toEqual(stored.lines);
    expect(content.exerciseNotesByLineId).toEqual(stored.exerciseNotesByLineId);
    expect(content.workoutNote).toBe('Felt strong');
  });
});

describe('sessionContent for a finished workout', () => {
  // The edit screen has no ticks to press, so numbers are what make a set done.
  it('stores a set with numbers as done', () => {
    const content = sessionContent(
      state([item(bench, { sets: [row({ weight: '135', reps: '8' })] })]),
      startedAt,
      { finished: true },
    );

    expect(content.lines[0].sets[0].done).toBe(true);
  });

  it('leaves an empty row not done', () => {
    const content = sessionContent(state([item(bench)]), startedAt, { finished: true });

    expect(content.lines[0].sets[0].done).toBe(false);
  });

  // While a workout is live, typing a number is not the same as doing the set.
  it('does not tick anything for a workout still in progress', () => {
    const content = sessionContent(
      state([item(bench, { sets: [row({ weight: '135', reps: '8' })] })]),
      startedAt,
    );

    expect(content.lines[0].sets[0].done).toBe(false);
  });
});

describe('finishState', () => {
  // Skipping a maybe is not a miss, so it leaves no trace in the saved workout.
  it('drops maybes that were never started', () => {
    const finished = finishState(
      state([item(bench), item(fly, { section: 'maybe' })], { openLineId: 'line-custom-bench' }),
    );

    expect(finished.exercises.map((e) => e.exercise.id)).toEqual(['custom-bench']);
  });

  it('keeps a maybe that was started', () => {
    const finished = finishState(state([item(fly, { section: 'maybe', sets: [doneRow()] })]));

    expect(finished.exercises).toHaveLength(1);
  });

  // An untouched planned exercise stays: it was the plan.
  it('keeps planned exercises whether or not they were started', () => {
    expect(finishState(state([item(bench)])).exercises).toHaveLength(1);
  });
});
