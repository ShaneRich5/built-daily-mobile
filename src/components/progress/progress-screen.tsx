import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { BodyWeightCard } from '@/components/progress/body-weight-card';
import { GoalsPanel } from '@/components/progress/goals-panel';
import { MilestonesRow, StrengthCard, ThisWeekCard } from '@/components/progress/progress-cards';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { TargetIcon } from '@/components/ui/icons';
import { Screen } from '@/components/ui/screen';
import { SectionLabel } from '@/components/ui/section-label';
import { SheetHost } from '@/components/ui/sheet';
import { BottomTabInset } from '@/constants/theme';
import { useProgressData } from '@/hooks/use-progress-data';
import type { ProgressSettings } from '@/types/progress';

/**
 * Progress: am I showing up? This week against the goals, the best lifts,
 * body weight if the lifter tracks it, and milestones. Goals are set in a
 * sheet from the header.
 */
export function ProgressScreen() {
  const progress = useProgressData();
  const [goalsOpen, setGoalsOpen] = useState(false);
  const { todayKey } = progress;

  const saveGoals = async (settings: ProgressSettings) => {
    const saved = await progress.saveGoals(settings);
    if (saved) setGoalsOpen(false);
    return saved;
  };

  return (
    <>
      <Screen contentStyle={{ paddingBottom: BottomTabInset + 24 }}>
        <View style={styles.header}>
          <View style={styles.titles}>
            <ThemedText type="title" accessibilityRole="header">
              Progress
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Showing up beats perfect.
            </ThemedText>
          </View>
          <Button
            label="Goals"
            icon={TargetIcon}
            variant="secondary"
            size="sm"
            accessibilityLabel="Edit goals"
            onPress={() => setGoalsOpen(true)}
          />
        </View>

        {progress.isLoading ? (
          <ActivityIndicator style={styles.loading} />
        ) : progress.error ? (
          <ThemedText type="small" themeColor="danger">
            {progress.error}
          </ThemedText>
        ) : (
          <>
            <View style={styles.section}>
              <SectionLabel action={{ label: 'Planner', onPress: () => router.push('/planner') }}>
                This week
              </SectionLabel>
              <ThisWeekCard
                todayKey={todayKey}
                goal={progress.weekGoal}
                activeDays={progress.activeDays}
                activeDaysGoal={progress.settings.movementGoalDays}
                days={progress.week}
                consistency={progress.consistency}
                onOpenDay={() => router.push('/planner')}
                onOpenWorkout={(sessionId) => router.push(`/session/${sessionId}`)}
              />
            </View>

            <StrengthCard lifts={progress.lifts} todayKey={todayKey} />

            <BodyWeightCard
              entries={progress.weights}
              goalWeightLbs={progress.settings.goalWeightLbs}
              todayKey={todayKey}
              onLog={progress.logWeight}
            />

            <View style={styles.section}>
              <SectionLabel>Milestones</SectionLabel>
              <MilestonesRow milestones={progress.milestones} />
            </View>
          </>
        )}
      </Screen>

      <SheetHost visible={goalsOpen} onClose={() => setGoalsOpen(false)} testID="goals-sheet">
        {/* Mounted per opening, so it starts from the saved goals each time. */}
        {goalsOpen ? <GoalsPanel settings={progress.settings} onSave={saveGoals} /> : null}
      </SheetHost>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  titles: {
    flex: 1,
    gap: 2,
  },
  section: {
    gap: 8,
  },
  loading: {
    marginTop: 32,
  },
});
