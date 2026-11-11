import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { ChevronDownIcon, PlusIcon, SlidersHorizontalIcon } from '@/components/ui/icons';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CatalogExercise } from '@/lib/exercise-catalog';
import { maybeSubtitle, type SessionExercise } from '@/lib/session/session-model';
import type { SetLog } from '@/types/workout';

type MaybeSectionProps = {
  items: readonly SessionExercise[];
  /** Most recent past sets for an exercise id, for "Last …". */
  lastTimeSets: (exerciseId: string) => readonly SetLog[] | undefined;
  canAdd: boolean;
  onDoIt: (lineId: string) => void;
  onOpenDetails: (lineId: string) => void;
  onAddMaybe: () => void;
};

/**
 * Exercises you might get to. They sit apart from the plan, never count as
 * missed, and "Do it" moves one into the plan when you're ready.
 */
export function MaybeSection({
  items,
  lastTimeSets,
  canAdd,
  onDoIt,
  onOpenDetails,
  onAddMaybe,
}: MaybeSectionProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(true);

  return (
    <View style={styles.section}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`Maybe, ${items.length}. ${open ? 'Hide' : 'Show'} maybes`}
        onPress={() => setOpen((value) => !value)}
        style={styles.heading}>
        <View style={styles.headingText}>
          <ThemedText type="overline">Maybe · {items.length}</ThemedText>
          <ThemedText type="caption">If there&apos;s time. Skipping is fine.</ThemedText>
        </View>
        <View style={open && styles.flipped}>
          <ChevronDownIcon size={16} color={theme.textSecondary} strokeWidth={2} />
        </View>
      </Pressable>

      {open ? (
        <>
          {items.map((item) => (
            <View
              key={item.lineId}
              style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.borderStrong }]}>
              <View style={styles.text}>
                <ThemedText type="label" numberOfLines={1}>
                  {item.exercise.name}
                </ThemedText>
                <ThemedText type="caption" numberOfLines={1}>
                  {maybeSubtitle(item, lastTimeSets(item.exercise.id))}
                </ThemedText>
              </View>
              <Button
                label="Do it"
                accessibilityLabel={`Do it: move ${item.exercise.name} into the plan`}
                variant="secondary"
                size="sm"
                onPress={() => onDoIt(item.lineId)}
              />
              <IconButton
                icon={SlidersHorizontalIcon}
                accessibilityLabel={`Details for ${item.exercise.name}`}
                variant="plain"
                size={36}
                onPress={() => onOpenDetails(item.lineId)}
              />
            </View>
          ))}
          {canAdd ? <AddMaybeButton onPress={onAddMaybe} /> : null}
        </>
      ) : null}
    </View>
  );
}

/** Also used on its own, more quietly, when there are no maybes yet. */
export function AddMaybeButton({ onPress, quiet = false }: { onPress: () => void; quiet?: boolean }) {
  return (
    <Button
      label="Add a maybe"
      icon={PlusIcon}
      variant={quiet ? 'ghost' : 'dashed'}
      onPress={onPress}
      style={quiet ? styles.quiet : undefined}
    />
  );
}

type AlternateChipsProps = {
  /** The exercise in the slot now, for screen-reader labels. */
  currentName: string;
  alternates: readonly CatalogExercise[];
  onSwap: (exercise: CatalogExercise) => void;
};

/** "or Pec deck · Dumbbell fly": one tap swaps when the machine is taken. */
export function AlternateChips({ currentName, alternates, onSwap }: AlternateChipsProps) {
  const theme = useTheme();

  if (alternates.length === 0) return null;

  return (
    <View style={styles.alternates}>
      <ThemedText type="caption" accessibilityElementsHidden>
        or
      </ThemedText>
      {alternates.map((exercise) => (
        <Pressable
          key={exercise.id}
          accessibilityRole="button"
          accessibilityLabel={`Swap ${currentName} for ${exercise.name}`}
          hitSlop={6}
          onPress={() => onSwap(exercise)}
          style={({ pressed }) => [
            styles.alternate,
            { backgroundColor: theme.surface, borderColor: theme.border },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="caption" themeColor="textBody">
            {exercise.name}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 8,
  },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: 44,
  },
  headingText: {
    flex: 1,
    gap: 2,
  },
  flipped: {
    transform: [{ rotate: '180deg' }],
  },
  row: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderStyle: 'dashed',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 56,
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 8,
  },
  text: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  quiet: {
    alignSelf: 'center',
  },
  alternates: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingLeft: 12,
    paddingTop: 6,
  },
  alternate: {
    borderRadius: Radius.full,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  pressed: {
    opacity: 0.7,
  },
});
