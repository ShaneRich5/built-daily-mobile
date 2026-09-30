import { muscleActivation } from '@/lib/muscle-activation';
import type { SessionLine, SetLog } from '@/types/workout';

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

/** Only the set count and the exercise identity matter to the activation math. */
function line(exerciseId: string, sets: number, nameSnapshot = exerciseId): SessionLine {
  return {
    lineId: `line-${exerciseId}`,
    exerciseId,
    nameSnapshot,
    metric: 'weight_reps',
    sets: Array.from({ length: sets }, () => ({ ...emptySet })),
  };
}

function intensityOf(activation: ReturnType<typeof muscleActivation>, slug: string) {
  return activation.find((entry) => entry.slug === slug)?.intensity;
}

describe('muscleActivation', () => {
  it('returns nothing for a session with no lines', () => {
    expect(muscleActivation([])).toEqual([]);
  });

  it('gives the worked muscle the top of the ramp and its helpers less', () => {
    const activation = muscleActivation([line('bench', 3)]);

    expect(intensityOf(activation, 'chest')).toBe(3);
    // 0.4 of the chest score lands in the moderate band.
    expect(intensityOf(activation, 'deltoids')).toBe(2);
    expect(intensityOf(activation, 'triceps')).toBe(2);
  });

  it('orders muscles by how hard they were worked', () => {
    const activation = muscleActivation([line('bench', 4), line('barbell-curl', 2)]);

    expect(activation[0].slug).toBe('chest');
    expect(activation.map((entry) => entry.slug)).toContain('biceps');
  });

  it('adds up sets across exercises that share a muscle', () => {
    // Five chest sets total beat the four triceps sets that come with them.
    const activation = muscleActivation([line('bench', 3), line('db-fly', 2)]);

    expect(intensityOf(activation, 'chest')).toBe(3);
    expect(intensityOf(activation, 'triceps')).toBe(1);
  });

  it('scales intensity relative to the session, not an absolute volume', () => {
    // One set of curls is the whole session, so the biceps top the ramp.
    expect(intensityOf(muscleActivation([line('barbell-curl', 1)]), 'biceps')).toBe(3);
  });

  it('demotes a muscle that only ever assists', () => {
    const activation = muscleActivation([line('squat', 5), line('leg-extension', 4)]);

    expect(intensityOf(activation, 'quadriceps')).toBe(3);
    // 5 sets x 0.4 = 2, against 9 for the quads.
    expect(intensityOf(activation, 'gluteal')).toBe(1);
  });

  it('ignores an exercise with no sets logged yet', () => {
    const activation = muscleActivation([line('bench', 2), line('squat', 0)]);

    expect(activation.map((entry) => entry.slug)).not.toContain('quadriceps');
    expect(intensityOf(activation, 'chest')).toBe(3);
  });

  it('skips an exercise it cannot place instead of dropping the session', () => {
    const activation = muscleActivation([line('bench', 3), line('custom-xyz', 3, 'Sauna sit')]);

    expect(intensityOf(activation, 'chest')).toBe(3);
    expect(activation).toHaveLength(3);
  });

  it('charts a custom exercise via its name', () => {
    expect(intensityOf(muscleActivation([line('custom-xyz', 3, 'Goblet squat')]), 'quadriceps')).toBe(
      3,
    );
  });

  it('lets a cardio-only session still shade the legs it used', () => {
    const activation = muscleActivation([line('treadmill', 1, 'Treadmill')]);

    expect(intensityOf(activation, 'quadriceps')).toBe(3);
  });

  it('keeps cardio from outshining the lifts it was logged beside', () => {
    const activation = muscleActivation([line('squat', 5), line('treadmill', 1, 'Treadmill')]);

    expect(intensityOf(activation, 'quadriceps')).toBe(3);
    expect(intensityOf(activation, 'calves')).toBe(1);
  });

  it('never repeats a muscle, so the chart gets one value per region', () => {
    const activation = muscleActivation([line('bench', 3), line('db-fly', 2), line('dip', 2)]);
    const slugs = activation.map((entry) => entry.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
