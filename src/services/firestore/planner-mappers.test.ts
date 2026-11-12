import { toWorkoutPlan } from '@/services/firestore/mappers';
import {
  fromNewScheduledWorkout,
  fromProgressSettings,
  fromWorkoutPlan,
  MAX_TEMPLATE_LINES,
} from '@/services/firestore/planner-mappers';
import { toScheduledWorkout } from '@/services/firestore/home-mappers';
import type { PlanLine, WorkoutPlan } from '@/types/workout';

const now = new Date('2026-11-11T12:00:00Z');

describe('fromNewScheduledWorkout', () => {
  const input = { dateKey: '2026-11-12', label: '  Leg day ', planId: 'legs', exerciseIds: ['squat'] };

  // The rules reject a create that leaves any of these out.
  it('writes every field the Firestore rules require, as an open plan', () => {
    expect(fromNewScheduledWorkout(input, now)).toEqual({
      dateKey: '2026-11-12',
      label: 'Leg day',
      planId: 'legs',
      exerciseIds: ['squat'],
      status: 'planned',
      sessionId: null,
      createdAt: now,
    });
  });

  it('allows no day at all, for the Unscheduled tray', () => {
    expect(fromNewScheduledWorkout({ ...input, dateKey: null }, now)?.dateKey).toBeNull();
  });

  it('stores a plain reminder with no template and no exercises', () => {
    expect(
      fromNewScheduledWorkout({ ...input, planId: null, exerciseIds: [] }, now),
    ).toMatchObject({ planId: null, exerciseIds: [] });
  });

  it('refuses an entry the rules would reject', () => {
    expect(fromNewScheduledWorkout({ ...input, label: '  ' }, now)).toBeNull();
    expect(fromNewScheduledWorkout({ ...input, dateKey: '2026-02-31' }, now)).toBeNull();
  });

  it('caps the exercise list', () => {
    const many = Array.from({ length: 50 }, (_, i) => `e${i}`);

    expect((fromNewScheduledWorkout({ ...input, exerciseIds: many }, now)?.exerciseIds as string[]).length).toBe(40);
  });

  it('survives a round trip back through the read mapper', () => {
    const doc = fromNewScheduledWorkout(input, now);

    expect(doc && toScheduledWorkout('e1', doc)).toMatchObject({
      dateKey: '2026-11-12',
      label: 'Leg day',
      status: 'planned',
      createdAt: now,
    });
  });
});

describe('fromWorkoutPlan', () => {
  const line = (overrides: Partial<PlanLine> = {}): PlanLine => ({
    lineId: 'l1',
    exerciseId: 'bench',
    nameSnapshot: 'Bench press',
    metric: 'weight_reps',
    targetSets: 3,
    notes: null,
    ...overrides,
  });

  const plan = (overrides: Partial<Omit<WorkoutPlan, 'id'>> = {}): Omit<WorkoutPlan, 'id'> => ({
    name: 'Push day',
    source: 'custom',
    createdAt: new Date('2026-09-01T00:00:00Z'),
    updatedAt: now,
    lines: [line()],
    ...overrides,
  });

  it('writes every field the Firestore rules require', () => {
    expect(Object.keys(fromWorkoutPlan(plan()) ?? {}).sort()).toEqual([
      'createdAt',
      'lines',
      'name',
      'source',
      'updatedAt',
    ]);
  });

  it('keeps rest preferences a template already had, and adds none it did not', () => {
    const rest = { autoRestTimer: true, defaultRestSec: 90 as const };

    expect(fromWorkoutPlan(plan({ restPreferences: rest }))?.restPreferences).toEqual(rest);
    expect('restPreferences' in (fromWorkoutPlan(plan()) ?? {})).toBe(false);
  });

  it('keeps a line’s maybe section and alternates', () => {
    const alternates = [{ exerciseId: 'dip', nameSnapshot: 'Dip', metric: 'bodyweight_reps' as const }];
    const doc = fromWorkoutPlan(plan({ lines: [line({ section: 'maybe', alternates })] }));

    expect((doc?.lines as Record<string, unknown>[])[0]).toMatchObject({ section: 'maybe', alternates });
  });

  it('stores a blank line note as null', () => {
    const doc = fromWorkoutPlan(plan({ lines: [line({ notes: '  ' })] }));

    expect((doc?.lines as Record<string, unknown>[])[0].notes).toBeNull();
  });

  // The rules require a name and between one and forty lines.
  it('refuses a template the rules would reject', () => {
    expect(fromWorkoutPlan(plan({ name: ' ' }))).toBeNull();
    expect(fromWorkoutPlan(plan({ lines: [] }))).toBeNull();
    expect(
      fromWorkoutPlan(plan({ lines: Array.from({ length: MAX_TEMPLATE_LINES + 1 }, () => line()) })),
    ).toBeNull();
  });

  it('survives a round trip back through the read mapper', () => {
    const doc = fromWorkoutPlan(plan());

    expect(doc && toWorkoutPlan('p1', doc)).toMatchObject({
      name: 'Push day',
      source: 'custom',
      lines: [line()],
    });
  });
});

describe('fromProgressSettings', () => {
  // The rules require all three on every write, even one that changes only the goal.
  it('writes the whole settings document', () => {
    expect(
      fromProgressSettings({ weeklyGoal: 4, movementGoalDays: 5, goalWeightLbs: null }, now),
    ).toEqual({ weeklyGoal: 4, movementGoalDays: 5, goalWeightLbs: null, updatedAt: now });
  });
});
