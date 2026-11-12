import { MAX_ALTERNATES } from '@/lib/line-grouping';
import { MAX_SESSION_EXERCISES } from '@/lib/session/session-model';
import {
  fullIndexForSectionMove,
  nextUnfinishedAfter,
  sessionReducer,
} from '@/lib/session/session-reducer';
import {
  bench,
  dips,
  doneRow,
  fly,
  item,
  plank,
  row,
  state,
} from '@/lib/session/session-test-helpers';

const ids = (s: ReturnType<typeof state>) => s.exercises.map((e) => e.exercise.id);

describe('updateMeta', () => {
  it('changes only the fields in the patch', () => {
    const next = sessionReducer(state([]), { type: 'updateMeta', patch: { title: 'Pull day' } });

    expect(next.title).toBe('Pull day');
    expect(next.workoutDate).toBe('2026-11-10');
  });
});

describe('opening exercises', () => {
  it('opens one card and closes it again', () => {
    const opened = sessionReducer(state([item(bench)]), { type: 'openExercise', lineId: 'line-custom-bench' });
    expect(opened.openLineId).toBe('line-custom-bench');

    expect(sessionReducer(opened, { type: 'openExercise', lineId: null }).openLineId).toBeNull();
  });

  it('moves on to the next exercise with sets left', () => {
    const start = state([item(bench, { sets: [doneRow()] }), item(fly, { sets: [doneRow()] }), item(dips)]);

    expect(
      sessionReducer(start, { type: 'openNextExercise', afterLineId: 'line-custom-bench' }).openLineId,
    ).toBe('line-custom-dips');
  });

  // The last exercise wraps round to one that was skipped earlier.
  it('wraps around to an unfinished exercise earlier in the list', () => {
    const exercises = [item(bench), item(fly, { sets: [doneRow()] })];

    expect(nextUnfinishedAfter(exercises, 'line-custom-fly')).toBe('line-custom-bench');
  });

  it('has nowhere to go when everything else is done', () => {
    const exercises = [item(bench, { sets: [doneRow()] }), item(fly, { sets: [doneRow()] })];

    expect(nextUnfinishedAfter(exercises, 'line-custom-bench')).toBeNull();
  });

  // Maybes wait to be picked; "Next exercise" never walks into one.
  it('skips maybes', () => {
    const exercises = [item(bench, { sets: [doneRow()] }), item(fly, { section: 'maybe' })];

    expect(nextUnfinishedAfter(exercises, 'line-custom-bench')).toBeNull();
  });
});

describe('addExercises', () => {
  it('adds at the end, in the order picked, each with one empty set', () => {
    const next = sessionReducer(state([item(bench)]), {
      type: 'addExercises',
      items: [
        { lineId: 'a', exercise: fly },
        { lineId: 'b', exercise: dips },
      ],
    });

    expect(ids(next)).toEqual(['custom-bench', 'custom-fly', 'custom-dips']);
    expect(next.exercises[1]).toMatchObject({ lineId: 'a', section: 'plan', sets: [row()] });
  });

  it('opens the first one added', () => {
    const next = sessionReducer(state([item(bench)]), {
      type: 'addExercises',
      items: [
        { lineId: 'a', exercise: fly },
        { lineId: 'b', exercise: dips },
      ],
    });

    expect(next.openLineId).toBe('a');
  });

  it('adds a maybe without opening it', () => {
    const start = state([item(bench)], { openLineId: 'line-custom-bench' });
    const next = sessionReducer(start, {
      type: 'addExercises',
      items: [{ lineId: 'a', exercise: fly }],
      section: 'maybe',
    });

    expect(next.exercises[1].section).toBe('maybe');
    expect(next.openLineId).toBe('line-custom-bench');
  });

  it('stops at the limit for one workout', () => {
    const full = state(
      Array.from({ length: MAX_SESSION_EXERCISES - 1 }, (_, i) => item(bench, { lineId: `l${i}` })),
    );
    const next = sessionReducer(full, {
      type: 'addExercises',
      items: [
        { lineId: 'a', exercise: fly },
        { lineId: 'b', exercise: dips },
      ],
    });

    expect(next.exercises).toHaveLength(MAX_SESSION_EXERCISES);
    expect(sessionReducer(next, { type: 'addExercises', items: [{ lineId: 'c', exercise: dips }] })).toBe(next);
  });
});

describe('swapExercise', () => {
  it('puts the new exercise in the slot and keeps the old one as an alternate', () => {
    const next = sessionReducer(state([item(bench)]), {
      type: 'swapExercise',
      lineId: 'line-custom-bench',
      exercise: fly,
    });

    expect(next.exercises[0].exercise).toBe(fly);
    expect(next.exercises[0].alternates).toEqual([bench]);
  });

  // Swapping back must not list the exercise as its own alternate.
  it('swaps back in one step without duplicating alternates', () => {
    const swapped = sessionReducer(state([item(bench)]), {
      type: 'swapExercise',
      lineId: 'line-custom-bench',
      exercise: fly,
    });
    const back = sessionReducer(swapped, {
      type: 'swapExercise',
      lineId: 'line-custom-bench',
      exercise: bench,
    });

    expect(back.exercises[0].exercise).toBe(bench);
    expect(back.exercises[0].alternates).toEqual([fly]);
  });

  it('keeps the sets when both exercises log the same way', () => {
    const next = sessionReducer(state([item(bench, { sets: [doneRow()] })]), {
      type: 'swapExercise',
      lineId: 'line-custom-bench',
      exercise: fly,
    });

    expect(next.exercises[0].sets).toEqual([doneRow()]);
  });

  // Weight and reps mean nothing against a plank.
  it('clears the sets when the new exercise logs differently', () => {
    const next = sessionReducer(state([item(bench, { sets: [doneRow()] })]), {
      type: 'swapExercise',
      lineId: 'line-custom-bench',
      exercise: plank,
    });

    expect(next.exercises[0].sets).toEqual([row()]);
  });

  it('caps the alternates on a slot', () => {
    const many = Array.from({ length: MAX_ALTERNATES }, (_, i) => ({ ...fly, id: `alt-${i}` }));
    const next = sessionReducer(state([item(bench, { alternates: many })]), {
      type: 'swapExercise',
      lineId: 'line-custom-bench',
      exercise: dips,
    });

    expect(next.exercises[0].alternates).toHaveLength(MAX_ALTERNATES);
    expect(next.exercises[0].alternates[0]).toBe(bench);
  });

  it('does nothing when swapping an exercise for itself', () => {
    const start = state([item(bench)]);

    expect(sessionReducer(start, { type: 'swapExercise', lineId: 'line-custom-bench', exercise: bench }).exercises[0]).toBe(
      start.exercises[0],
    );
  });
});

describe('setSection', () => {
  it('moves a planned exercise to maybe and closes its card', () => {
    const start = state([item(bench)], { openLineId: 'line-custom-bench' });
    const next = sessionReducer(start, { type: 'setSection', lineId: 'line-custom-bench', section: 'maybe' });

    expect(next.exercises[0].section).toBe('maybe');
    expect(next.openLineId).toBeNull();
  });

  it('moves a maybe into the plan and opens it for "Do it"', () => {
    const start = state([item(bench, { section: 'maybe' })]);
    const next = sessionReducer(start, {
      type: 'setSection',
      lineId: 'line-custom-bench',
      section: 'plan',
      open: true,
    });

    expect(next.exercises[0].section).toBe('plan');
    expect(next.openLineId).toBe('line-custom-bench');
  });
});

describe('removeExercise', () => {
  it('removes the exercise', () => {
    const next = sessionReducer(state([item(bench), item(fly)]), {
      type: 'removeExercise',
      lineId: 'line-custom-bench',
    });

    expect(ids(next)).toEqual(['custom-fly']);
  });

  it('opens the exercise that takes its place when the open one is removed', () => {
    const start = state([item(bench), item(fly), item(dips)], { openLineId: 'line-custom-fly' });

    expect(sessionReducer(start, { type: 'removeExercise', lineId: 'line-custom-fly' }).openLineId).toBe(
      'line-custom-dips',
    );
  });

  it('leaves another open card alone', () => {
    const start = state([item(bench), item(fly)], { openLineId: 'line-custom-bench' });

    expect(sessionReducer(start, { type: 'removeExercise', lineId: 'line-custom-fly' }).openLineId).toBe(
      'line-custom-bench',
    );
  });

  it('has no card open once the last exercise is removed', () => {
    const start = state([item(bench)], { openLineId: 'line-custom-bench' });

    expect(sessionReducer(start, { type: 'removeExercise', lineId: 'line-custom-bench' }).openLineId).toBeNull();
  });
});

describe('moveExercise', () => {
  const start = state([item(bench), item(fly), item(dips)]);

  it('moves an exercise to a new position', () => {
    expect(ids(sessionReducer(start, { type: 'moveExercise', lineId: 'line-custom-dips', toIndex: 0 }))).toEqual([
      'custom-dips',
      'custom-bench',
      'custom-fly',
    ]);
  });

  it('clamps a position past either end', () => {
    expect(ids(sessionReducer(start, { type: 'moveExercise', lineId: 'line-custom-bench', toIndex: 99 }))).toEqual([
      'custom-fly',
      'custom-dips',
      'custom-bench',
    ]);
  });

  it('keeps the same state when nothing moves', () => {
    expect(sessionReducer(start, { type: 'moveExercise', lineId: 'line-custom-fly', toIndex: 1 })).toBe(start);
  });
});

describe('fullIndexForSectionMove', () => {
  // bench (plan), fly (maybe), dips (plan), plank (plan)
  const mixed = [item(bench), item(fly, { section: 'maybe' }), item(dips), item(plank)];

  const moved = (lineId: string, toIndex: number) =>
    ids(
      sessionReducer(state(mixed), {
        type: 'moveExercise',
        lineId,
        toIndex: fullIndexForSectionMove(mixed, lineId, toIndex),
      }),
    ).filter((id) => id !== 'custom-fly');

  it('moves to the top of its own section', () => {
    expect(moved('line-custom-plank', 0)).toEqual(['custom-plank', 'custom-bench', 'custom-dips']);
  });

  it('moves to the middle of its own section', () => {
    expect(moved('line-custom-bench', 1)).toEqual(['custom-dips', 'custom-bench', 'custom-plank']);
  });

  it('moves to the end of its own section', () => {
    expect(moved('line-custom-bench', 2)).toEqual(['custom-dips', 'custom-plank', 'custom-bench']);
  });

  it('copes with being the only exercise in its section', () => {
    expect(fullIndexForSectionMove(mixed, 'line-custom-fly', 0)).toBe(0);
  });
});

describe('sets', () => {
  const start = state([item(bench, { sets: [row({ weight: '135', reps: '8' })] })]);
  const lineId = 'line-custom-bench';
  const sets = (s: typeof start) => s.exercises[0].sets;

  it('edits one field of one set', () => {
    const next = sessionReducer(start, { type: 'updateSet', lineId, setIndex: 0, patch: { reps: '6' } });

    expect(sets(next)).toEqual([row({ weight: '135', reps: '6' })]);
  });

  it('adds an empty set', () => {
    expect(sets(sessionReducer(start, { type: 'addSet', lineId }))).toEqual([
      row({ weight: '135', reps: '8' }),
      row(),
    ]);
  });

  it('copies the last set, unticked', () => {
    const ticked = state([item(bench, { sets: [doneRow('135', '8')] })]);

    expect(sets(sessionReducer(ticked, { type: 'copyLastSet', lineId }))).toEqual([
      doneRow('135', '8'),
      row({ weight: '135', reps: '8' }),
    ]);
  });

  it('removes a set', () => {
    const two = sessionReducer(start, { type: 'addSet', lineId });

    expect(sets(sessionReducer(two, { type: 'removeSet', lineId, setIndex: 0 }))).toEqual([row()]);
  });

  // An exercise always has a row to type into.
  it('leaves one empty set when the last one is removed', () => {
    expect(sets(sessionReducer(start, { type: 'removeSet', lineId, setIndex: 0 }))).toEqual([row()]);
  });

  it('replaces the sets, e.g. with a past session’s', () => {
    const next = sessionReducer(start, { type: 'replaceSets', lineId, sets: [row({ reps: '10' }), row({ reps: '9' })] });

    expect(sets(next)).toEqual([row({ reps: '10' }), row({ reps: '9' })]);
    expect(sets(sessionReducer(start, { type: 'replaceSets', lineId, sets: [] }))).toEqual([row()]);
  });
});

describe('toggleSetDone', () => {
  const lineId = 'line-custom-bench';

  it('ticks a set', () => {
    const start = state([item(bench, { sets: [row({ weight: '135', reps: '8' })] })]);
    const next = sessionReducer(start, { type: 'toggleSetDone', lineId, setIndex: 0, suggestion: null });

    expect(next.exercises[0].sets[0].done).toBe(true);
  });

  // Ticking an empty set means "same as suggested" — the greyed-out numbers.
  it('fills an empty set from the suggestion as it ticks it', () => {
    const start = state([item(bench)]);
    const next = sessionReducer(start, {
      type: 'toggleSetDone',
      lineId,
      setIndex: 0,
      suggestion: row({ weight: '135', reps: '8' }),
    });

    expect(next.exercises[0].sets[0]).toEqual(doneRow('135', '8'));
  });

  it('unticks a set and keeps its numbers', () => {
    const start = state([item(bench, { sets: [doneRow('135', '8')] })]);
    const next = sessionReducer(start, { type: 'toggleSetDone', lineId, setIndex: 0, suggestion: null });

    expect(next.exercises[0].sets[0]).toEqual(row({ weight: '135', reps: '8' }));
  });
});

describe('setExerciseNote', () => {
  it('sets the note on one exercise', () => {
    const next = sessionReducer(state([item(bench), item(fly)]), {
      type: 'setExerciseNote',
      lineId: 'line-custom-fly',
      note: 'Low pulleys taken',
    });

    expect(next.exercises.map((e) => e.note)).toEqual(['', 'Low pulleys taken']);
  });
});
