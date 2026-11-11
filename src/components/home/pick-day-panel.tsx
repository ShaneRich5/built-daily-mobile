import { ScrollView, StyleSheet } from 'react-native';

import { ActionRow } from '@/components/ui/action-row';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from '@/components/ui/icons';
import { SheetFrame } from '@/components/ui/sheet';
import { addDays, shortDayLabel } from '@/lib/date-keys';

type PickDayPanelProps = {
  /** What is being moved: "Leg day". */
  label: string;
  todayKey: string;
  busy: boolean;
  /** A day, or null for "no day yet" (the planner's Unscheduled tray). */
  onPick: (dateKey: string | null) => void;
  onCancel: () => void;
};

/** How many days ahead are offered; anything further belongs in the planner. */
const DAYS_AHEAD = 7;

/** Puts a planned workout on another day — the next week, or no day for now. */
export function PickDayPanel({ label, todayKey, busy, onPick, onCancel }: PickDayPanelProps) {
  const days = Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(todayKey, i));

  return (
    <SheetFrame
      flush
      title={`Move ${label}`}
      subtitle="Pick a day this week, or leave it unscheduled."
      footer={<Button label="Cancel" variant="secondary" size="lg" onPress={onCancel} />}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.rows}>
        {days.map((key, index) => (
          <ActionRow
            key={key}
            label={index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : shortDayLabel(key)}
            detail={index < 2 ? shortDayLabel(key) : undefined}
            icon={CalendarIcon}
            disabled={busy}
            onPress={() => onPick(key)}
          />
        ))}
        <ActionRow
          label="No day yet"
          detail="Keep it in Unscheduled on the planner"
          disabled={busy}
          onPress={() => onPick(null)}
        />
      </ScrollView>
    </SheetFrame>
  );
}

const styles = StyleSheet.create({
  rows: {
    paddingBottom: 8,
    paddingHorizontal: 8,
  },
  scroll: {
    maxHeight: 480,
  },
});
