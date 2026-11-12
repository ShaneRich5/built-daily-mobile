import { StyleSheet, View } from 'react-native';

import { ConsistencyChart, WeekDays, WeekGoal } from '@/components/home/week-card';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addDays, shortDayLabel } from '@/lib/date-keys';
import type { HomeConsistency, HomeWeekDay, HomeWeekGoal } from '@/lib/home-model';
import type { Milestone, PersonalRecord } from '@/lib/progress-insights';

/** A record set this recently gets a "New PR" pill. */
const NEW_RECORD_DAYS = 14;

/**
 * Home's This week card — the goal and streak, Sunday to Saturday, the last 16
 * weeks — with the active-days line Progress has always shown under the days.
 */
export function ThisWeekCard({
  todayKey,
  goal,
  activeDays,
  activeDaysGoal,
  days,
  consistency,
  onOpenDay,
  onOpenWorkout,
}: {
  todayKey: string;
  goal: HomeWeekGoal;
  activeDays: number;
  activeDaysGoal: number;
  days: readonly HomeWeekDay[];
  consistency: HomeConsistency;
  onOpenDay: (day: HomeWeekDay) => void;
  onOpenWorkout: (sessionId: string) => void;
}) {
  const theme = useTheme();

  return (
    <Card style={styles.week}>
      <WeekGoal todayKey={todayKey} goal={goal} streak={consistency.streak} />
      <WeekDays days={days} onStartPlanned={onOpenDay} />
      <View
        style={[styles.activeDays, { borderTopColor: theme.borderSubtle }]}
        accessible
        accessibilityLabel={`Active days, workouts or activities: ${activeDays} of ${activeDaysGoal}`}>
        <ThemedText type="small" themeColor="textBody" style={styles.flex}>
          Active days (workouts or activities)
        </ThemedText>
        <ThemedText type="monoSmall" style={styles.activeCount}>
          {activeDays} / {activeDaysGoal}
        </ThemedText>
      </View>
      <ConsistencyChart consistency={consistency} onOpenWorkout={onOpenWorkout} />
    </Card>
  );
}

/** The best set for each main lift. One set in the last two weeks is marked new. */
export function StrengthCard({ lifts, todayKey }: { lifts: readonly PersonalRecord[]; todayKey: string }) {
  const theme = useTheme();
  const recentKey = addDays(todayKey, -NEW_RECORD_DAYS);

  return (
    <Card style={styles.card}>
      <CardHeading title="Strength" aside="Best sets" />
      {lifts.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Log a few weighted sets and your best lifts show up here.
        </ThemedText>
      ) : (
        <View>
          {lifts.map((lift, index) => (
            <View
              key={lift.exerciseId}
              style={[
                styles.lift,
                index > 0 && { borderTopColor: theme.borderSubtle, borderTopWidth: 1 },
              ]}>
              <View style={styles.flex}>
                <ThemedText type="label" numberOfLines={1}>
                  {lift.exerciseName || 'Unnamed exercise'}
                </ThemedText>
                <ThemedText type="caption">{shortDayLabel(lift.dateKey)}</ThemedText>
              </View>
              {lift.dateKey >= recentKey ? (
                <Pill label="New PR" tone="warning" uppercase={false} />
              ) : null}
              <ThemedText
                type="mono"
                accessibilityLabel={`${lift.weight} pounds for ${lift.reps} ${lift.reps === 1 ? 'rep' : 'reps'}`}>
                {lift.weight} × {lift.reps}
              </ThemedText>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

/** What has been earned, then the next one to aim for. */
export function MilestonesRow({ milestones }: { milestones: readonly Milestone[] }) {
  const theme = useTheme();
  const earned = milestones.filter((milestone) => milestone.achieved);
  const next = milestones.find((milestone) => !milestone.achieved);
  if (earned.length === 0 && !next) return null;

  return (
    <View style={styles.milestones}>
      {earned.map((milestone) => (
        <View
          key={milestone.id}
          accessible
          accessibilityLabel={`${milestone.title}, earned. ${milestone.description}`}
          style={[styles.milestone, { backgroundColor: theme.tintSubtle, borderColor: theme.tintBorder }]}>
          <ThemedText type="caption" style={[styles.milestoneText, { color: theme.tintText }]}>
            {milestone.title}
          </ThemedText>
        </View>
      ))}
      {next ? (
        <View
          accessible
          accessibilityLabel={`Next milestone: ${next.title}. ${next.description}`}
          style={[styles.milestone, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <ThemedText type="caption" style={styles.milestoneText}>
            Next: {next.title}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

/** "Strength … Best sets": a card's title with a quiet note on the right. */
export function CardHeading({ title, aside }: { title: string; aside?: string | null }) {
  return (
    <View style={styles.heading}>
      <ThemedText type="labelStrong" accessibilityRole="header">
        {title}
      </ThemedText>
      {aside ? <ThemedText type="caption">{aside}</ThemedText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  week: {
    gap: 14,
  },
  card: {
    gap: 10,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  activeDays: {
    alignItems: 'center',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
  },
  activeCount: {
    fontSize: 13,
  },
  heading: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lift: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 48,
    paddingVertical: 8,
  },
  milestones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  milestone: {
    borderRadius: Radius.full,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 32,
    paddingHorizontal: 12,
  },
  milestoneText: {
    // Each Geist weight is its own family on native; fontWeight would fall back.
    fontFamily: FontFamily.medium,
  },
});
