import { muscleLabel, resolveExerciseMuscles } from '@/lib/muscle-map';

describe('resolveExerciseMuscles', () => {
  it('resolves a catalog id to its primary and secondary muscles', () => {
    expect(resolveExerciseMuscles('bench', 'Barbell bench press')).toEqual({
      primary: ['chest'],
      secondary: ['deltoids', 'triceps'],
    });
  });

  it('fills in an empty secondary list for isolation moves', () => {
    expect(resolveExerciseMuscles('leg-extension', 'Leg extension')).toEqual({
      primary: ['quadriceps'],
      secondary: [],
    });
  });

  it('prefers the catalog id over the name, so renamed copy cannot mislead it', () => {
    // `nameSnapshot` is whatever the catalog said the day it was logged; the id
    // is the stable part, and here the name would hint at the wrong muscle.
    expect(resolveExerciseMuscles('skull-crusher', 'Lying barbell curl-back')).toEqual({
      primary: ['triceps'],
      secondary: [],
    });
  });

  it('gives cardio machines no primary muscle', () => {
    const treadmill = resolveExerciseMuscles('treadmill', 'Treadmill');
    expect(treadmill?.primary).toEqual([]);
    expect(treadmill?.secondary).toContain('quadriceps');
  });

  describe('custom exercises, matched on name', () => {
    it('reads a name hint when the id is not in the catalog', () => {
      expect(resolveExerciseMuscles('custom-abc123', 'Incline dumbbell chest press')).toEqual({
        primary: ['chest'],
        secondary: ['deltoids', 'triceps'],
      });
    });

    it('is case insensitive', () => {
      expect(resolveExerciseMuscles('custom-abc123', 'PREACHER CURL')?.primary).toEqual(['biceps']);
    });

    // The ordering the hint list exists to get right: a broad pattern later in
    // the list must not intercept a move a narrower one already describes.
    it.each([
      ['Seated leg curl', 'hamstring'],
      ['Nordic hamstring curl', 'hamstring'],
      ['Standing calf raise', 'calves'],
      ['Overhead tricep extension', 'triceps'],
      ['Back extension', 'lower-back'],
      ['Barbell upright row', 'deltoids'],
      ['Meadows row', 'upper-back'],
      ['Cable woodchop', 'obliques'],
      ['Hanging leg raise', 'abs'],
      ['Machine shoulder press', 'deltoids'],
      ['Sumo deadlift high pull', 'lower-back'],
      ['Zercher squat', 'quadriceps'],
      ['Wrist roller', 'forearm'],
    ])('maps %s to %s', (name, expected) => {
      expect(resolveExerciseMuscles('custom-abc123', name)?.primary).toContain(expected);
    });

    it('returns null for a name it cannot place, rather than guessing', () => {
      expect(resolveExerciseMuscles('custom-abc123', 'Sauna')).toBeNull();
    });

    it('returns null for an unknown id with no name to fall back on', () => {
      expect(resolveExerciseMuscles('retired-machine', '')).toBeNull();
    });
  });
});

describe('muscleLabel', () => {
  it('uses gym words rather than the chart slugs', () => {
    expect(muscleLabel('gluteal')).toBe('Glutes');
    expect(muscleLabel('deltoids')).toBe('Shoulders');
    expect(muscleLabel('lower-back')).toBe('Lower back');
  });
});
