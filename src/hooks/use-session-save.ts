import { useCallback, useState } from 'react';

import { useSession } from '@/contexts/session';
import { updateSession } from '@/services/firestore/workout-repository';
import type { SessionPatch } from '@/services/firestore/mappers';

type State = {
  save: (patch: SessionPatch) => Promise<boolean>;
  isSaving: boolean;
  error: string | null;
};

/**
 * Saving one session, shared by the two edit screens.
 *
 * Resolves to whether the write landed, so a screen can navigate back on
 * success and stay put — with the message still on screen — on failure.
 */
export function useSessionSave(sessionId: string | undefined): State {
  const { user } = useSession();
  const uid = user?.uid;
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(
    async (patch: SessionPatch) => {
      if (!uid || !sessionId) {
        setError('You are not signed in.');
        return false;
      }

      setIsSaving(true);
      setError(null);

      try {
        await updateSession(uid, sessionId, patch);
        return true;
      } catch (cause) {
        // The web app never writes `discarded`, so the security rules may not
        // permit it (docs/DATA_MODEL.md). Name that case rather than showing a
        // bare permission error.
        const isPermission =
          cause instanceof Error && /permission|insufficient/i.test(cause.message);

        setError(
          isPermission
            ? 'That change was refused by the server. Discarding a workout may not be allowed yet.'
            : 'Could not save your changes.',
        );
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [uid, sessionId],
  );

  return { save, isSaving, error };
}
