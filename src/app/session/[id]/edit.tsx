import { useLocalSearchParams } from 'expo-router';

import { SessionLoader } from '@/components/session/session-loader';
import { WorkoutScreen } from '@/components/session/workout-screen';

/**
 * Correcting a finished workout, on the same screen it was logged with. Nothing
 * is written until "Save changes", and Cancel leaves it as it was.
 *
 * A workout that is still in progress has no separate edit: opening this route
 * for one simply shows it being logged.
 */
export default function EditSessionRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SessionLoader sessionId={id}>
      {(session) => (
        <WorkoutScreen
          key={session.id}
          session={session}
          mode={session.status === 'in_progress' ? 'live' : 'edit'}
        />
      )}
    </SessionLoader>
  );
}
