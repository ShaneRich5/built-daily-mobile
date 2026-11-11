import type { CatalogExercise } from '@/lib/exercise-catalog';
import { MAX_ALTERNATES } from '@/lib/line-grouping';
import {
  exerciseProgress,
  MAX_SESSION_EXERCISES,
  type SessionExercise,
} from '@/lib/session/session-model';
import {
  copySetRow,
  emptySetRow,
  fillFromSuggestion,
  type SetRow,
} from '@/lib/session/set-row';
import type { LineSection } from '@/types/workout';

/**
 * The workout being logged, and every way it can change. Ported from the web
 * app's `session-reducer.ts` so the two screens behave the same.
 *
 * One difference: this reducer is pure. The web mints line ids inside
 * `addExercises`; here the caller passes them in (see `src/services/ids.ts`),
 * which keeps the reducer deterministic under test.
 */
export type SessionState = {
  title: string;
  workoutDate: string;
  workoutTime: string;
  workoutNote: string;
  exercises: SessionExercise[];
  /** The exercise whose quick card is open (at most one). */
  openLineId: string | null;
};

export type SessionMeta = Pick<
  SessionState,
  'title' | 'workoutDate' | 'workoutTime' | 'workoutNote'
>;

export type SessionAction =
  | { type: 'updateMeta'; patch: Partial<SessionMeta> }
  | { type: 'openExercise'; lineId: string | null }
  /** Open the next exercise (after this one, wrapping) that still has work left. */
  | { type: 'openNextExercise'; afterLineId: string }
  | {
      type: 'addExercises';
      /** Each exercise with the line id minted for it, in the order picked. */
      items: readonly { lineId: string; exercise: CatalogExercise }[];
      section?: LineSection;
    }
  /**
   * Swap in a different exercise for this slot (machine taken). The one it
   * replaces becomes an alternate, so swapping back is one tap.
   */
  | { type: 'swapExercise'; lineId: string; exercise: CatalogExercise }
  /** Move between plan and maybe. `open` opens the card (for "Do it"). */
  | { type: 'setSection'; lineId: string; section: LineSection; open?: boolean }
  | { type: 'removeExercise'; lineId: string }
  | { type: 'moveExercise'; lineId: string; toIndex: number }
  | { type: 'setExerciseNote'; lineId: string; note: string }
  | { type: 'updateSet'; lineId: string; setIndex: number; patch: Partial<SetRow> }
  | { type: 'addSet'; lineId: string }
  | { type: 'copyLastSet'; lineId: string }
  | { type: 'removeSet'; lineId: string; setIndex: number }
  | {
      type: 'toggleSetDone';
      lineId: string;
      setIndex: number;
      /** Values shown greyed out; copied into empty fields when checking off. */
      suggestion: SetRow | null;
    }
  | { type: 'replaceSets'; lineId: string; sets: SetRow[] };

function updateExercise(
  state: SessionState,
  lineId: string,
  update: (item: SessionExercise) => SessionExercise,
): SessionState {
  return {
    ...state,
    exercises: state.exercises.map((item) => (item.lineId === lineId ? update(item) : item)),
  };
}

function updateSets(
  state: SessionState,
  lineId: string,
  update: (sets: SetRow[]) => SetRow[],
): SessionState {
  return updateExercise(state, lineId, (item) => ({ ...item, sets: update(item.sets) }));
}

/**
 * The next planned exercise after `lineId` (wrapping around) that is not done
 * yet. Maybes are skipped: they wait to be picked.
 */
export function nextUnfinishedAfter(
  exercises: readonly SessionExercise[],
  lineId: string,
): string | null {
  const start = exercises.findIndex((item) => item.lineId === lineId);

  for (let step = 1; step < exercises.length; step++) {
    const candidate = exercises[(start + step) % exercises.length];
    if (candidate.section === 'plan' && exerciseProgress(candidate.sets) !== 'done') {
      return candidate.lineId;
    }
  }

  return null;
}

/** The old exercise first, without the new one or duplicates, capped. */
function alternatesAfterSwap(item: SessionExercise, next: CatalogExercise): CatalogExercise[] {
  const out: CatalogExercise[] = [];

  for (const candidate of [item.exercise, ...item.alternates]) {
    if (candidate.id === next.id || out.some((alternate) => alternate.id === candidate.id)) {
      continue;
    }
    out.push(candidate);
  }

  return out.slice(0, MAX_ALTERNATES);
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'updateMeta':
      return { ...state, ...action.patch };

    case 'openExercise':
      return { ...state, openLineId: action.lineId };

    case 'openNextExercise':
      return { ...state, openLineId: nextUnfinishedAfter(state.exercises, action.afterLineId) };

    case 'addExercises': {
      const room = MAX_SESSION_EXERCISES - state.exercises.length;
      if (room <= 0 || action.items.length === 0) return state;

      const section = action.section ?? 'plan';
      const added: SessionExercise[] = action.items.slice(0, room).map(({ lineId, exercise }) => ({
        lineId,
        exercise,
        sets: [emptySetRow()],
        note: '',
        section,
        alternates: [],
      }));

      return {
        ...state,
        exercises: [...state.exercises, ...added],
        // A maybe waits until you pick it; a planned exercise opens right away.
        openLineId: section === 'plan' ? added[0].lineId : state.openLineId,
      };
    }

    case 'swapExercise':
      return updateExercise(state, action.lineId, (item) => {
        if (item.exercise.id === action.exercise.id) return item;

        const metricChanged = item.exercise.metric !== action.exercise.metric;

        return {
          ...item,
          exercise: action.exercise,
          alternates: alternatesAfterSwap(item, action.exercise),
          // Different metrics log different fields, so old values would not fit.
          sets: metricChanged ? [emptySetRow()] : item.sets,
        };
      });

    case 'setSection': {
      const moved = updateExercise(state, action.lineId, (item) => ({
        ...item,
        section: action.section,
      }));

      if (action.open) return { ...moved, openLineId: action.lineId };

      // A card that moves to maybe closes; maybes show as compact rows.
      if (action.section === 'maybe' && state.openLineId === action.lineId) {
        return { ...moved, openLineId: null };
      }

      return moved;
    }

    case 'removeExercise': {
      const index = state.exercises.findIndex((item) => item.lineId === action.lineId);
      if (index < 0) return state;

      const exercises = state.exercises.filter((item) => item.lineId !== action.lineId);
      const openLineId =
        state.openLineId === action.lineId
          ? (exercises[Math.min(index, exercises.length - 1)]?.lineId ?? null)
          : state.openLineId;

      return { ...state, exercises, openLineId };
    }

    case 'moveExercise': {
      const from = state.exercises.findIndex((item) => item.lineId === action.lineId);
      if (from < 0) return state;

      const to = Math.max(0, Math.min(state.exercises.length - 1, action.toIndex));
      if (from === to) return state;

      const exercises = [...state.exercises];
      const [moved] = exercises.splice(from, 1);
      exercises.splice(to, 0, moved);

      return { ...state, exercises };
    }

    case 'setExerciseNote':
      return updateExercise(state, action.lineId, (item) => ({ ...item, note: action.note }));

    case 'updateSet':
      return updateSets(state, action.lineId, (sets) =>
        sets.map((set, i) => (i === action.setIndex ? { ...set, ...action.patch } : set)),
      );

    case 'addSet':
      return updateSets(state, action.lineId, (sets) => [...sets, emptySetRow()]);

    case 'copyLastSet':
      return updateSets(state, action.lineId, (sets) => {
        const last = sets[sets.length - 1];
        return [...sets, last ? copySetRow(last) : emptySetRow()];
      });

    case 'removeSet':
      return updateSets(state, action.lineId, (sets) => {
        // An exercise always has a row to type into.
        if (sets.length <= 1) return [emptySetRow()];
        return sets.filter((_, i) => i !== action.setIndex);
      });

    case 'toggleSetDone':
      return updateSets(state, action.lineId, (sets) =>
        sets.map((set, i) => {
          if (i !== action.setIndex) return set;
          if (set.done) return { ...set, done: false };
          return { ...fillFromSuggestion(set, action.suggestion), done: true };
        }),
      );

    case 'replaceSets':
      return updateSets(state, action.lineId, () =>
        action.sets.length > 0 ? action.sets : [emptySetRow()],
      );
  }
}

/**
 * Reorder and Move show one section at a time. Turns "slot `toIndex` among the
 * other exercises in this section" into the index `moveExercise` expects — a
 * position in the full list without the moving exercise.
 */
export function fullIndexForSectionMove(
  all: readonly SessionExercise[],
  lineId: string,
  toIndex: number,
): number {
  const moving = all.find((item) => item.lineId === lineId);
  if (!moving) return toIndex;

  const rest = all.filter((item) => item.lineId !== lineId);
  const sectionRest = rest.filter((item) => item.section === moving.section);
  if (sectionRest.length === 0) return 0;

  const anchor = sectionRest[Math.min(toIndex, sectionRest.length - 1)];
  const anchorIndex = rest.findIndex((item) => item.lineId === anchor.lineId);

  return toIndex < sectionRest.length ? anchorIndex : anchorIndex + 1;
}
