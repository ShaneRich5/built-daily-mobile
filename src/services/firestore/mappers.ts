import type {
  ExerciseMetric,
  PlanLine,
  SessionLine,
  SessionStatus,
  SetLog,
  WorkoutPlan,
  WorkoutSession,
} from '@/types/workout';

// Deliberately no firebase import: these run over plain document data so they
// stay unit-testable without a Firestore instance. A Firestore `Timestamp` is
// accepted structurally via its `toDate()` method.
type TimestampLike = { toDate: () => Date };

type DocData = Record<string, unknown>;

function isTimestampLike(value: unknown): value is TimestampLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as TimestampLike).toDate === 'function'
  );
}

/** Firestore `Timestamp`, a raw `Date`, or an ISO string → `Date`. */
export function toDate(value: unknown): Date | null {
  if (isTimestampLike(value)) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

const METRICS: ExerciseMetric[] = ['weight_reps', 'bodyweight_reps', 'duration', 'cardio'];

function toMetric(value: unknown): ExerciseMetric {
  return METRICS.includes(value as ExerciseMetric) ? (value as ExerciseMetric) : 'weight_reps';
}

function toStatus(value: unknown): SessionStatus {
  return value === 'in_progress' || value === 'discarded' ? value : 'completed';
}

function toSetLog(raw: DocData): SetLog {
  return {
    weight: num(raw.weight),
    reps: num(raw.reps),
    durationSec: num(raw.durationSec),
    timedSetSec: num(raw.timedSetSec),
    paceMph: num(raw.paceMph),
    inclinePercent: num(raw.inclinePercent),
    resistanceLevel: num(raw.resistanceLevel),
    distanceMiles: num(raw.distanceMiles),
    note: str(raw.note),
  };
}

function toSessionLine(raw: DocData): SessionLine {
  return {
    lineId: String(raw.lineId ?? ''),
    exerciseId: String(raw.exerciseId ?? ''),
    nameSnapshot: String(raw.nameSnapshot ?? ''),
    metric: toMetric(raw.metric),
    sets: Array.isArray(raw.sets) ? raw.sets.map((set) => toSetLog(set as DocData)) : [],
  };
}

export function toWorkoutSession(id: string, raw: DocData): WorkoutSession {
  const lines = Array.isArray(raw.lines) ? raw.lines.map((l) => toSessionLine(l as DocData)) : [];

  return {
    id,
    status: toStatus(raw.status),
    title: String(raw.title ?? ''),
    planId: str(raw.planId),
    workoutDate: str(raw.workoutDate),
    workoutTime: str(raw.workoutTime),
    // Older documents may predate a field; fall back rather than render Invalid Date.
    startedAt: toDate(raw.startedAt) ?? toDate(raw.endedAt) ?? new Date(0),
    endedAt: toDate(raw.endedAt),
    activeDurationSec: num(raw.activeDurationSec),
    workoutNote: str(raw.workoutNote),
    exerciseNotesByLineId:
      typeof raw.exerciseNotesByLineId === 'object' && raw.exerciseNotesByLineId !== null
        ? (raw.exerciseNotesByLineId as Record<string, string>)
        : null,
    lines,
    // Denormalized counters can drift; trust the lines when they disagree.
    exerciseCount: num(raw.exerciseCount) ?? lines.length,
    setCount: num(raw.setCount) ?? lines.reduce((total, line) => total + line.sets.length, 0),
    previewExerciseNames: Array.isArray(raw.previewExerciseNames)
      ? raw.previewExerciseNames.map(String)
      : lines.slice(0, 5).map((line) => line.nameSnapshot),
  };
}

function toPlanLine(raw: DocData): PlanLine {
  return {
    lineId: String(raw.lineId ?? ''),
    exerciseId: String(raw.exerciseId ?? ''),
    nameSnapshot: String(raw.nameSnapshot ?? ''),
    metric: toMetric(raw.metric),
    targetSets: num(raw.targetSets),
    notes: str(raw.notes),
  };
}

export function toWorkoutPlan(id: string, raw: DocData): WorkoutPlan {
  const createdAt = toDate(raw.createdAt) ?? new Date(0);

  return {
    id,
    name: String(raw.name ?? ''),
    source: raw.source === 'starter_copy' ? 'starter_copy' : 'custom',
    createdAt,
    updatedAt: toDate(raw.updatedAt) ?? createdAt,
    lines: Array.isArray(raw.lines) ? raw.lines.map((l) => toPlanLine(l as DocData)) : [],
  };
}
