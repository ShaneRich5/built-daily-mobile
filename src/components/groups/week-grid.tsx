import { StyleSheet, View } from 'react-native';

import { Avatar, DayDot } from '@/components/groups/group-ui';
import { ThemedText } from '@/components/themed-text';
import { UsersIcon } from '@/components/ui/icons';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { DayMark, MemberWeek, WeekDay } from '@/lib/groups-model';

const MARK_WORD: Record<DayMark, string> = { trained: 'trained', planned: 'planned', none: 'nothing yet' };
const NAME_WIDTH = 92;
const COUNT_WIDTH = 36;

/**
 * The whole week in one grid: day headers, then a row per member. Today's
 * column sits on a light band. `togetherDays` adds a small people icon (buddy
 * view). Each row is one stop for a screen reader: the name, then each day.
 */
export function WeekGrid({
  days,
  rows,
  togetherDays,
  showCounts = true,
}: {
  days: readonly WeekDay[];
  rows: readonly MemberWeek[];
  togetherDays?: ReadonlySet<string>;
  showCounts?: boolean;
}) {
  const theme = useTheme();
  const band = { backgroundColor: theme.backgroundElement };

  return (
    <View>
      <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={styles.name} />
        {days.map((day) => (
          <View key={day.dateKey} style={[styles.cell, styles.header, day.isToday && [band, styles.bandTop]]}>
            <ThemedText style={[styles.headerText, { color: day.isToday ? theme.text : theme.textSecondary }, day.isToday && styles.bold]}>
              {day.letter}
            </ThemedText>
            <ThemedText style={[styles.headerText, { color: day.isToday ? theme.text : theme.textSecondary }, day.isToday && styles.bold]}>
              {day.dayOfMonth}
            </ThemedText>
          </View>
        ))}
        {showCounts ? <View style={styles.count} /> : null}
      </View>

      {rows.map((row, r) => {
        const who = row.isMe ? 'You' : row.name;
        const label = [
          `${who}, ${row.done} of ${row.goal} this week`,
          ...days.map((day, i) => `${day.short} ${day.dayOfMonth}: ${MARK_WORD[row.marks[i]]}`),
        ].join('. ');

        return (
          <View key={row.uid} style={styles.row} accessible accessibilityLabel={label}>
            <View style={[styles.name, styles.nameRow]}>
              <Avatar name={row.name} size="sm" />
              <ThemedText
                type={row.isMe ? 'labelStrong' : 'label'}
                numberOfLines={1}
                style={[styles.nameText, !row.isMe && { color: theme.textBody }]}>
                {who}
              </ThemedText>
            </View>
            {days.map((day, i) => (
              <View
                key={day.dateKey}
                style={[styles.cell, styles.body, day.isToday && band, day.isToday && r === rows.length - 1 && styles.bandBottom]}>
                <DayDot mark={row.marks[i]} />
                {togetherDays?.has(day.dateKey) && r === 0 ? (
                  <View style={styles.together}>
                    <UsersIcon size={11} color={theme.tintText} strokeWidth={2.5} />
                  </View>
                ) : null}
              </View>
            ))}
            {showCounts ? (
              <ThemedText type="monoSmall" style={[styles.count, styles.countText, { color: theme.textMuted }]}>
                {row.done}/{row.goal}
              </ThemedText>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export function WeekLegend() {
  const theme = useTheme();

  return (
    <View style={styles.legend} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.legendItem}>
        <DayDot mark="trained" />
        <ThemedText type="caption">Trained</ThemedText>
      </View>
      <View style={styles.legendItem}>
        <DayDot mark="planned" />
        <ThemedText type="caption">Planned</ThemedText>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.todaySwatch, { backgroundColor: theme.backgroundElement }]} />
        <ThemedText type="caption">Today</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  name: {
    width: NAME_WIDTH,
  },
  nameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingRight: 4,
    paddingVertical: 8,
  },
  nameText: {
    flexShrink: 1,
    fontSize: 14,
  },
  cell: {
    alignItems: 'center',
    flex: 1,
  },
  header: {
    paddingBottom: 4,
    paddingTop: 6,
  },
  headerText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    lineHeight: 14,
  },
  bold: {
    fontFamily: FontFamily.bold,
  },
  body: {
    height: 44,
    justifyContent: 'center',
  },
  bandTop: {
    borderTopLeftRadius: Radius.sm,
    borderTopRightRadius: Radius.sm,
  },
  bandBottom: {
    borderBottomLeftRadius: Radius.sm,
    borderBottomRightRadius: Radius.sm,
  },
  together: {
    bottom: 2,
    position: 'absolute',
  },
  count: {
    width: COUNT_WIDTH,
  },
  countText: {
    fontSize: 13,
    textAlign: 'right',
  },
  legend: {
    columnGap: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 4,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  todaySwatch: {
    borderRadius: 4,
    height: 16,
    width: 16,
  },
});
