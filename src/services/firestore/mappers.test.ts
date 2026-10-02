import {
  fromNewSession,
  fromSessionPatch,
  toDate,
  toWorkoutPlan,
  toWorkoutSession,
} from '@/services/firestore/mappers';

// Stands in for a Firestore Timestamp, which the mappers accept structurally.
const timestamp = (iso: string) => ({ toDate: () => new Date(iso) });

describe('toDate', () => {
  it('unwraps a Firestore Timestamp', () => {
    expect(toDate(timestamp('2026-09-20T10:00:00Z'))).toEqual(new Date('2026-09-20T10:00:00Z'));
  });

  it('passes a Date through', () => {
    const date = new Date('2026-09-20T10:00:00Z');
    expect(toDate(date)).toBe(date);
  });

  it('returns null for missing or unparseable values', () => {
    expect(toDate(null)).toBeNull();
    expect(toDate(undefined)).toBeNull();
    expect(toDate('not a date')).toBeNull();
  });
});

describe('toWorkoutSession', () => {
  it('maps a completed session written by the web app', () => {
    const session = toWorkoutSession('abc', {
      status: 'completed',
      title: 'Upper body',
      planId: 'plan-1',
      workoutDate: '2026-09-20',
      workoutTime: '07:30',
      startedAt: timestamp('2026-09-20T07:30:00Z'),
      endedAt: timestamp('2026-09-20T08:15:00Z'),
      activeDurationSec: 2700,
      exerciseCount: 1,
      setCount: 2,
      previewExerciseNames: ['Bench press'],
      lines: [
        {
          lineId: 'line-1',
          exerciseId: 'bench-press',
          nameSnapshot: 'Bench press',
          metric: 'weight_reps',
          sets: [
            { weight: 135, reps: 10 },
            { weight: 145, reps: 8, note: 'felt heavy' },
          ],
        },
      ],
    });

    expect(session.id).toBe('abc');
    expect(session.endedAt).toEqual(new Date('2026-09-20T08:15:00Z'));
    expect(session.lines[0].sets[0]).toEqual({
      weight: 135,
      reps: 10,
      durationSec: null,
      timedSetSec: null,
      paceMph: null,
      inclinePercent: null,
      resistanceLevel: null,
      distanceMiles: null,
      note: null,
    });
    expect(session.lines[0].sets[1].note).toBe('felt heavy');
  });

  it('leaves endedAt null for an in-progress session', () => {
    const session = toWorkoutSession('abc', {
      status: 'in_progress',
      startedAt: timestamp('2026-09-20T07:30:00Z'),
      endedAt: null,
    });

    expect(session.status).toBe('in_progress');
    expect(session.endedAt).toBeNull();
  });

  it('derives counts and preview names when the denormalized fields are absent', () => {
    const session = toWorkoutSession('abc', {
      startedAt: timestamp('2026-09-20T07:30:00Z'),
      lines: [
        { lineId: 'a', nameSnapshot: 'Squat', metric: 'weight_reps', sets: [{}, {}] },
        { lineId: 'b', nameSnapshot: 'Plank', metric: 'duration', sets: [{}] },
      ],
    });

    expect(session.exerciseCount).toBe(2);
    expect(session.setCount).toBe(3);
    expect(session.previewExerciseNames).toEqual(['Squat', 'Plank']);
  });

  it('never produces an Invalid Date for startedAt', () => {
    const session = toWorkoutSession('abc', {});

    expect(Number.isNaN(session.startedAt.getTime())).toBe(false);
  });

  it('falls back to a known metric when the value is unrecognized', () => {
    const session = toWorkoutSession('abc', {
      lines: [{ lineId: 'a', metric: 'something_new', sets: [] }],
    });

    expect(session.lines[0].metric).toBe('weight_reps');
  });
});

describe('toWorkoutPlan', () => {
  it('maps a plan and its lines', () => {
    const plan = toWorkoutPlan('plan-1', {
      name: 'Full body',
      source: 'starter_copy',
      createdAt: timestamp('2026-09-01T00:00:00Z'),
      updatedAt: timestamp('2026-09-10T00:00:00Z'),
      lines: [
        {
          lineId: 'l1',
          exerciseId: 'squat',
          nameSnapshot: 'Squat',
          metric: 'weight_reps',
          targetSets: 3,
        },
      ],
    });

    expect(plan.name).toBe('Full body');
    expect(plan.source).toBe('starter_copy');
    expect(plan.lines[0].targetSets).toBe(3);
    expect(plan.lines[0].notes).toBeNull();
  });

  it('defaults updatedAt to createdAt when absent', () => {
    const plan = toWorkoutPlan('plan-1', { createdAt: timestamp('2026-09-01T00:00:00Z') });

    expect(plan.updatedAt).toEqual(plan.createdAt);
  });
});

describe('fromNewSession', () => {
  const session = {
    status: 'in_progress' as const,
    title: 'Workout on 2026-09-14',
    planId: null,
    workoutDate: '2026-09-14',
    workoutTime: '09:05',
    startedAt: new Date('2026-09-14T09:05:00Z'),
    endedAt: null,
    activeDurationSec: null,
    workoutNote: null,
    exerciseNotesByLineId: null,
    lines: [],
    exerciseCount: 0,
    setCount: 0,
    previewExerciseNames: [],
  };

  // The web app reads these documents too, and has never had to cope with a
  // field that is absent rather than null.
  it('writes every field, including the ones that are null at the start', () => {
    const doc = fromNewSession(session);

    expect(Object.keys(doc).sort()).toEqual(
      [
        'activeDurationSec',
        'endedAt',
        'exerciseCount',
        'exerciseNotesByLineId',
        'lines',
        'planId',
        'previewExerciseNames',
        'setCount',
        'startedAt',
        'status',
        'title',
        'workoutDate',
        'workoutNote',
        'workoutTime',
      ].sort(),
    );
  });

  it('passes Date through for the SDK to store as a Timestamp', () => {
    expect(fromNewSession(session).startedAt).toBe(session.startedAt);
  });

  it('flattens the lines it was given', () => {
    const doc = fromNewSession({
      ...session,
      lines: [
        {
          lineId: 'l1',
          exerciseId: 'plank',
          nameSnapshot: 'Plank',
          metric: 'duration',
          sets: [
            {
              weight: null,
              reps: null,
              durationSec: 60,
              timedSetSec: null,
              paceMph: null,
              inclinePercent: null,
              resistanceLevel: null,
              distanceMiles: null,
              note: null,
            },
          ],
        },
      ],
      exerciseCount: 1,
      setCount: 1,
      previewExerciseNames: ['Plank'],
    });

    expect(toWorkoutSession('s1', doc)).toMatchObject({
      status: 'in_progress',
      exerciseCount: 1,
      setCount: 1,
      lines: [{ exerciseId: 'plank', metric: 'duration' }],
    });
  });
});

describe('fromSessionPatch', () => {
  it('emits only the keys the patch actually set', () => {
    // An absent key must not reach Firestore at all: `updateDoc` would reject
    // `undefined`, and a null would wipe a field the screen never touched.
    expect(fromSessionPatch({ title: 'Leg day' })).toEqual({ title: 'Leg day' });
  });

  it('keeps null, which is a real stored value', () => {
    const doc = fromSessionPatch({ workoutDate: null, endedAt: null });

    expect(doc).toEqual({ workoutDate: null, endedAt: null });
    expect('title' in doc).toBe(false);
  });

  it('passes Date through for the SDK to store as a Timestamp', () => {
    const endedAt = new Date('2026-09-29T18:00:00Z');

    expect(fromSessionPatch({ endedAt }).endedAt).toBe(endedAt);
  });

  it('carries the duration a finished workout took', () => {
    expect(fromSessionPatch({ activeDurationSec: 2700 })).toEqual({ activeDurationSec: 2700 });
  });

  it('flattens lines and their sets into plain document data', () => {
    const doc = fromSessionPatch({
      lines: [
        {
          lineId: 'l1',
          exerciseId: 'bench',
          nameSnapshot: 'Bench',
          metric: 'weight_reps',
          sets: [
            {
              weight: 135,
              reps: 8,
              durationSec: null,
              timedSetSec: null,
              paceMph: null,
              inclinePercent: null,
              resistanceLevel: null,
              distanceMiles: null,
              note: 'felt light',
            },
          ],
        },
      ],
    });

    expect(doc.lines).toEqual([
      {
        lineId: 'l1',
        exerciseId: 'bench',
        nameSnapshot: 'Bench',
        metric: 'weight_reps',
        sets: [
          {
            weight: 135,
            reps: 8,
            durationSec: null,
            timedSetSec: null,
            paceMph: null,
            inclinePercent: null,
            resistanceLevel: null,
            distanceMiles: null,
            note: 'felt light',
          },
        ],
      },
    ]);
  });

  it('survives a round trip back through the read mapper', () => {
    const lines = [
      {
        lineId: 'l1',
        exerciseId: 'squat',
        nameSnapshot: 'Squat',
        metric: 'weight_reps' as const,
        sets: [],
      },
    ];

    const doc = fromSessionPatch({ lines });

    expect(toWorkoutSession('s1', doc).lines).toEqual(lines);
  });
});
