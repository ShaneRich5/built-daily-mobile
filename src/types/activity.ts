// Mirrors the web app's `lib/activity-types.ts`. docs/DATA_MODEL.md is the
// contract between the two clients — change it there first.

export const ACTIVITY_NOTE_LIMIT = 400;
export const ACTIVITY_LOCATION_LIMIT = 120;

/**
 * `users/{uid}/activities/{id}` — movement that is not a workout: a walk, a
 * bike ride, a game of tennis. It counts toward "showing up" on the charts but
 * not toward the weekly workout goal.
 */
export type Activity = {
  id: string;
  /** An id from `ACTIVITY_CATALOG`. */
  activityTypeId: string;
  /** Local calendar day, `YYYY-MM-DD`. */
  activityDate: string;
  /** Local time, `HH:mm`, when given. */
  activityTime: string | null;
  durationMin: number | null;
  distanceMiles: number | null;
  locationName: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/** What the log-activity form collects. */
export type NewActivity = {
  activityTypeId: string;
  activityDate: string;
  activityTime: string | null;
  durationMin: number | null;
  distanceMiles: number | null;
  locationName: string | null;
  notes: string | null;
};
