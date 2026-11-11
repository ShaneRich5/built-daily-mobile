import { useCallback, useEffect, useReducer, useRef, useState } from 'react';

import { useSession } from '@/contexts/session';
import type { CatalogExercise } from '@/lib/exercise-catalog';
import { applyStatusTransition } from '@/lib/session-edit';
import { sessionReducer } from '@/lib/session/session-reducer';
import { finishState, sessionContent, sessionStateFrom } from '@/lib/session/session-state';
import { deleteSession, updateSession } from '@/services/firestore/workout-repository';
import { newLineId } from '@/services/ids';
import type { LineSection, WorkoutSession } from '@/types/workout';

/** How long after the last change an autosave waits, so typing is not a write per key. */
const AUTOSAVE_DELAY_MS = 1200;

export type SaveStatus = 'idle' | 'saving' | 'error';

type Options = {
  /**
   * `true` for a workout in progress: changes are saved as they are made, and
   * once more when the screen is left. `false` for editing a finished one,
   * which saves only when asked and can be cancelled.
   */
  autosave: boolean;
};

/**
 * Owns one workout while it is being logged or edited: the reducer state, and
 * getting that state into Firestore.
 *
 * The state is seeded once from the session it is given and is the truth from
 * then on. Later snapshots of the document are not merged in — doing so would
 * overwrite what is being typed, including this hook's own saves echoing back.
 * The cost, which the web app shares: a change made elsewhere mid-workout (the
 * MCP `add_sets` tool, another device) is not seen here and is overwritten by
 * the next save, because a save writes the whole `lines` array.
 */
export function useLiveWorkout(session: WorkoutSession, { autosave }: Options) {
  const { user } = useSession();
  const uid = user?.uid;
  const sessionId = session.id;

  const [state, dispatch] = useReducer(sessionReducer, session, sessionStateFrom);
  const [status, setStatus] = useState<SaveStatus>('idle');

  // Editing a finished workout: see `sessionContent` for what `finished` does.
  const finished = session.status === 'completed';
  const content = sessionContent(state, session.startedAt, { finished });
  const json = JSON.stringify(content);

  // What the document is known to hold. It starts as the state's own first
  // rendering of the session, so opening a workout never writes by itself.
  const [savedJson, setSavedJson] = useState(json);
  const isDirty = json !== savedJson;

  // The latest values, for callbacks that outlive the render they were made in
  // (the debounce timer, the save on leaving the screen).
  const latest = useRef({ content, json, savedJson, autosave });
  useEffect(() => {
    latest.current = { content, json, savedJson, autosave };
  });

  /** Set once the workout is finished or deleted: nothing may be written after. */
  const stopped = useRef(false);

  const save = useCallback(async (): Promise<boolean> => {
    if (!uid || stopped.current) return false;

    const { content: toSave, json: savingJson, savedJson: knownJson } = latest.current;
    if (savingJson === knownJson) return true;

    setStatus('saving');
    try {
      await updateSession(uid, sessionId, toSave);
      setSavedJson(savingJson);
      setStatus('idle');
      return true;
    } catch {
      setStatus('error');
      return false;
    }
  }, [uid, sessionId]);

  useEffect(() => {
    if (!autosave || !isDirty) return;

    const timer = setTimeout(() => void save(), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
    // `json` restarts the wait on every change, not only on the first.
  }, [autosave, isDirty, json, save]);

  // Leaving mid-debounce must not lose the last few seconds of typing.
  useEffect(() => {
    return () => {
      if (latest.current.autosave) void save();
    };
  }, [save]);

  /**
   * Completes the workout. Maybes nobody started are left out — skipping one
   * is not a miss — and nothing is saved after this, so a late autosave cannot
   * put them back.
   */
  const finish = useCallback(async (): Promise<boolean> => {
    if (!uid || stopped.current) return false;

    stopped.current = true;
    setStatus('saving');
    try {
      await updateSession(uid, sessionId, {
        ...sessionContent(finishState(state), session.startedAt),
        ...applyStatusTransition(session, 'completed'),
      });
      setStatus('idle');
      return true;
    } catch {
      stopped.current = false;
      setStatus('error');
      return false;
    }
  }, [uid, sessionId, state, session]);

  /** Deletes the workout for good. */
  const discard = useCallback(async (): Promise<boolean> => {
    if (!uid || stopped.current) return false;

    stopped.current = true;
    try {
      await deleteSession(uid, sessionId);
      return true;
    } catch {
      stopped.current = false;
      setStatus('error');
      return false;
    }
  }, [uid, sessionId]);

  /** Adds exercises in the order picked, minting the line id each one needs. */
  const addExercises = useCallback(
    (exercises: readonly CatalogExercise[], section: LineSection = 'plan') => {
      dispatch({
        type: 'addExercises',
        items: exercises.map((exercise) => ({ lineId: newLineId(), exercise })),
        section,
      });
    },
    [],
  );

  return { state, dispatch, addExercises, status, isDirty, save, finish, discard };
}

export type LiveWorkout = ReturnType<typeof useLiveWorkout>;
