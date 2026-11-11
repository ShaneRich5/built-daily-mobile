// Mirrors the web app's `lib/progress-types.ts`. docs/DATA_MODEL.md is the
// contract between the two clients — change it there first.

/** Workouts per week a lifter can aim for. 7 is "every day". */
export const WEEKLY_GOAL_OPTIONS = [2, 3, 4, 5, 6, 7] as const;
export type WeeklyGoalTarget = (typeof WEEKLY_GOAL_OPTIONS)[number];

/** Active days per week — a workout or an activity both count. */
export const MOVEMENT_GOAL_OPTIONS = [3, 4, 5, 6, 7] as const;
export type MovementGoalTarget = (typeof MOVEMENT_GOAL_OPTIONS)[number];

/** `users/{uid}/settings/progress` */
export type ProgressSettings = {
  weeklyGoal: WeeklyGoalTarget;
  movementGoalDays: MovementGoalTarget;
  goalWeightLbs: number | null;
};

/** One weigh-in, `users/{uid}/bodyWeight/{id}`. Pounds, as every weight in the app is. */
export type BodyWeightEntry = {
  id: string;
  dateKey: string;
  weightLbs: number;
  createdAt: Date;
};

/** The heaviest body weight or goal weight the Firestore rules accept. */
export const MAX_BODY_WEIGHT_LBS = 1000;

/** What a lifter who has never set a goal is treated as having. */
export const DEFAULT_PROGRESS_SETTINGS: ProgressSettings = {
  weeklyGoal: 3,
  movementGoalDays: 5,
  goalWeightLbs: null,
};
