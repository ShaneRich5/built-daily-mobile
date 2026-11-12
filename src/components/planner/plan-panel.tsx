import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { SectionLabel } from '@/components/ui/section-label';
import { SheetFrame } from '@/components/ui/sheet';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addDays, shortDayLabel } from '@/lib/date-keys';
import { STARTER_TEMPLATES } from '@/lib/starter-templates';
import type { NewScheduledWorkout } from '@/services/firestore/planner-mappers';
import type { WorkoutPlan } from '@/types/workout';

type Choice = {
  id: string;
  name: string;
  meta: string;
  entry: Omit<NewScheduledWorkout, 'dateKey'>;
};

type PlanPanelProps = {
  todayKey: string;
  /** The day the + was tapped on, if any; otherwise today. */
  initialDateKey: string | null;
  plans: readonly WorkoutPlan[];
  busy: boolean;
  error: string | null;
  onPlan: (entry: NewScheduledWorkout) => void;
};

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** Pencil a workout in: when (a day, or no day yet), and what. */
export function PlanPanel({ todayKey, initialDateKey, plans, busy, error, onPlan }: PlanPanelProps) {
  const theme = useTheme();

  const dayOptions = [
    ...new Set([todayKey, addDays(todayKey, 1), ...(initialDateKey ? [initialDateKey] : [])]),
  ].sort();
  const [dateKey, setDateKey] = useState<string | null>(initialDateKey ?? todayKey);

  const choices: Choice[] = [
    ...plans
      .filter((plan) => plan.lines.length > 0)
      .map((plan) => ({
        id: plan.id,
        name: plan.name || 'Untitled template',
        meta: `Your template · ${plural(plan.lines.length, 'exercise')}`,
        entry: {
          label: plan.name || 'Workout',
          planId: plan.id,
          exerciseIds: plan.lines.map((line) => line.exerciseId),
        },
      })),
    ...STARTER_TEMPLATES.map((starter) => ({
      id: starter.id,
      name: starter.name,
      meta: `Starter · ${plural(starter.exerciseIds.length, 'exercise')}`,
      entry: { label: starter.name, planId: starter.id, exerciseIds: [...starter.exerciseIds] },
    })),
    {
      id: 'reminder',
      name: 'Just a reminder',
      meta: 'No exercises — decide on the day',
      entry: { label: 'Workout', planId: null, exerciseIds: [] },
    },
  ];
  const [choiceId, setChoiceId] = useState(choices[0].id);
  const choice = choices.find((candidate) => candidate.id === choiceId) ?? choices[0];

  const dayName = (key: string) =>
    key === todayKey ? 'Today' : key === addDays(todayKey, 1) ? 'Tomorrow' : shortDayLabel(key);

  const confirm =
    dateKey === null
      ? `Add ${choice.name} to Unscheduled`
      : `Plan ${choice.name} for ${dateKey === todayKey ? 'today' : dayName(dateKey)}`;

  return (
    <SheetFrame
      fill
      title="Plan a workout"
      footer={
        <>
          {error ? (
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          ) : null}
          <Button
            label={confirm}
            size="lg"
            busy={busy}
            onPress={() => onPlan({ ...choice.entry, dateKey })}
          />
        </>
      }>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <SectionLabel>When</SectionLabel>
          <View style={styles.chips}>
            {[...dayOptions, null].map((key) => {
              const selected = key === dateKey;

              return (
                <Pressable
                  key={key ?? 'none'}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  hitSlop={{ top: 2, bottom: 2 }}
                  onPress={() => setDateKey(key)}
                  style={[
                    styles.chip,
                    selected
                      ? { backgroundColor: theme.inverse, borderColor: theme.inverse }
                      : { backgroundColor: theme.surface, borderColor: theme.border },
                  ]}>
                  <ThemedText
                    type="link"
                    style={{ color: selected ? theme.onInverse : theme.textBody }}>
                    {key === null ? 'No day yet' : dayName(key)}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <SectionLabel>What</SectionLabel>
          <View style={[styles.list, { borderColor: theme.border }]}>
            {choices.map((candidate) => {
              const selected = candidate.id === choice.id;

              return (
                <Pressable
                  key={candidate.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={`${candidate.name}, ${candidate.meta}`}
                  onPress={() => setChoiceId(candidate.id)}
                  style={[
                    styles.option,
                    { borderBottomColor: theme.borderSubtle },
                    selected && { backgroundColor: theme.selectedRow },
                  ]}>
                  <View
                    style={[
                      styles.radio,
                      selected
                        ? { borderColor: theme.tint, borderWidth: 6 }
                        : { borderColor: theme.borderStrong, borderWidth: 1.5 },
                    ]}
                  />
                  <View style={styles.optionText}>
                    <ThemedText type="label">{candidate.name}</ThemedText>
                    <ThemedText type="caption">{candidate.meta}</ThemedText>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SheetFrame>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingBottom: 16,
  },
  section: {
    gap: 8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderRadius: Radius.full,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  list: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  option: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  radio: {
    borderRadius: Radius.full,
    height: 20,
    width: 20,
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
});
