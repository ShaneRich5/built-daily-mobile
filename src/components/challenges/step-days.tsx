import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { weekdayIndex } from '@/lib/date-keys';
import type { StepDayCell } from '@/lib/step-challenge-model';
import type { ChallengePeriod } from '@/types/challenge';

type StepDaysProps = {
  period: ChallengePeriod;
  days: StepDayCell[];
  /** Outlines the day the log sheet is editing. */
  selectedKey?: string;
  onPickDay: (dateKey: string) => void;
};

/**
 * The challenge's days: seven dots for a week, a calendar grid for a month.
 * Past days and today open the log sheet; days still ahead can't be picked.
 * A hit day is filled; a missed one is just quiet, never red.
 */
export function StepDays({ period, days, selectedKey, onPickDay }: StepDaysProps) {
  if (period === 'week') {
    return (
      <View style={styles.week}>
        {days.map((day) => (
          <View key={day.dateKey} style={styles.weekColumn}>
            <ThemedText type="caption" themeColor="textSecondary">
              {day.letter}
            </ThemedText>
            <DayButton day={day} selected={day.dateKey === selectedKey} onPickDay={onPickDay} />
            <ThemedText type="monoSmall" themeColor="textSecondary" style={styles.short}>
              {day.short || ' '}
            </ThemedText>
          </View>
        ))}
      </View>
    );
  }

  // Pad the first row so the 1st lands under its weekday.
  const lead = days.length > 0 ? weekdayIndex(days[0].dateKey) : 0;
  const cells: (StepDayCell | null)[] = [...Array.from({ length: lead }, () => null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);
  const rows = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));

  return (
    <View style={styles.month}>
      <View style={styles.monthRow}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((letter, i) => (
          <ThemedText key={i} type="caption" themeColor="textSecondary" style={styles.monthCell}>
            {letter}
          </ThemedText>
        ))}
      </View>
      {rows.map((row, r) => (
        <View key={r} style={styles.monthRow}>
          {row.map((day, c) => (
            <View key={day?.dateKey ?? `pad-${r}-${c}`} style={styles.monthCell}>
              {day ? (
                <DayButton
                  day={day}
                  compact
                  selected={day.dateKey === selectedKey}
                  onPickDay={onPickDay}
                />
              ) : null}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function DayButton({
  day,
  selected,
  compact = false,
  onPickDay,
}: {
  day: StepDayCell;
  selected: boolean;
  compact?: boolean;
  onPickDay: (dateKey: string) => void;
}) {
  const theme = useTheme();
  const size = compact ? 34 : 36;
  const background = day.hit ? theme.tint : day.isFuture ? 'transparent' : theme.backgroundElement;
  const color = day.hit ? theme.onTint : day.isFuture ? theme.textFaint : theme.textBody;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={day.label}
      accessibilityState={{ disabled: day.isFuture, selected }}
      disabled={day.isFuture}
      onPress={() => onPickDay(day.dateKey)}
      hitSlop={4}
      style={({ pressed }) => [
        styles.day,
        {
          width: size,
          height: size,
          backgroundColor: background,
          borderColor: selected || day.isToday ? theme.text : theme.border,
          borderWidth: selected ? 2 : day.isToday || day.isFuture ? 1 : 0,
          borderStyle: day.isFuture ? 'dashed' : 'solid',
        },
        pressed && styles.pressed,
      ]}>
      <ThemedText style={[styles.dayText, { color }]}>
        {compact ? String(day.dayOfMonth) : day.synced ? '•' : ''}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  week: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekColumn: {
    alignItems: 'center',
    gap: 4,
  },
  short: {
    minWidth: 32,
    textAlign: 'center',
  },
  month: {
    gap: 4,
  },
  monthRow: {
    flexDirection: 'row',
  },
  monthCell: {
    alignItems: 'center',
    flex: 1,
    textAlign: 'center',
  },
  day: {
    alignItems: 'center',
    borderRadius: Radius.full,
    justifyContent: 'center',
  },
  dayText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.7,
  },
});
