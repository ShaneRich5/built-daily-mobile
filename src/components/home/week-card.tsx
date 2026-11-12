import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { FlameIcon } from '@/components/ui/icons';
import { Pill } from '@/components/ui/pill';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { shortDayLabel } from '@/lib/date-keys';
import {
  type HomeChartDay,
  type HomeChartWeek,
  type HomeConsistency,
  type HomeRecentItem,
  type HomeWeekDay,
  type HomeWeekGoal,
  weekNudge,
} from '@/lib/home-model';

type WeekCardProps = {
  todayKey: string;
  days: readonly HomeWeekDay[];
  goal: HomeWeekGoal;
  consistency: HomeConsistency;
  /** A planned day was tapped: start it. */
  onStartPlanned: (day: HomeWeekDay) => void;
  /** A logged workout was tapped in the day list under the chart. */
  onOpenWorkout: (sessionId: string) => void;
  /** A logged activity was tapped there. Without it, activities are listed but not tappable. */
  onOpenActivity?: (activityId: string) => void;
};

/** This week's goal and streak, the Sunday–Saturday days, and the last 16 weeks. */
export function WeekCard({
  todayKey,
  days,
  goal,
  consistency,
  onStartPlanned,
  onOpenWorkout,
  onOpenActivity,
}: WeekCardProps) {
  return (
    <Card style={styles.card}>
      <WeekGoal todayKey={todayKey} goal={goal} streak={consistency.streak} />
      <WeekDays days={days} onStartPlanned={onStartPlanned} />
      <ConsistencyChart
        consistency={consistency}
        onOpenWorkout={onOpenWorkout}
        onOpenActivity={onOpenActivity}
      />
    </Card>
  );
}

/** "1 of 3 workouts", the streak pill, goal segments and one encouraging line. */
export function WeekGoal({
  todayKey,
  goal,
  streak,
}: {
  todayKey: string;
  goal: HomeWeekGoal;
  streak: number;
}) {
  const theme = useTheme();

  return (
    <View style={styles.goal}>
      <View style={styles.goalTop}>
        <View
          style={styles.count}
          accessible
          accessibilityLabel={`${goal.completed} of ${goal.target} workouts this week`}>
          <ThemedText type="stat">{goal.completed}</ThemedText>
          <ThemedText type="small" themeColor="textMuted">
            of {goal.target} workouts
          </ThemedText>
        </View>
        {streak > 0 ? (
          <Pill label={`${streak}-week streak`} tone="success" icon={FlameIcon} uppercase={false} />
        ) : null}
      </View>

      <View style={styles.segments} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {Array.from({ length: goal.target }, (_, index) => (
          <View
            key={index}
            style={[
              styles.segment,
              {
                backgroundColor: index < goal.completed ? theme.tint : theme.backgroundSelected,
              },
            ]}
          />
        ))}
      </View>

      <ThemedText type="small" themeColor="textMuted">
        {weekNudge(goal, streak, todayKey)}
      </ThemedText>
    </View>
  );
}

/** Seven circles, Sunday to Saturday. Tapping a planned day starts it. */
export function WeekDays({
  days,
  onStartPlanned,
}: {
  days: readonly HomeWeekDay[];
  onStartPlanned: (day: HomeWeekDay) => void;
}) {
  const theme = useTheme();

  const circle = (day: HomeWeekDay) => {
    switch (day.state) {
      case 'workout':
        return { fill: theme.tint, text: theme.onTint, border: undefined };
      case 'activity':
        return { fill: theme.activitySubtle, text: theme.activityText, border: undefined };
      case 'planned':
        return { fill: theme.surface, text: theme.tintText, border: { color: theme.tint, width: 1.5 } };
      case 'empty':
        if (day.isToday) {
          return { fill: theme.surface, text: theme.text, border: { color: theme.text, width: 1.5 } };
        }
        return day.isPast
          ? { fill: theme.backgroundElement, text: theme.textSecondary, border: undefined }
          : { fill: theme.surface, text: theme.textFaint, border: { color: theme.border, width: 1 } };
    }
  };

  return (
    <View style={styles.days}>
      {days.map((day) => {
        const look = circle(day);
        const content = (
          <>
            <ThemedText style={styles.weekday} themeColor="textSecondary">
              {day.weekday}
            </ThemedText>
            <View
              style={[
                styles.circle,
                { backgroundColor: look.fill },
                look.border && { borderColor: look.border.color, borderWidth: look.border.width },
              ]}>
              <ThemedText style={[styles.dayNumber, { color: look.text }]}>
                {day.dayOfMonth}
              </ThemedText>
            </View>
          </>
        );

        // Only a planned day goes anywhere; the rest are a picture of the week.
        return day.planned ? (
          <Pressable
            key={day.dateKey}
            accessibilityRole="button"
            accessibilityLabel={day.label}
            accessibilityHint="Starts this workout"
            onPress={() => onStartPlanned(day)}
            style={({ pressed }) => [styles.day, pressed && styles.pressed]}>
            {content}
          </Pressable>
        ) : (
          <View key={day.dateKey} accessible accessibilityLabel={day.label} style={styles.day}>
            {content}
          </View>
        );
      })}
    </View>
  );
}

/** Past days and today can be opened; days ahead have nothing to show yet. */
function isTappable(day: HomeChartDay): boolean {
  return day === 'workout' || day === 'activity' || day === 'rest' || day === 'today';
}

/** The last 16 weeks, one square per day. Tap a past day to see what was logged. */
export function ConsistencyChart({
  consistency,
  onOpenWorkout,
  onOpenActivity,
}: {
  consistency: HomeConsistency;
  onOpenWorkout: (sessionId: string) => void;
  onOpenActivity?: (activityId: string) => void;
}) {
  const theme = useTheme();
  const { weeks, longest, label, dayItems } = consistency;
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const cell = (day: HomeChartDay) => {
    switch (day) {
      case 'workout':
        return { backgroundColor: theme.tint };
      case 'activity':
        return { backgroundColor: theme.activity };
      case 'rest':
        return { backgroundColor: theme.backgroundElement };
      case 'today':
        return { backgroundColor: theme.surface, borderColor: theme.text, borderWidth: 1.5 };
      case 'planned':
        return { backgroundColor: theme.surface, borderColor: theme.tint, borderWidth: 1.5 };
      case 'ahead':
        return { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 };
    }
  };

  const goalBar = (goal: HomeChartWeek['goal']) =>
    ({ hit: theme.tint, missed: theme.backgroundSelected, open: theme.tintBorder })[goal];

  return (
    <View style={[styles.chart, { borderTopColor: theme.borderSubtle }]}>
      <View style={styles.chartTop}>
        <ThemedText style={styles.chartTitle} themeColor="textBody">
          Last {weeks.length} weeks
        </ThemedText>
        {longest > 0 ? (
          <ThemedText type="caption">
            Longest streak{' '}
            <ThemedText type="monoSmall">{longest} wk</ThemedText>
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.grid} accessible accessibilityRole="image" accessibilityLabel={label}>
        {weeks.map((week) => (
          <View key={week.startKey} style={styles.column}>
            {week.days.map((day, index) => {
              const key = week.dateKeys[index];
              const selected = key === selectedKey;
              const square = (
                <View
                  style={[
                    styles.cell,
                    cell(day),
                    selected && { borderColor: theme.text, borderWidth: 2 },
                  ]}
                />
              );

              return isTappable(day) ? (
                <Pressable
                  key={key}
                  testID={`chart-day-${key}`}
                  // The squares sit 4px apart; any more slop and they overlap.
                  hitSlop={2}
                  onPress={() => setSelectedKey(selected ? null : key)}>
                  {square}
                </Pressable>
              ) : (
                <View key={key}>{square}</View>
              );
            })}
            <View style={[styles.goalBar, { backgroundColor: goalBar(week.goal) }]} />
          </View>
        ))}
      </View>

      {selectedKey ? (
        <DayItems
          dateKey={selectedKey}
          items={dayItems[selectedKey] ?? []}
          onOpenWorkout={onOpenWorkout}
          onOpenActivity={onOpenActivity}
        />
      ) : null}

      <View style={styles.legend}>
        <LegendItem label="Workout" color={theme.tint} />
        <LegendItem label="Activity" color={theme.activity} />
        <LegendItem label="Goal hit" color={theme.tint} bar />
      </View>
    </View>
  );
}

/** What was logged on the day whose square was tapped. */
function DayItems({
  dateKey,
  items,
  onOpenWorkout,
  onOpenActivity,
}: {
  dateKey: string;
  items: readonly HomeRecentItem[];
  onOpenWorkout: (sessionId: string) => void;
  onOpenActivity?: (activityId: string) => void;
}) {
  const theme = useTheme();
  const open = (item: HomeRecentItem) =>
    item.kind === 'workout' ? () => onOpenWorkout(item.id) : onOpenActivity && (() => onOpenActivity(item.id));

  return (
    <View style={[styles.dayItems, { backgroundColor: theme.background }]}>
      <ThemedText type="caption" themeColor="textBody">
        {shortDayLabel(dateKey)}
      </ThemedText>

      {items.length === 0 ? (
        <ThemedText type="caption">Nothing logged. Rest days count too.</ThemedText>
      ) : (
        items.map((item) => {
          const onPress = open(item);
          return onPress ? (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}, ${item.meta}`}
              hitSlop={8}
              onPress={onPress}>
              <ThemedText type="link" themeColor="text">
                {item.title} <ThemedText type="caption">· {item.meta}</ThemedText>
              </ThemedText>
            </Pressable>
          ) : (
            <ThemedText key={item.id} type="link" themeColor="text">
              {item.title} <ThemedText type="caption">· {item.meta}</ThemedText>
            </ThemedText>
          );
        })
      )}
    </View>
  );
}

function LegendItem({ label, color, bar = false }: { label: string; color: string; bar?: boolean }) {
  return (
    <View style={styles.legendItem}>
      <View style={[bar ? styles.legendBar : styles.legendSquare, { backgroundColor: color }]} />
      <ThemedText style={styles.legendLabel} themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  goal: {
    gap: 8,
    paddingHorizontal: 2,
  },
  goalTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  count: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 6,
  },
  segments: {
    flexDirection: 'row',
    gap: 4,
  },
  segment: {
    borderRadius: Radius.full,
    flex: 1,
    height: 6,
  },
  days: {
    flexDirection: 'row',
    gap: 4,
  },
  day: {
    alignItems: 'center',
    flex: 1,
    gap: 6,
    paddingVertical: 4,
  },
  weekday: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    lineHeight: 14,
  },
  circle: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  dayNumber: {
    fontFamily: FontFamily.semibold,
    fontSize: 14,
    lineHeight: 18,
  },
  chart: {
    borderTopWidth: 1,
    gap: 10,
    paddingHorizontal: 2,
    paddingTop: 12,
  },
  chartTop: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chartTitle: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    gap: 4,
  },
  cell: {
    borderRadius: 3,
    height: 14,
    width: 14,
  },
  goalBar: {
    borderRadius: Radius.full,
    height: 4,
    width: 14,
  },
  dayItems: {
    borderRadius: Radius.sm,
    gap: 6,
    padding: 10,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  legendSquare: {
    borderRadius: 2,
    height: 10,
    width: 10,
  },
  legendBar: {
    borderRadius: Radius.full,
    height: 4,
    width: 12,
  },
  legendLabel: {
    fontSize: 11,
    lineHeight: 14,
  },
  pressed: {
    opacity: 0.6,
  },
});
