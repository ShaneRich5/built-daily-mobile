import {
  fromActivityEdit,
  fromNewActivity,
  toActivity,
  toProgressSettings,
  toScheduledWorkout,
} from '@/services/firestore/home-mappers';
import type { NewActivity } from '@/types/activity';

// Stands in for a Firestore Timestamp, which the mappers accept structurally.
const timestamp = (iso: string) => ({ toDate: () => new Date(iso) });

describe('toScheduledWorkout', () => {
  const stored = {
    dateKey: '2026-11-12',
    label: 'Leg day',
    planId: 'plan-1',
    exerciseIds: ['squat', 'leg-press'],
    status: 'planned',
    sessionId: null,
    createdAt: timestamp('2026-11-01T00:00:00Z'),
  };

  it('maps an entry written by the web app', () => {
    expect(toScheduledWorkout('e1', stored)).toEqual({
      id: 'e1',
      dateKey: '2026-11-12',
      label: 'Leg day',
      planId: 'plan-1',
      exerciseIds: ['squat', 'leg-press'],
      status: 'planned',
      sessionId: null,
      createdAt: new Date('2026-11-01T00:00:00Z'),
      sharedPlanId: null,
      groupId: null,
    });
  });

  // The planner's Unscheduled tray: a plan with no day yet.
  it('reads a null day as unscheduled', () => {
    expect(toScheduledWorkout('e1', { ...stored, dateKey: null })?.dateKey).toBeNull();
  });

  it('reads a day that is not a real date as unscheduled rather than dropping the entry', () => {
    expect(toScheduledWorkout('e1', { ...stored, dateKey: '2026-02-31' })?.dateKey).toBeNull();
  });

  // Entries written before `status` and `sessionId` existed.
  it('treats an entry without a status as an open plan', () => {
    const { status: _status, sessionId: _sessionId, ...older } = stored;

    expect(toScheduledWorkout('e1', older)).toMatchObject({ status: 'planned', sessionId: null });
  });

  it('keeps the session only on a completed entry', () => {
    expect(
      toScheduledWorkout('e1', { ...stored, status: 'completed', sessionId: 's1' })?.sessionId,
    ).toBe('s1');
    expect(toScheduledWorkout('e1', { ...stored, sessionId: 's1' })?.sessionId).toBeNull();
  });

  it('reads the link to a group plan when there is one', () => {
    expect(
      toScheduledWorkout('e1', { ...stored, sharedPlanId: 'shared-1', groupId: 'group-1' }),
    ).toMatchObject({ sharedPlanId: 'shared-1', groupId: 'group-1' });
  });

  it('reads an empty plan id as no template', () => {
    expect(toScheduledWorkout('e1', { ...stored, planId: '' })?.planId).toBeNull();
  });

  it('drops an entry too malformed to show', () => {
    expect(toScheduledWorkout('e1', { ...stored, label: '' })).toBeNull();
    expect(toScheduledWorkout('e1', { ...stored, exerciseIds: 'squat' })).toBeNull();
    expect(toScheduledWorkout('e1', { ...stored, exerciseIds: ['squat', 7] })).toBeNull();
    expect(toScheduledWorkout('e1', { ...stored, planId: 7 })).toBeNull();
  });
});

describe('toActivity', () => {
  const stored = {
    activityTypeId: 'walk',
    activityDate: '2026-11-10',
    activityTime: '07:30',
    durationMin: 35,
    distanceMiles: 1.75,
    locationName: 'Park',
    notes: null,
    createdAt: timestamp('2026-11-10T12:00:00Z'),
    updatedAt: timestamp('2026-11-10T12:00:00Z'),
  };

  it('maps an activity written by the web app', () => {
    expect(toActivity('a1', stored)).toEqual({
      id: 'a1',
      activityTypeId: 'walk',
      activityDate: '2026-11-10',
      activityTime: '07:30',
      durationMin: 35,
      distanceMiles: 1.75,
      locationName: 'Park',
      notes: null,
      createdAt: new Date('2026-11-10T12:00:00Z'),
      updatedAt: new Date('2026-11-10T12:00:00Z'),
    });
  });

  // A type added on the web later must still show up, as a plain "Activity".
  it('keeps an activity whose type this app does not know', () => {
    expect(toActivity('a1', { ...stored, activityTypeId: 'kayak' })?.activityTypeId).toBe('kayak');
  });

  it('reads values out of range as not recorded', () => {
    expect(toActivity('a1', { ...stored, durationMin: 0, distanceMiles: 9000 })).toMatchObject({
      durationMin: null,
      distanceMiles: null,
    });
  });

  it('drops an activity with no type, no real day or no creation time', () => {
    expect(toActivity('a1', { ...stored, activityTypeId: '' })).toBeNull();
    expect(toActivity('a1', { ...stored, activityDate: 'yesterday' })).toBeNull();
    expect(toActivity('a1', { ...stored, createdAt: undefined })).toBeNull();
  });
});

describe('fromNewActivity', () => {
  const now = new Date('2026-11-10T12:00:00Z');
  const input: NewActivity = {
    activityTypeId: 'walk',
    activityDate: '2026-11-10',
    activityTime: '07:30',
    durationMin: 35,
    distanceMiles: 1.754,
    locationName: '  Park ',
    notes: '',
  };

  // The rules reject a create that leaves any of these out.
  it('writes every field the Firestore rules require', () => {
    expect(Object.keys(fromNewActivity(input, now) ?? {}).sort()).toEqual([
      'activityDate',
      'activityTime',
      'activityTypeId',
      'createdAt',
      'distanceMiles',
      'durationMin',
      'endedAt',
      'locationName',
      'notes',
      'source',
      'startedAt',
      'updatedAt',
      'visibility',
    ]);
  });

  it('tidies what was typed', () => {
    expect(fromNewActivity(input, now)).toMatchObject({
      distanceMiles: 1.75,
      locationName: 'Park',
      notes: null,
      visibility: 'private',
      source: 'manual',
      createdAt: now,
    });
  });

  it('drops a distance for something that has none', () => {
    expect(fromNewActivity({ ...input, activityTypeId: 'tennis' }, now)?.distanceMiles).toBeNull();
  });

  it('drops a time that is not a time, and a duration that is not plausible', () => {
    expect(fromNewActivity({ ...input, activityTime: '7am', durationMin: 2000 }, now)).toMatchObject({
      activityTime: null,
      durationMin: null,
    });
  });

  it('refuses a type it does not know or a day that is not real', () => {
    expect(fromNewActivity({ ...input, activityTypeId: 'kayak' }, now)).toBeNull();
    expect(fromNewActivity({ ...input, activityDate: '2026-02-31' }, now)).toBeNull();
  });

  it('survives a round trip back through the read mapper', () => {
    const doc = fromNewActivity(input, now);

    expect(doc && toActivity('a1', doc)).toMatchObject({
      activityTypeId: 'walk',
      activityDate: '2026-11-10',
      activityTime: '07:30',
      durationMin: 35,
      distanceMiles: 1.75,
      locationName: 'Park',
    });
  });
});

describe('fromActivityEdit', () => {
  const now = new Date('2026-11-11T12:00:00Z');
  const input: NewActivity = {
    activityTypeId: 'tennis',
    activityDate: '2026-11-09',
    activityTime: '',
    durationMin: 60,
    distanceMiles: 3,
    locationName: null,
    notes: ' Doubles ',
  };

  // Leaving out createdAt, visibility, source and the timer fields keeps what the document already has.
  it('writes only what the form edits, plus when it changed', () => {
    expect(Object.keys(fromActivityEdit(input, now) ?? {}).sort()).toEqual([
      'activityDate',
      'activityTime',
      'activityTypeId',
      'distanceMiles',
      'durationMin',
      'locationName',
      'notes',
      'updatedAt',
    ]);
  });

  it('cleans the edit as it would a new activity', () => {
    expect(fromActivityEdit(input, now)).toEqual({
      activityTypeId: 'tennis',
      activityDate: '2026-11-09',
      activityTime: null,
      durationMin: 60,
      distanceMiles: null,
      locationName: null,
      notes: 'Doubles',
      updatedAt: now,
    });
  });

  it('refuses an edit that could not be logged', () => {
    expect(fromActivityEdit({ ...input, activityDate: 'yesterday' }, now)).toBeNull();
  });
});

describe('toProgressSettings', () => {
  // Most lifters have never opened the goals sheet.
  it('gives the defaults when there is no document', () => {
    expect(toProgressSettings(undefined)).toEqual({
      weeklyGoal: 3,
      movementGoalDays: 5,
      goalWeightLbs: null,
    });
  });

  it('reads the goals that were set', () => {
    expect(toProgressSettings({ weeklyGoal: 4, movementGoalDays: 6, goalWeightLbs: 180 })).toEqual({
      weeklyGoal: 4,
      movementGoalDays: 6,
      goalWeightLbs: 180,
    });
  });

  it('falls back to the default for a goal the app does not offer', () => {
    expect(toProgressSettings({ weeklyGoal: 1, movementGoalDays: 9 })).toMatchObject({
      weeklyGoal: 3,
      movementGoalDays: 5,
    });
  });
});
