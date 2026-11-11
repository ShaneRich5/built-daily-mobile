import { Pressable, StyleSheet, View } from 'react-native';

import { ExerciseStatusIcon } from '@/components/session/exercise-status-icon';
import { QuickSetRow, SetColumnHeader } from '@/components/session/set-inputs';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  ArrowRightIcon,
  ChevronDownIcon,
  CopyIcon,
  PlusIcon,
  SlidersHorizontalIcon,
} from '@/components/ui/icons';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  cardSubtitle,
  exerciseProgress,
  type SessionExercise,
} from '@/lib/session/session-model';
import { quickFieldsForMetric, suggestionForSet, type SetRow } from '@/lib/session/set-row';
import type { SetLog } from '@/types/workout';

export type ExerciseCardProps = {
  item: SessionExercise;
  open: boolean;
  /** Sets from the most recent past workout with this exercise. */
  lastTimeSets?: readonly SetLog[];
  /** Another exercise still has sets left — offers "Next exercise" once this one is done. */
  hasNextExercise: boolean;
  /**
   * Given when editing a finished workout: there is nothing to tick off, so
   * each set row ends in a remove button, and the status ring and "Next
   * exercise" are left out.
   */
  onRemoveSet?: (setIndex: number) => void;
  onToggleOpen: () => void;
  onOpenDetails: () => void;
  onUpdateSet: (setIndex: number, patch: Partial<SetRow>) => void;
  onToggleSetDone: (setIndex: number, suggestion: SetRow | null) => void;
  onAddSet: () => void;
  onCopyLastSet: () => void;
  onNextExercise: () => void;
};

/** One exercise: a one-line row when closed, the quick set logger when open. */
export function ExerciseCard({
  item,
  open,
  lastTimeSets,
  hasNextExercise,
  onRemoveSet,
  onToggleOpen,
  onOpenDetails,
  onUpdateSet,
  onToggleSetDone,
  onAddSet,
  onCopyLastSet,
  onNextExercise,
}: ExerciseCardProps) {
  const theme = useTheme();
  const showProgress = !onRemoveSet;
  const { exercise, sets } = item;
  const progress = exerciseProgress(sets);
  const subtitle = cardSubtitle(item, open, lastTimeSets);

  const heading = (
    <>
      {showProgress ? <ExerciseStatusIcon progress={progress} /> : null}
      <View style={styles.text}>
        <ThemedText type={open ? 'labelStrong' : 'label'} numberOfLines={1}>
          {exercise.name}
        </ThemedText>
        <ThemedText type="caption" numberOfLines={1}>
          {subtitle}
        </ThemedText>
      </View>
    </>
  );

  if (!open) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: false }}
        accessibilityLabel={`${exercise.name}, ${subtitle}`}
        onPress={onToggleOpen}
        style={({ pressed }) => [
          styles.closed,
          { backgroundColor: theme.surface, borderColor: theme.border },
          pressed && styles.pressed,
        ]}>
        {heading}
        <ChevronDownIcon size={16} color={theme.textFaint} strokeWidth={2} />
      </Pressable>
    );
  }

  const fields = quickFieldsForMetric(exercise.metric);

  return (
    <Card variant="emphasis" padded={false} accessibilityLabel={exercise.name}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: true }}
          accessibilityLabel={`Collapse ${exercise.name}`}
          onPress={onToggleOpen}
          style={styles.collapse}>
          {heading}
        </Pressable>
        <Button
          label="Details"
          accessibilityLabel={`Details for ${exercise.name}`}
          icon={SlidersHorizontalIcon}
          variant="secondary"
          onPress={onOpenDetails}
          style={styles.details}
        />
      </View>

      <View style={styles.body}>
        <SetColumnHeader fields={fields} />

        {sets.map((set, setIndex) => {
          const suggestion = suggestionForSet(sets, setIndex, lastTimeSets);

          return (
            // Sets have no id of their own; their position is the identity.
            <QuickSetRow
              key={setIndex}
              setNumber={setIndex + 1}
              set={set}
              fields={fields}
              suggestion={suggestion}
              onChange={(patch) => onUpdateSet(setIndex, patch)}
              onToggleDone={() => onToggleSetDone(setIndex, suggestion)}
              onRemove={onRemoveSet ? () => onRemoveSet(setIndex) : undefined}
            />
          );
        })}

        <View style={styles.actions}>
          <Button
            label="Add set"
            icon={PlusIcon}
            variant="dashed"
            onPress={onAddSet}
            style={styles.action}
          />
          <Button
            label="Copy last set"
            icon={CopyIcon}
            variant="dashed"
            onPress={onCopyLastSet}
            style={styles.action}
          />
        </View>

        {showProgress && progress === 'done' && hasNextExercise ? (
          <Button
            label="Next exercise"
            icon={ArrowRightIcon}
            variant="dark"
            onPress={onNextExercise}
          />
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  closed: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 56,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  text: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 8,
    paddingLeft: 12,
    paddingRight: 8,
    paddingTop: 8,
  },
  collapse: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 44,
    minWidth: 0,
  },
  details: {
    paddingHorizontal: 12,
  },
  body: {
    gap: 6,
    paddingBottom: 12,
    paddingHorizontal: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 4,
  },
  action: {
    flex: 1,
    paddingHorizontal: 8,
  },
  pressed: {
    opacity: 0.7,
  },
});
