// Mirrors the web app's `lib/planner-types.ts`. docs/DATA_MODEL.md is the
// contract between the two clients — change it there first.

/** Lifecycle of a planned day. Documents written before this field read as `planned`. */
export type ScheduledWorkoutStatus = 'planned' | 'completed' | 'skipped';

/** `users/{uid}/scheduledWorkouts/{id}` — one workout pencilled in on the planner. */
export type ScheduledWorkout = {
  id: string;
  /**
   * Local calendar day, `YYYY-MM-DD`, or `null` for "no day yet" (the planner's
   * Unscheduled tray). A date-range query never returns the null ones.
   */
  dateKey: string | null;
  /** Short label, often the template's name. */
  label: string;
  /** A template id, a starter id (`starter-*`), or null for a note with no template. */
  planId: string | null;
  /** The exercises to start with; empty for a plain reminder. */
  exerciseIds: string[];
  status: ScheduledWorkoutStatus;
  /** The session that completed this entry; only ever set when `status` is `completed`. */
  sessionId: string | null;
  createdAt: Date;
  /** Set when the entry came from saying "I'm in" to a group's plan together. */
  sharedPlanId: string | null;
  groupId: string | null;
};

/** An entry that has a day — what a date-range query returns. */
export type DatedScheduledWorkout = ScheduledWorkout & { dateKey: string };
