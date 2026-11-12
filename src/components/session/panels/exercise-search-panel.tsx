import { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ActionRow } from '@/components/ui/action-row';
import { Button } from '@/components/ui/button';
import { CheckIcon, PlusIcon, SearchIcon } from '@/components/ui/icons';
import { Segmented } from '@/components/ui/segmented';
import { SheetFrame } from '@/components/ui/sheet';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type CatalogExercise, metricLabel } from '@/lib/exercise-catalog';
import {
  canAddCustomExercise,
  type ExerciseFilter,
  exerciseFilters,
  exerciseMeta,
  exerciseSearchResults,
  initialExerciseFilter,
} from '@/lib/session/exercise-search';
import { newCustomExerciseId } from '@/services/ids';
import type { ExerciseMetric } from '@/types/workout';

export type ExerciseSearchMode =
  /** Pick several; they are added in the order tapped. `room` is how many more fit. */
  | { kind: 'add'; afterName: string | null; room: number }
  /** Pick one; it replaces `currentName` straight away. */
  | { kind: 'replace'; currentName: string };

type ExerciseSearchPanelProps = {
  mode: ExerciseSearchMode;
  suggested: readonly CatalogExercise[];
  recent: readonly CatalogExercise[];
  onAdd: (exercises: CatalogExercise[]) => void;
  onReplace: (exercise: CatalogExercise) => void;
};

const CUSTOM_METRICS: readonly { value: ExerciseMetric; label: string }[] = [
  { value: 'weight_reps', label: metricLabel('weight_reps') },
  { value: 'bodyweight_reps', label: metricLabel('bodyweight_reps') },
  { value: 'duration', label: metricLabel('duration') },
  { value: 'cardio', label: metricLabel('cardio') },
];

/**
 * Search the catalog and pick several exercises at once (numbered in the order
 * tapped), or pick one replacement. Mount it fresh for each opening — its
 * search and picks are local state and should not survive a close.
 */
export function ExerciseSearchPanel({
  mode,
  suggested,
  recent,
  onAdd,
  onReplace,
}: ExerciseSearchPanelProps) {
  const theme = useTheme();
  const isReplace = mode.kind === 'replace';
  const room = mode.kind === 'add' ? mode.room : 1;

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ExerciseFilter>(() =>
    initialExerciseFilter(suggested, recent),
  );
  const [picked, setPicked] = useState<CatalogExercise[]>([]);
  const [customMetric, setCustomMetric] = useState<ExerciseMetric>('weight_reps');

  const results = exerciseSearchResults({ query, filter, suggested, recent });
  const customName = query.trim();
  const offerCustom = canAddCustomExercise(query);

  const handleTap = (exercise: CatalogExercise) => {
    if (isReplace) {
      onReplace(exercise);
      return;
    }

    setPicked((current) => {
      if (current.some((other) => other.id === exercise.id)) {
        return current.filter((other) => other.id !== exercise.id);
      }
      return current.length < room ? [...current, exercise] : current;
    });
  };

  const addCustom = () => {
    const custom: CatalogExercise = {
      id: newCustomExerciseId(),
      name: customName,
      metric: customMetric,
    };

    if (isReplace) {
      onReplace(custom);
      return;
    }

    if (picked.length >= room) return;
    setPicked((current) => [...current, custom]);
    setQuery('');
  };

  const subtitle = isReplace
    ? `Pick a replacement for ${mode.currentName}`
    : mode.afterName
      ? `Added after ${mode.afterName}, in the order you pick`
      : 'Added in the order you pick';

  return (
    <SheetFrame
      fill
      flush
      title={isReplace ? 'Change exercise' : 'Add exercises'}
      subtitle={subtitle}
      footer={
        isReplace ? undefined : (
          <Button
            label={
              picked.length === 0
                ? 'Pick exercises to add'
                : `Add ${picked.length} exercise${picked.length === 1 ? '' : 's'}`
            }
            variant="dark"
            size="lg"
            disabled={picked.length === 0}
            onPress={() => onAdd(picked)}
          />
        )
      }>
      <View style={styles.controls}>
        <View
          style={[
            styles.search,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}>
          <SearchIcon size={16} color={theme.textSecondary} strokeWidth={2} />
          <TextInput
            accessibilityLabel="Search exercises"
            value={query}
            onChangeText={setQuery}
            placeholder="Search leg press, lat pulldown, cable…"
            placeholderTextColor={theme.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="search"
            style={[styles.searchInput, { color: theme.text }]}
          />
        </View>
      </View>

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.filters}>
          {exerciseFilters(suggested, recent).map((option) => {
            const active = option.id === filter;

            return (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                hitSlop={{ top: 6, bottom: 6 }}
                onPress={() => setFilter(option.id)}
                style={[
                  styles.filter,
                  active
                    ? { backgroundColor: theme.inverse, borderColor: theme.inverse }
                    : { backgroundColor: theme.surface, borderColor: theme.border },
                ]}>
                <ThemedText type="link" style={{ color: active ? theme.onInverse : theme.textBody }}>
                  {option.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={results}
        keyExtractor={(exercise) => exercise.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        renderItem={({ item: exercise }) => {
          const index = picked.findIndex((other) => other.id === exercise.id);
          const isPicked = index >= 0;

          return (
            <ActionRow
              label={exercise.name}
              detail={exerciseMeta(exercise)}
              selected={isPicked}
              accessibilityLabel={
                isReplace
                  ? `Use ${exercise.name}`
                  : `${exercise.name}${isPicked ? `, picked, number ${index + 1}` : ''}`
              }
              onPress={() => handleTap(exercise)}
              leading={
                isReplace ? undefined : (
                  <View
                    style={[
                      styles.ring,
                      isPicked
                        ? { backgroundColor: theme.tint, borderColor: theme.tint }
                        : { borderColor: theme.borderStrong },
                    ]}>
                    {isPicked ? <CheckIcon size={14} color={theme.onTint} strokeWidth={3} /> : null}
                  </View>
                )
              }
              trailing={
                isPicked ? (
                  <ThemedText type="monoSmall" themeColor="tintText">
                    #{index + 1}
                  </ThemedText>
                ) : undefined
              }
            />
          );
        }}
        ListEmptyComponent={
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            No matches{customName ? ` for “${customName}”` : ''}.
          </ThemedText>
        }
        ListFooterComponent={
          // undefined, not null: RN 0.88's list types no longer accept null here.
          offerCustom ? (
            <View style={[styles.custom, { borderTopColor: theme.borderSubtle }]}>
              <ThemedText type="caption">Not in the list? Add it as your own.</ThemedText>
              <Segmented
                options={CUSTOM_METRICS}
                value={customMetric}
                onChange={setCustomMetric}
                accessibilityLabel="How this exercise is logged"
              />
              <Button
                label={`${isReplace ? 'Use' : 'Add'} “${customName}”`}
                icon={PlusIcon}
                variant="secondary"
                onPress={addCustom}
                disabled={!isReplace && picked.length >= room}
              />
            </View>
          ) : undefined
        }
      />
    </SheetFrame>
  );
}

const styles = StyleSheet.create({
  controls: {
    paddingHorizontal: 16,
  },
  search: {
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    height: 44,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 16,
    height: 44,
    paddingVertical: 0,
  },
  filters: {
    gap: 6,
    paddingBottom: 4,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  filter: {
    borderRadius: Radius.full,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  list: {
    paddingBottom: 12,
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  ring: {
    alignItems: 'center',
    borderRadius: Radius.full,
    borderWidth: 1.5,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  empty: {
    paddingHorizontal: 10,
    paddingVertical: 16,
  },
  custom: {
    borderTopWidth: 1,
    gap: 10,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingTop: 12,
  },
});
