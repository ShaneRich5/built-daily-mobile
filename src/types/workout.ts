// Mirrors the web app's shapes in docs/DATA_MODEL.md. That document is the
// contract between the two clients — change it there first.

export type ExerciseMetric = 'weight_reps' | 'bodyweight_reps' | 'duration' | 'cardio';

export type SessionStatus = 'in_progress' | 'completed' | 'discarded';

/** One performed set. Fields are null when the metric does not use them. */
export type SetLog = {
  weight: number | null;
  reps: number | null;
  durationSec: number | null;
  timedSetSec: number | null;
  paceMph: number | null;
  inclinePercent: number | null;
  resistanceLevel: number | null;
  distanceMiles: number | null;
  note: string | null;
};

/** One exercise within a session, embedded in the session document. */
export type SessionLine = {
  lineId: string;
  /** Catalog id, or `custom-{uuid}` for a user-named move. */
  exerciseId: string;
  nameSnapshot: string;
  metric: ExerciseMetric;
  sets: SetLog[];
};

/** `users/{uid}/sessions/{sessionId}` */
export type WorkoutSession = {
  id: string;
  status: SessionStatus;
  title: string;
  planId: string | null;
  /** Local calendar day, `YYYY-MM-DD`. */
  workoutDate: string | null;
  /** Local time, `HH:mm`, independent of workoutDate. */
  workoutTime: string | null;
  startedAt: Date;
  /** Null while in_progress. */
  endedAt: Date | null;
  activeDurationSec: number | null;
  workoutNote: string | null;
  /** Keyed by `lineId`, so reordering lines does not break the keys. */
  exerciseNotesByLineId: Record<string, string> | null;
  lines: SessionLine[];
  exerciseCount: number;
  setCount: number;
  previewExerciseNames: string[];
};

/** Slim shape for list screens — avoids reading every set of every session. */
export type SessionSummary = Pick<
  WorkoutSession,
  | 'id'
  | 'status'
  | 'title'
  | 'workoutDate'
  | 'startedAt'
  | 'endedAt'
  | 'exerciseCount'
  | 'setCount'
  | 'previewExerciseNames'
>;

export type PlanLine = {
  lineId: string;
  exerciseId: string;
  nameSnapshot: string;
  metric: ExerciseMetric;
  targetSets: number | null;
  notes: string | null;
};

/** `users/{uid}/plans/{planId}` — a reusable workout template. */
export type WorkoutPlan = {
  id: string;
  name: string;
  source: 'starter_copy' | 'custom';
  createdAt: Date;
  updatedAt: Date;
  lines: PlanLine[];
};
