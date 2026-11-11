import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Chips } from '@/components/ui/chips';
import { SheetFrame } from '@/components/ui/sheet';
import { FontFamily } from '@/constants/theme';
import { parseWeight } from '@/lib/body-weight';
import {
  MOVEMENT_GOAL_OPTIONS,
  type MovementGoalTarget,
  type ProgressSettings,
  WEEKLY_GOAL_OPTIONS,
  type WeeklyGoalTarget,
} from '@/types/progress';

type GoalsPanelProps = {
  settings: ProgressSettings;
  /** Resolves to whether it saved; the panel stays open, as typed, when not. */
  onSave: (settings: ProgressSettings) => Promise<boolean>;
};

const optionLabel = (n: number) => (n === 7 ? 'Daily' : String(n));

/** Chips read "2 … Daily"; screen readers hear what each one means. */
const options = (values: readonly number[], unit: string, daily: string) =>
  values.map((n) => ({
    id: String(n),
    label: optionLabel(n),
    accessibilityLabel: n === 7 ? daily : `${n} ${unit} a week`,
  }));

/** Workouts a week, active days a week and an optional goal weight, in one place. */
export function GoalsPanel({ settings, onSave }: GoalsPanelProps) {
  const [weeklyGoal, setWeeklyGoal] = useState<WeeklyGoalTarget>(settings.weeklyGoal);
  const [movementGoalDays, setMovementGoalDays] = useState<MovementGoalTarget>(settings.movementGoalDays);
  const [goalWeight, setGoalWeight] = useState(
    settings.goalWeightLbs !== null ? String(settings.goalWeightLbs) : '',
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const blank = goalWeight.trim() === '';
    const weight = blank ? null : parseWeight(goalWeight);
    if (!blank && weight === null) {
      setError('Enter a goal weight in pounds, or leave it blank.');
      return;
    }

    setSaving(true);
    setError(null);
    const saved = await onSave({ weeklyGoal, movementGoalDays, goalWeightLbs: weight });
    setSaving(false);
    if (!saved) setError('Could not save. Check your connection and try again.');
  };

  return (
    <SheetFrame
      title="Goals"
      subtitle="Pick what feels doable. You can change these any time."
      footer={<Button label="Save goals" size="lg" onPress={() => void save()} busy={saving} />}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <ThemedText type="labelStrong" accessibilityRole="header">
            Workouts per week
          </ThemedText>
          <Chips
            fill
            options={options(WEEKLY_GOAL_OPTIONS, 'workouts', 'A workout every day')}
            selected={[String(weeklyGoal)]}
            onPress={(id) => setWeeklyGoal(Number(id) as WeeklyGoalTarget)}
          />
          <ThemedText type="caption">Your streak counts the weeks that hit this. Groups see it too.</ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText type="labelStrong" accessibilityRole="header">
            Active days per week
          </ThemedText>
          <Chips
            fill
            options={options(MOVEMENT_GOAL_OPTIONS, 'active days', 'Active every day')}
            selected={[String(movementGoalDays)]}
            onPress={(id) => setMovementGoalDays(Number(id) as MovementGoalTarget)}
          />
          <ThemedText type="caption">
            Walks, rides and sports count. Doesn’t change your workout goal.
          </ThemedText>
        </View>

        <FormField
          label="Goal weight (optional, lb)"
          value={goalWeight}
          onChangeText={(text) => {
            setGoalWeight(text);
            if (error) setError(null);
          }}
          keyboardType="decimal-pad"
          placeholder="Leave blank for none"
          error={error}
          style={styles.mono}
        />
      </ScrollView>
    </SheetFrame>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 22,
    paddingBottom: 8,
  },
  section: {
    gap: 8,
  },
  mono: {
    fontFamily: FontFamily.mono,
  },
});
