import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CalendarCheckIcon } from '@/components/ui/icons';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CatchUpCardProps = {
  /** "Leg day slid past yesterday" */
  headline: string;
  busy: boolean;
  onDoToday: () => void;
  onPickDay: () => void;
  onSkip: () => void;
};

/**
 * A calm nudge when a planned workout slid past: fit it back in today, pick
 * another day, or let it go. Never a red mark — a missed day is not a failure
 * to be shown one.
 */
export function CatchUpCard({ headline, busy, onDoToday, onPickDay, onSkip }: CatchUpCardProps) {
  const theme = useTheme();

  return (
    <Card radius="xl" style={styles.card}>
      <View style={styles.top}>
        <View style={[styles.icon, { backgroundColor: theme.backgroundElement }]}>
          <CalendarCheckIcon size={18} color={theme.textBody} strokeWidth={2} />
        </View>
        <View style={styles.copy}>
          <ThemedText type="labelStrong" accessibilityRole="header">
            {headline}
          </ThemedText>
          <ThemedText type="small" themeColor="textMuted">
            Happens. Want to fit it back in?
          </ThemedText>
        </View>
      </View>

      <Button label="Do it today" size="lg" onPress={onDoToday} disabled={busy} />

      <View style={styles.row}>
        <Button
          label="Pick a day"
          variant="secondary"
          onPress={onPickDay}
          disabled={busy}
          style={styles.flex}
        />
        <Button
          label="Skip it"
          variant="secondary"
          onPress={onSkip}
          disabled={busy}
          style={styles.flex}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    padding: 16,
  },
  top: {
    flexDirection: 'row',
    gap: 12,
  },
  icon: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  flex: {
    flex: 1,
  },
});
