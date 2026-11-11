import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Chips } from '@/components/ui/chips';
import { Screen } from '@/components/ui/screen';
import { useSession } from '@/contexts/session';
import { dateKey } from '@/lib/date-keys';
import {
  goalLabel,
  onboardingDayLabel,
  onboardingEntries,
  remainingDaysThisWeek,
  toggleDay,
} from '@/lib/onboarding';
import { STARTER_TEMPLATES } from '@/lib/starter-templates';
import { getProgressSettings } from '@/services/firestore/home-repository';
import {
  addScheduledWorkout,
  saveProgressSettings,
} from '@/services/firestore/planner-repository';
import { completeOnboarding } from '@/services/firestore/user-profile-repository';
import { WEEKLY_GOAL_OPTIONS, type WeeklyGoalTarget } from '@/types/progress';

type Step = 'goal' | 'days' | 'workouts';

const STEPS: readonly Step[] = ['goal', 'days', 'workouts'];

/**
 * The first-run flow, once per account on either app: a weekly goal, the days
 * left this week, and a starter workout for each. Every step can be skipped.
 */
export function OnboardingScreen() {
  const { user } = useSession();
  const insets = useSafeAreaInsets();
  const [todayKey] = useState(() => dateKey(new Date()));
  const [step, setStep] = useState<Step>('goal');
  const [goal, setGoal] = useState<WeeklyGoalTarget>(3);
  const [days, setDays] = useState<string[]>([]);
  const [starterByDay, setStarterByDay] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = remainingDaysThisWeek(todayKey);
  const maxDays = Math.min(goal, remaining.length);
  const stepIndex = STEPS.indexOf(step);

  const finish = async (withPlan: boolean) => {
    if (!user) return;

    setSaving(true);
    setError(null);
    try {
      if (withPlan) {
        // The rest of the settings are read first so a goal weight set on the
        // web is not overwritten with the default.
        const current = await getProgressSettings(user.uid);
        await saveProgressSettings(user.uid, { ...current, weeklyGoal: goal });

        for (const entry of onboardingEntries(days, starterByDay)) {
          await addScheduledWorkout(user.uid, entry);
        }
      }

      await completeOnboarding(user);
      router.replace('/');
    } catch {
      setError('Could not save that. Check your connection and try again.');
      setSaving(false);
    }
  };

  return (
    <Screen
      edges={['top']}
      footer={
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {error ? (
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          ) : null}
          <View style={styles.row}>
            {stepIndex > 0 ? (
              <Button
                label="Back"
                variant="secondary"
                disabled={saving}
                onPress={() => setStep(STEPS[stepIndex - 1])}
              />
            ) : null}
            <Button
              label={step === 'workouts' ? 'Finish' : 'Next'}
              size="lg"
              busy={saving}
              onPress={() => (step === 'workouts' ? void finish(true) : setStep(STEPS[stepIndex + 1]))}
              style={styles.flex}
            />
          </View>
          <Button
            label="Skip for now"
            variant="ghost"
            size="sm"
            disabled={saving}
            onPress={() => void finish(false)}
            style={styles.skip}
          />
        </View>
      }>
      <View style={styles.heading}>
        <ThemedText type="overline">Step {stepIndex + 1} of 3</ThemedText>
        <ThemedText type="title" accessibilityRole="header">
          Let&apos;s plan your first week
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Takes a minute. You can skip and do this later.
        </ThemedText>
      </View>

      {step === 'goal' ? (
        <View style={styles.section}>
          <ThemedText type="heading">How many workouts a week?</ThemedText>
          <ThemedText type="small" themeColor="textMuted">
            Consistency matters more than volume. Pick something you can actually keep up.
          </ThemedText>
          <Chips
            options={WEEKLY_GOAL_OPTIONS.map((n) => ({ id: String(n), label: goalLabel(n) }))}
            selected={[String(goal)]}
            onPress={(id) => setGoal(Number(id) as WeeklyGoalTarget)}
          />
        </View>
      ) : null}

      {step === 'days' ? (
        <View style={styles.section}>
          <ThemedText type="heading">Which days this week?</ThemedText>
          <ThemedText type="small" themeColor="textMuted">
            Pick up to {maxDays} day{maxDays === 1 ? '' : 's'}. You can move any of them later from
            the planner.
          </ThemedText>
          <Chips
            options={remaining.map((key) => ({ id: key, label: onboardingDayLabel(key, todayKey) }))}
            selected={days}
            multi
            onPress={(key) => setDays((current) => toggleDay(current, key, maxDays))}
          />
          <ThemedText type="caption">
            {days.length} / {maxDays} picked. Leave them all unpicked if you&apos;d rather plan later.
          </ThemedText>
        </View>
      ) : null}

      {step === 'workouts' ? (
        <View style={styles.section}>
          <ThemedText type="heading">Pick a workout for each day</ThemedText>
          <ThemedText type="small" themeColor="textMuted">
            Starter templates. Swap exercises any time from the workout screen.
          </ThemedText>
          {days.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              No days picked. Finish to save your goal, and plan days later from the planner.
            </ThemedText>
          ) : (
            days.map((key) => (
              <View key={key} style={styles.day}>
                <ThemedText type="labelStrong">{onboardingDayLabel(key, todayKey)}</ThemedText>
                <Chips
                  options={STARTER_TEMPLATES.map((starter) => ({ id: starter.id, label: starter.name }))}
                  selected={starterByDay[key] ? [starterByDay[key]] : []}
                  onPress={(id) => setStarterByDay((current) => ({ ...current, [key]: id }))}
                />
              </View>
            ))
          )}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    gap: 4,
  },
  section: {
    gap: 10,
  },
  day: {
    gap: 8,
  },
  footer: {
    gap: 4,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  flex: {
    flex: 1,
  },
  skip: {
    alignSelf: 'center',
  },
});
