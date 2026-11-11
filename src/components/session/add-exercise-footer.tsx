import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { PlusIcon } from '@/components/ui/icons';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CatalogExercise } from '@/lib/exercise-catalog';
import { MAX_SESSION_EXERCISES } from '@/lib/session/session-model';

type AddExerciseFooterProps = {
  /** Past-workout picks for "Usually next" (may be empty). */
  suggestions: readonly CatalogExercise[];
  /** No exercises yet, so the picks are what you usually open with. */
  isFirst: boolean;
  atLimit: boolean;
  onOpenSearch: () => void;
  onAddSuggestion: (exercise: CatalogExercise) => void;
};

/** Sits under the last exercise: new ones land here, in the order you do them. */
export function AddExerciseFooter({
  suggestions,
  isFirst,
  atLimit,
  onOpenSearch,
  onAddSuggestion,
}: AddExerciseFooterProps) {
  const theme = useTheme();

  if (atLimit) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        That&apos;s the {MAX_SESSION_EXERCISES}-exercise limit for one workout.
      </ThemedText>
    );
  }

  return (
    <View style={styles.footer}>
      <Button
        label="Add exercise"
        icon={PlusIcon}
        variant="dashed"
        size="lg"
        onPress={onOpenSearch}
      />

      {suggestions.length > 0 ? (
        <View style={styles.chips}>
          <ThemedText type="caption">
            {isFirst ? 'You usually start with:' : 'Usually next:'}
          </ThemedText>
          {suggestions.map((exercise) => (
            <Pressable
              key={exercise.id}
              accessibilityRole="button"
              accessibilityLabel={`Add ${exercise.name}`}
              // The chip is 32px tall; the slop brings the target to 44.
              hitSlop={6}
              onPress={() => onAddSuggestion(exercise)}
              style={({ pressed }) => [
                styles.chip,
                { backgroundColor: theme.surface, borderColor: theme.border },
                pressed && styles.pressed,
              ]}>
              <PlusIcon size={12} color={theme.textBody} strokeWidth={2} />
              <ThemedText type="caption" themeColor="textBody">
                {exercise.name}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    gap: 10,
  },
  chips: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    alignItems: 'center',
    borderRadius: Radius.full,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    height: 32,
    paddingHorizontal: 10,
  },
  pressed: {
    opacity: 0.7,
  },
});
