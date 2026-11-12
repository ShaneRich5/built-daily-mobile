import { EXERCISE_CATALOG } from '@/lib/exercise-catalog';
import {
  alternateFromExercise,
  exerciseFromAlternate,
  lineGroupingFields,
  MAX_ALTERNATES,
  parseAlternates,
  parseLineSection,
} from '@/lib/line-grouping';

const alt = (exerciseId: string, nameSnapshot = exerciseId) => ({
  exerciseId,
  nameSnapshot,
  metric: 'weight_reps' as const,
});

describe('parseLineSection', () => {
  it('reads maybe', () => {
    expect(parseLineSection('maybe')).toBe('maybe');
  });

  // Absent on every line written before the field existed.
  it('treats anything else as plan', () => {
    expect(parseLineSection(undefined)).toBe('plan');
    expect(parseLineSection('plan')).toBe('plan');
    expect(parseLineSection('later')).toBe('plan');
  });
});

describe('parseAlternates', () => {
  it('reads well-formed alternates in order', () => {
    expect(parseAlternates([alt('pec-deck', 'Pec deck'), alt('db-fly', 'Dumbbell fly')])).toEqual([
      alt('pec-deck', 'Pec deck'),
      alt('db-fly', 'Dumbbell fly'),
    ]);
  });

  it('gives none for a line without the field', () => {
    expect(parseAlternates(undefined)).toEqual([]);
    expect(parseAlternates('pec-deck')).toEqual([]);
  });

  it('drops entries missing an id, a name or a known metric', () => {
    expect(
      parseAlternates([
        null,
        { nameSnapshot: 'No id', metric: 'weight_reps' },
        { exerciseId: 'no-name', metric: 'weight_reps' },
        { exerciseId: 'bad-metric', nameSnapshot: 'Bad metric', metric: 'vibes' },
        alt('kept'),
      ]),
    ).toEqual([alt('kept')]);
  });

  it('drops a repeat of the same exercise', () => {
    expect(parseAlternates([alt('pec-deck'), alt('pec-deck')])).toEqual([alt('pec-deck')]);
  });

  it('caps the list', () => {
    const many = Array.from({ length: 9 }, (_, i) => alt(`e${i}`));

    expect(parseAlternates(many)).toHaveLength(MAX_ALTERNATES);
  });
});

describe('lineGroupingFields', () => {
  // A plain plan line writes neither field, so older documents stay as they were.
  it('writes nothing for a plain plan line', () => {
    expect(lineGroupingFields(undefined, undefined)).toEqual({});
    expect(lineGroupingFields('plan', [])).toEqual({});
  });

  it('writes the section only when it is maybe', () => {
    expect(lineGroupingFields('maybe', [])).toEqual({ section: 'maybe' });
  });

  it('writes alternates when there are some', () => {
    expect(lineGroupingFields('plan', [alt('pec-deck', 'Pec deck')])).toEqual({
      alternates: [alt('pec-deck', 'Pec deck')],
    });
  });

  it('survives a round trip through the parsers', () => {
    const fields = lineGroupingFields('maybe', [alt('pec-deck', 'Pec deck')]);

    expect(parseLineSection(fields.section)).toBe('maybe');
    expect(parseAlternates(fields.alternates)).toEqual([alt('pec-deck', 'Pec deck')]);
  });
});

describe('alternates and catalog exercises', () => {
  const known = EXERCISE_CATALOG[0];

  it('snapshots an exercise as an alternate', () => {
    expect(alternateFromExercise(known)).toEqual({
      exerciseId: known.id,
      nameSnapshot: known.name,
      metric: known.metric,
    });
  });

  it('resolves a catalog alternate to the catalog entry', () => {
    const stale = { ...alternateFromExercise(known), nameSnapshot: 'An old name' };

    expect(exerciseFromAlternate(stale)).toEqual(known);
  });

  // A user-named move is not in the catalog; its snapshot is all there is.
  it('falls back to the snapshot for a custom exercise', () => {
    expect(exerciseFromAlternate(alt('custom-123', 'Landmine twist'))).toEqual({
      id: 'custom-123',
      name: 'Landmine twist',
      metric: 'weight_reps',
    });
  });
});
