import {
  buildLeftoverPlan,
  defaultLeftoverChoice,
  defaultLeftoverChoices,
  doneSummary,
  leftoverHelpText,
  mergeExerciseIds,
  untouchedExercises,
} from '@/lib/session/leftovers';
import { bench, dips, doneRow, fly, item, plank, row } from '@/lib/session/session-test-helpers';

const next = { entryId: 'e1', label: 'Push day', dateKey: '2026-11-16' };

describe('untouchedExercises', () => {
  it('lists plan and maybe exercises with nothing logged, in order', () => {
    const done = item(bench, { sets: [doneRow()] });
    const started = item(fly, { sets: [row({ weight: '20' })] });
    const untouched = item(dips);
    const maybe = item(plank, { section: 'maybe' });
    expect(untouchedExercises([done, started, untouched, maybe])).toEqual([untouched, maybe]);
  });
});

describe('defaultLeftoverChoice', () => {
  it('drops maybes, and carries plan exercises to next time when there is one', () => {
    expect(defaultLeftoverChoice(item(plank, { section: 'maybe' }), true)).toBe('drop');
    expect(defaultLeftoverChoice(item(dips), true)).toBe('next');
    expect(defaultLeftoverChoice(item(dips), false)).toBe('later');
    expect(defaultLeftoverChoices([item(dips)], false)).toEqual({ 'line-custom-dips': 'later' });
  });
});

describe('buildLeftoverPlan', () => {
  const items = [item(dips), item(fly), item(plank, { section: 'maybe' })];
  const choices = {
    'line-custom-dips': 'next',
    'line-custom-fly': 'later',
    'line-custom-plank': 'drop',
  } as const;

  it('sorts exercises into next time and an Unscheduled entry', () => {
    expect(buildLeftoverPlan(items, choices, next, 'Push day')).toEqual({
      next,
      nextIds: ['custom-dips'],
      laterIds: ['custom-fly'],
      laterLabel: 'Leftovers from Push day',
    });
  });

  it('sends nothing to next time when there is no next day', () => {
    expect(buildLeftoverPlan(items, choices, null, 'Push day').nextIds).toEqual([]);
  });
});

describe('copy and merging', () => {
  it('names where each option sends things', () => {
    expect(leftoverHelpText(next)).toBe(
      'Next time adds it to Push day on Mon, Nov 16. Later puts it in Unscheduled. Maybes default to Drop, and dropping is never counted as missed.',
    );
    expect(leftoverHelpText(null)).toMatch(/^Later puts it/);
  });

  it('summarises what was done', () => {
    expect(doneSummary(1, 1)).toBe('1 exercise · 1 set');
    expect(doneSummary(3, 11)).toBe('3 exercises · 11 sets');
  });

  it('adds new exercise ids once, up to 40', () => {
    expect(mergeExerciseIds(['a', 'b'], ['b', 'c'])).toEqual(['a', 'b', 'c']);
    expect(
      mergeExerciseIds(
        Array.from({ length: 39 }, (_, i) => `x${i}`),
        ['y', 'z'],
      ),
    ).toHaveLength(40);
  });
});
