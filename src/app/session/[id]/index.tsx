import { useLocalSearchParams } from 'expo-router';

import { SavedWorkoutScreen } from '@/components/session/saved-workout-screen';
import { SessionLoader } from '@/components/session/session-loader';
import { WorkoutScreen } from '@/components/session/workout-screen';

/**
 * One workout. What it shows follows the workout's status: the logging screen
 * while it is in progress, the summary once it is finished. Finishing (or
 * reopening) flips the status on the document, and this route follows it — so
 * neither screen has to navigate to the other.
 */
export default function SessionRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SessionLoader sessionId={id}>
      {(session) =>
        session.status === 'in_progress' ? (
          // Keyed so a different workout never inherits this one's draft state.
          <WorkoutScreen key={session.id} session={session} mode="live" />
        ) : (
          <SavedWorkoutScreen session={session} />
        )
      }
    </SessionLoader>
  );
}
