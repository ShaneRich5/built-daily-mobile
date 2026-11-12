import { findActivityType } from '@/lib/activity-catalog';
import { dateFromKey } from '@/lib/date-keys';
import { isValidWorkoutTime } from '@/lib/session-edit';
import { toDate } from '@/services/firestore/mappers';
import {
  ACTIVITY_LOCATION_LIMIT,
  ACTIVITY_NOTE_LIMIT,
  type Activity,
  type NewActivity,
} from '@/types/activity';
import type { ScheduledWorkout, ScheduledWorkoutStatus } from '@/types/planner';
import {
  DEFAULT_PROGRESS_SETTINGS,
  MOVEMENT_GOAL_OPTIONS,
  type MovementGoalTarget,
  type ProgressSettings,
  WEEKLY_GOAL_OPTIONS,
  type WeeklyGoalTarget,
} from '@/types/progress';

// Mappers for what Home reads beyond sessions and plans: the planner, logged
// activities and the weekly goal. No firebase import, for the same reason as
// `mappers.ts`: these run over plain document data so they can be tested
// without a Firestore instance. They follow the web app's parsers field for
// field, including what each treats as too malformed to show.

type DocData = Record<string, unknown>;

/** Longest id the Firestore rules accept. */
const MAX_ID_LENGTH = 128;
/** Most exercises a planned entry may list. */
const MAX_PLANNED_EXERCISES = 40;
const MAX_LABEL_LENGTH = 200;

function optionalId(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_ID_LENGTH
    ? value
    : null;
}

function optionalText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim().slice(0, maxLength);
  return trimmed.length > 0 ? trimmed : null;
}

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toStatus(value: unknown): ScheduledWorkoutStatus {
  // Entries written before the field existed are open plans.
  return value === 'completed' || value === 'skipped' ? value : 'planned';
}

/**
 * `scheduledWorkouts` document data → entry, or null for one too malformed to
 * show: no label, or exercise ids that are not strings.
 *
 * `dateKey` may be null — "no day yet" — and anything that is not a real day is
 * read as null too, rather than dropping the entry.
 */
export function toScheduledWorkout(id: string, raw: DocData): ScheduledWorkout | null {
  if (typeof raw.label !== 'string' || raw.label.length === 0) return null;
  if (raw.planId != null && typeof raw.planId !== 'string') return null;
  if (!Array.isArray(raw.exerciseIds)) return null;

  const exerciseIds = raw.exerciseIds.filter((x): x is string => typeof x === 'string');
  if (exerciseIds.length !== raw.exerciseIds.length) return null;

  const status = toStatus(raw.status);

  return {
    id,
    dateKey: typeof raw.dateKey === 'string' && dateFromKey(raw.dateKey) ? raw.dateKey : null,
    label: raw.label.slice(0, MAX_LABEL_LENGTH),
    planId: raw.planId ? raw.planId : null,
    exerciseIds: exerciseIds.slice(0, MAX_PLANNED_EXERCISES),
    status,
    // Only a completed entry points at a session; the rules reject it otherwise.
    sessionId:
      status === 'completed' && typeof raw.sessionId === 'string' && raw.sessionId
        ? raw.sessionId
        : null,
    createdAt: toDate(raw.createdAt) ?? new Date(0),
    sharedPlanId: optionalId(raw.sharedPlanId),
    groupId: optionalId(raw.groupId),
  };
}

/** Activity document data → activity, or null without a type, a real day or a creation time. */
export function toActivity(id: string, raw: DocData): Activity | null {
  const activityTypeId = typeof raw.activityTypeId === 'string' ? raw.activityTypeId.trim() : '';
  if (!activityTypeId || activityTypeId.length > 64) return null;

  if (typeof raw.activityDate !== 'string' || !dateFromKey(raw.activityDate)) return null;

  const createdAt = toDate(raw.createdAt);
  if (!createdAt) return null;

  const duration = finite(raw.durationMin);
  const distance = finite(raw.distanceMiles);

  return {
    id,
    activityTypeId,
    activityDate: raw.activityDate,
    activityTime:
      typeof raw.activityTime === 'string' && isValidWorkoutTime(raw.activityTime)
        ? raw.activityTime
        : null,
    durationMin: duration !== null && duration > 0 && duration <= 24 * 60 ? Math.round(duration) : null,
    distanceMiles:
      distance !== null && distance > 0 && distance <= 500 ? Math.round(distance * 100) / 100 : null,
    locationName: optionalText(raw.locationName, ACTIVITY_LOCATION_LIMIT),
    notes: optionalText(raw.notes, ACTIVITY_NOTE_LIMIT),
    createdAt,
    updatedAt: toDate(raw.updatedAt) ?? createdAt,
  };
}

/**
 * What the form collected → the document to create, or null when it is not
 * something that can be logged (an unknown type, or no real day).
 *
 * Every field the rules list is written, as null where there is nothing to
 * say. Values out of range are dropped rather than clamped: a 30-hour walk is
 * a typo, not a long walk. Distance is only kept for types it makes sense for.
 */
export function fromNewActivity(input: NewActivity, now: Date): DocData | null {
  const type = findActivityType(input.activityTypeId);
  if (!type || !dateFromKey(input.activityDate)) return null;

  const time = input.activityTime?.trim() ?? '';
  const duration =
    input.durationMin !== null && Number.isFinite(input.durationMin)
      ? Math.round(input.durationMin)
      : null;
  const distance =
    type.supportsDistance && input.distanceMiles !== null && Number.isFinite(input.distanceMiles)
      ? Math.round(input.distanceMiles * 100) / 100
      : null;

  return {
    activityTypeId: type.id,
    activityDate: input.activityDate,
    activityTime: isValidWorkoutTime(time) ? time : null,
    durationMin: duration !== null && duration > 0 && duration <= 24 * 60 ? duration : null,
    distanceMiles: distance !== null && distance > 0 && distance <= 500 ? distance : null,
    locationName: optionalText(input.locationName, ACTIVITY_LOCATION_LIMIT),
    notes: optionalText(input.notes, ACTIVITY_NOTE_LIMIT),
    visibility: 'private',
    source: 'manual',
    startedAt: null,
    endedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * The progress settings document → settings. A missing document, or a value
 * outside what the app offers, reads as the default rather than as an error:
 * most lifters have never opened the goals sheet.
 */
export function toProgressSettings(raw: DocData | undefined): ProgressSettings {
  if (!raw) return { ...DEFAULT_PROGRESS_SETTINGS };

  const goalWeight = finite(raw.goalWeightLbs);

  return {
    weeklyGoal: WEEKLY_GOAL_OPTIONS.includes(raw.weeklyGoal as WeeklyGoalTarget)
      ? (raw.weeklyGoal as WeeklyGoalTarget)
      : DEFAULT_PROGRESS_SETTINGS.weeklyGoal,
    movementGoalDays: MOVEMENT_GOAL_OPTIONS.includes(raw.movementGoalDays as MovementGoalTarget)
      ? (raw.movementGoalDays as MovementGoalTarget)
      : DEFAULT_PROGRESS_SETTINGS.movementGoalDays,
    goalWeightLbs: goalWeight !== null && goalWeight > 0 ? goalWeight : null,
  };
}
