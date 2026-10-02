import { type ReactElement } from 'react';
import { Pressable, SectionList, StyleSheet } from 'react-native';

import { FormField } from '@/components/form-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  catalogSections,
  metricLabel,
  searchCatalog,
  type CatalogExercise,
} from '@/lib/exercise-catalog';

type ExerciseCatalogListProps = {
  /** Controlled, so a caller can reuse what was typed — see the add screen. */
  query: string;
  onChangeQuery: (query: string) => void;
  /** Given, every row becomes a button. Omitted, the list is read-only. */
  onSelect?: (exercise: CatalogExercise) => void;
  /** Rendered under the list — where the empty search lands. */
  footer?: ReactElement | null;
};

/**
 * The exercise catalog, searchable and grouped by muscle group.
 *
 * Shared by the browse tab and the add-exercise screen so the two cannot drift
 * into ranking or grouping the same search differently.
 */
export function ExerciseCatalogList({
  query,
  onChangeQuery,
  onSelect,
  footer,
}: ExerciseCatalogListProps) {
  const theme = useTheme();

  // `SectionList` insists on `data`; the catalog's own shape says `exercises`,
  // which keeps that component detail out of the pure module.
  const sections = catalogSections(searchCatalog(query)).map((section) => ({
    title: section.title,
    data: section.exercises,
  }));

  return (
    <SectionList
      sections={sections}
      keyExtractor={(exercise) => exercise.id}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.content}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={
        <FormField
          label="Search"
          value={query}
          onChangeText={onChangeQuery}
          placeholder="Bench press, rdl, treadmill…"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      }
      renderSectionHeader={({ section }) => (
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionHeader}>
          {section.title}
        </ThemedText>
      )}
      renderItem={({ item }) => (
        <ExerciseRow exercise={item} onSelect={onSelect} />
      )}
      ItemSeparatorComponent={() => (
        <ThemedView style={[styles.separator, { backgroundColor: theme.backgroundElement }]} />
      )}
      ListEmptyComponent={
        <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
          No exercises match “{query.trim()}”.
        </ThemedText>
      }
      ListFooterComponent={footer}
    />
  );
}

function ExerciseRow({
  exercise,
  onSelect,
}: {
  exercise: CatalogExercise;
  onSelect?: (exercise: CatalogExercise) => void;
}) {
  const body = (
    <ThemedView style={styles.row}>
      <ThemedText numberOfLines={1} style={styles.name}>
        {exercise.name}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {metricLabel(exercise.metric)}
      </ThemedText>
    </ThemedView>
  );

  if (!onSelect) return body;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Add ${exercise.name}`}
      onPress={() => onSelect(exercise)}
      style={({ pressed }) => pressed && styles.pressed}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.one,
    maxWidth: MaxContentWidth,
    padding: Spacing.three,
    width: '100%',
  },
  sectionHeader: {
    paddingBottom: Spacing.one,
    paddingTop: Spacing.three,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
  },
  name: {
    flexShrink: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  empty: {
    paddingTop: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
