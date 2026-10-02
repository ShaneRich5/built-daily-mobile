import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { ExerciseCatalogList } from '@/components/exercise-catalog-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { metricLabel, searchCatalog, type CatalogExercise } from '@/lib/exercise-catalog';
import { newCustomExerciseId } from '@/services/ids';
import type { ExerciseMetric } from '@/types/workout';

const METRICS: readonly ExerciseMetric[] = [
  'weight_reps',
  'bodyweight_reps',
  'duration',
  'cardio',
];

type ExercisePickerDialogProps = {
  onCancel: () => void;
  onPick: (exercise: CatalogExercise) => void;
};

/**
 * Choosing the next exercise, over the workout rather than away from it: the
 * editor behind this dialog is holding sets that have not been saved, so
 * picking cannot be a screen you navigate to.
 */
export function ExercisePickerDialog({ onCancel, onPick }: ExercisePickerDialogProps) {
  const [query, setQuery] = useState('');
  const [customMetric, setCustomMetric] = useState<ExerciseMetric>('weight_reps');

  const typed = query.trim();

  // Only offered once the catalog has been given a chance to answer, and never
  // as a duplicate of a name it already has.
  const canAddCustom =
    typed.length > 0 &&
    !searchCatalog(typed).some((exercise) => exercise.name.toLowerCase() === typed.toLowerCase());

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel="Close">
        {/* Swallows taps so they do not reach the backdrop underneath. */}
        <Pressable style={styles.sheetWrapper} onPress={() => {}}>
          <ThemedView style={styles.sheet}>
            <View style={styles.header}>
              <ThemedText type="smallBold">Add an exercise</ThemedText>
              <ActionButton label="Cancel" variant="secondary" onPress={onCancel} />
            </View>

            <ExerciseCatalogList
              query={query}
              onChangeQuery={setQuery}
              onSelect={onPick}
              footer={
                canAddCustom ? (
                  <CustomExercise
                    name={typed}
                    metric={customMetric}
                    onChangeMetric={setCustomMetric}
                    onAdd={() =>
                      onPick({ id: newCustomExerciseId(), name: typed, metric: customMetric })
                    }
                  />
                ) : null
              }
            />
          </ThemedView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * The escape hatch for a move the catalog does not have. The metric has to be
 * chosen here because nothing downstream can infer it: it decides which boxes
 * the set rows show, and no screen lets a line change it afterwards.
 */
function CustomExercise({
  name,
  metric,
  onChangeMetric,
  onAdd,
}: {
  name: string;
  metric: ExerciseMetric;
  onChangeMetric: (metric: ExerciseMetric) => void;
  onAdd: () => void;
}) {
  return (
    <View style={styles.custom}>
      <ThemedText type="small" themeColor="textSecondary">
        Not in the catalog? Add it as your own.
      </ThemedText>

      <View style={styles.metrics}>
        {METRICS.map((option) => (
          <MetricChip
            key={option}
            metric={option}
            selected={option === metric}
            onPress={() => onChangeMetric(option)}
          />
        ))}
      </View>

      <ActionButton label={`Add “${name}”`} onPress={onAdd} />
    </View>
  );
}

function MetricChip({
  metric,
  selected,
  onPress,
}: {
  metric: ExerciseMetric;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={metricLabel(metric)}
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement },
      ]}>
      <ThemedText type="small" themeColor={selected ? 'text' : 'textSecondary'}>
        {metricLabel(metric)}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetWrapper: {
    height: '90%',
  },
  sheet: {
    borderTopLeftRadius: Spacing.three,
    borderTopRightRadius: Spacing.three,
    flex: 1,
    paddingTop: Spacing.three,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
  },
  custom: {
    gap: Spacing.two,
    paddingTop: Spacing.four,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
});
