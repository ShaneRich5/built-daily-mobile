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

/**
 * A partial session update, in the shape the document stores.
 *
 * Still no firebase import: `Date` values go through the SDK unchanged and are
 * stored as `Timestamp`, so the write path needs no `Timestamp` construction and
 * this stays unit-testable. `undefined` fields are omitted by `updateDoc`, which
 * is how a patch leaves a field alone; `null` is a real stored value.
 */
export type SessionPatch = Partial<
  Pick<
    WorkoutSession,
    | 'status'
    | 'title'
    | 'workoutDate'
    | 'workoutTime'
    | 'endedAt'
    | 'activeDurationSec'
    | 'workoutNote'
    | 'exerciseNotesByLineId'
    | 'lines'
    | 'exerciseCount'
    | 'setCount'
    | 'previewExerciseNames'
  >
>;

function fromSetLog(set: SetLog): DocData {
  return {
    weight: set.weight,
    reps: set.reps,
    durationSec: set.durationSec,
    timedSetSec: set.timedSetSec,
    paceMph: set.paceMph,
    inclinePercent: set.inclinePercent,
    resistanceLevel: set.resistanceLevel,
    distanceMiles: set.distanceMiles,
    note: set.note,
  };
}

function fromSessionLine(line: SessionLine): DocData {
  return {
    lineId: line.lineId,
    exerciseId: line.exerciseId,
    nameSnapshot: line.nameSnapshot,
    metric: line.metric,
    sets: line.sets.map(fromSetLog),
  };
}

/**
 * A whole new session → document data.
 *
 * Unlike a patch, every field is written, including the ones that are null at
 * the start (`endedAt`, the notes): the web app reads these documents too, and
 * a field that is absent rather than null is a shape it has never had to see.
 */
export function fromNewSession(session: Omit<WorkoutSession, 'id'>): DocData {
  return {
    status: session.status,
    title: session.title,
    planId: session.planId,
    workoutDate: session.workoutDate,
    workoutTime: session.workoutTime,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    activeDurationSec: session.activeDurationSec,
    workoutNote: session.workoutNote,
    exerciseNotesByLineId: session.exerciseNotesByLineId,
    lines: session.lines.map(fromSessionLine),
    exerciseCount: session.exerciseCount,
    setCount: session.setCount,
    previewExerciseNames: session.previewExerciseNames,
  };
}

/**
 * Domain patch → document data. Only the keys actually present are emitted, so
 * an untouched field is never overwritten with `undefined`.
 */
export function fromSessionPatch(patch: SessionPatch): DocData {
  const doc: DocData = {};

  if (patch.status !== undefined) doc.status = patch.status;
  if (patch.title !== undefined) doc.title = patch.title;
  if (patch.workoutDate !== undefined) doc.workoutDate = patch.workoutDate;
  if (patch.workoutTime !== undefined) doc.workoutTime = patch.workoutTime;
  if (patch.endedAt !== undefined) doc.endedAt = patch.endedAt;
  if (patch.activeDurationSec !== undefined) doc.activeDurationSec = patch.activeDurationSec;
  if (patch.workoutNote !== undefined) doc.workoutNote = patch.workoutNote;
  if (patch.exerciseNotesByLineId !== undefined) {
    doc.exerciseNotesByLineId = patch.exerciseNotesByLineId;
  }
  if (patch.lines !== undefined) doc.lines = patch.lines.map(fromSessionLine);
  if (patch.exerciseCount !== undefined) doc.exerciseCount = patch.exerciseCount;
  if (patch.setCount !== undefined) doc.setCount = patch.setCount;
  if (patch.previewExerciseNames !== undefined) {
    doc.previewExerciseNames = patch.previewExerciseNames;
  }

  return doc;
}
