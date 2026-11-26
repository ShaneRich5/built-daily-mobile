import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { Segmented } from '@/components/ui/segmented';
import { SheetFrame } from '@/components/ui/sheet';
import { useTheme } from '@/hooks/use-theme';
import {
  type LeftoverChoice,
  leftoverHelpText,
  type NextPlannedDay,
} from '@/lib/session/leftovers';
import type { SessionExercise } from '@/lib/session/session-model';

type FinishLeftoversPanelProps = {
  workoutTitle: string;
  /** "3 exercises · 11 sets" for what was done. */
  summary: string;
  items: readonly SessionExercise[];
  /** "loading" while the next planned day is looked up. */
  next: NextPlannedDay | null | 'loading';
  choices: Record<string, LeftoverChoice>;
  onChoose: (lineId: string, choice: LeftoverChoice) => void;
  finishing: boolean;
  onFinish: () => void;
  onKeepGoing: () => void;
};

/** E3: done, and here is what you didn't get to. Next time, Later or Drop for each. */
export function FinishLeftoversPanel({
  workoutTitle,
  summary,
  items,
  next,
  choices,
  onChoose,
  finishing,
  onFinish,
  onKeepGoing,
}: FinishLeftoversPanelProps) {
  const theme = useTheme();
  const loading = next === 'loading';
  const nextDay = loading ? null : next;
  const options: { value: LeftoverChoice; label: string }[] = [
    ...(nextDay ? [{ value: 'next' as const, label: 'Next time' }] : []),
    { value: 'later', label: 'Later' },
    { value: 'drop', label: 'Drop' },
  ];

  return (
    <SheetFrame
      title={`Nice work. ${workoutTitle}’s in.`}
      subtitle={summary}
      fill
      footer={
        <View style={styles.footer}>
          <Button
            label="Finish workout"
            size="lg"
            busy={finishing}
            disabled={loading}
            onPress={onFinish}
          />
          <Button label="Keep going" variant="ghost" size="sm" onPress={onKeepGoing} />
        </View>
      }>
      <ScrollView contentContainerStyle={styles.body}>
        <ThemedText type="overline" themeColor="textSecondary">
          You didn’t get to these
        </ThemedText>
        {loading ? <ActivityIndicator /> : null}
        {items.map((item) => (
          <View
            key={item.lineId}
            style={[styles.row, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <View style={styles.rowTitle}>
              <ThemedText type="label" numberOfLines={1} style={styles.flex}>
                {item.exercise.name}
              </ThemedText>
              <Pill label={item.section === 'maybe' ? 'Maybe' : 'Plan'} tone="neutral" />
            </View>
            {loading ? null : (
              <Segmented
                options={options}
                value={choices[item.lineId] ?? 'drop'}
                onChange={(choice) => onChoose(item.lineId, choice)}
                accessibilityLabel={`What to do with ${item.exercise.name}`}
              />
            )}
          </View>
        ))}
        <ThemedText type="caption" themeColor="textSecondary">
          {leftoverHelpText(nextDay)}
        </ThemedText>
      </ScrollView>
    </SheetFrame>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: 10,
    paddingBottom: 12,
  },
  row: {
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  rowTitle: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  flex: {
    flex: 1,
  },
  footer: {
    alignItems: 'center',
    gap: 4,
  },
});
