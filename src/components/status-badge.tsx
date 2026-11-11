import { CheckIcon } from '@/components/ui/icons';
import { Pill, type PillTone } from '@/components/ui/pill';
import { sessionStatusLabel } from '@/lib/session-format';
import type { SessionStatus } from '@/types/workout';

const TONE: Record<SessionStatus, PillTone> = {
  in_progress: 'warning',
  completed: 'success',
  discarded: 'danger',
};

/** The state a workout is in: in progress, completed, or discarded. */
export function StatusBadge({ status }: { status: SessionStatus }) {
  return (
    <Pill
      label={sessionStatusLabel(status)}
      tone={TONE[status]}
      // The amber dot is the designs' mark for a workout still open.
      dot={status === 'in_progress'}
      icon={status === 'completed' ? CheckIcon : undefined}
    />
  );
}
