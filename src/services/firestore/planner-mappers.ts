import { dateFromKey } from '@/lib/date-keys';
import { lineGroupingFields } from '@/lib/line-grouping';
import type { ScheduledWorkout } from '@/types/planner';
import type { ProgressSettings } from '@/types/progress';
import type { PlanLine, WorkoutPlan } from '@/types/workout';

// Write-side mappers for what Phase 3 creates and edits: planner entries,
// templates and the progress settings document. No firebase import, for the
// same reason as `mappers.ts`. Each writes exactly the fields the Firestore
// rules list, because the rules check the whole document on every write.

type DocData = Record<string, unknown>;

const MAX_LABEL_LENGTH = 200;
const MAX_ID_LENGTH = 128;
const MAX_PLANNED_EXERCISES = 40;
const MAX_NOTE_LENGTH = 400;
/** The Firestore rules cap a template at 40 lines and require at least one. */
export const MAX_TEMPLATE_LINES = 40;

export type NewScheduledWorkout = Pick<ScheduledWorkout, 'dateKey' | 'label' | 'planId' | 'exerciseIds'> &
  /** Set when saying "I'm in" to a group's plan together. */
  Partial<Pick<ScheduledWorkout, 'sharedPlanId' | 'groupId'>>;

/**
 * A planner entry to create → document data, or null when it could not be
 * stored: no label, or a day that is not a real date. `dateKey: null` is
 * allowed and means Unscheduled.
 *
 * New entries are always open plans; `status` and `sessionId` are written
 * anyway because the rules require both on every write.
 */
export function fromNewScheduledWorkout(entry: NewScheduledWorkout, now: Date): DocData | null {
  const label = entry.label.trim().slice(0, MAX_LABEL_LENGTH);
  if (!label) return null;
  if (entry.dateKey !== null && !dateFromKey(entry.dateKey)) return null;

  return {
    dateKey: entry.dateKey,
    label,
    planId: entry.planId ? entry.planId.slice(0, MAX_ID_LENGTH) : null,
    exerciseIds: entry.exerciseIds.slice(0, MAX_PLANNED_EXERCISES),
    status: 'planned',
    sessionId: null,
    createdAt: now,
    ...(entry.sharedPlanId && entry.groupId
      ? { sharedPlanId: entry.sharedPlanId.slice(0, MAX_ID_LENGTH), groupId: entry.groupId.slice(0, MAX_ID_LENGTH) }
      : {}),
  };
}

function fromPlanLine(line: PlanLine): DocData {
  const notes = line.notes?.trim().slice(0, MAX_NOTE_LENGTH);

  return {
    lineId: line.lineId,
    exerciseId: line.exerciseId,
    nameSnapshot: line.nameSnapshot,
    metric: line.metric,
    targetSets: line.targetSets,
    notes: notes || null,
    ...lineGroupingFields(line.section, line.alternates),
  };
}

/**
 * A template → document data, or null when the rules would reject it: no
 * name, no lines, or more lines than a template may hold.
 *
 * Rest preferences are written only when the template already had them, so a
 * template saved from mobile neither loses nor gains the field.
 */
export function fromWorkoutPlan(plan: Omit<WorkoutPlan, 'id'>): DocData | null {
  const name = plan.name.trim().slice(0, MAX_LABEL_LENGTH);
  if (!name || plan.lines.length === 0 || plan.lines.length > MAX_TEMPLATE_LINES) return null;

  return {
    name,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    source: plan.source,
    lines: plan.lines.map(fromPlanLine),
    ...(plan.restPreferences ? { restPreferences: plan.restPreferences } : {}),
  };
}

/**
 * Progress settings → the whole document. Every field is written each time:
 * the rules require `weeklyGoal`, `goalWeightLbs` and `updatedAt` on every
 * write, even one that only changes the goal.
 */
export function fromProgressSettings(settings: ProgressSettings, now: Date): DocData {
  return {
    weeklyGoal: settings.weeklyGoal,
    movementGoalDays: settings.movementGoalDays,
    goalWeightLbs: settings.goalWeightLbs,
    updatedAt: now,
  };
}
