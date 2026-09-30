import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { formatSet } from '@/lib/session-format';
import type { SessionLine } from '@/types/workout';

export function ExerciseLineCard({ line, note }: { line: SessionLine; note: string | null }) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">{line.nameSnapshot || 'Unnamed exercise'}</ThemedText>

      {note ? (
        <ThemedText type="small" themeColor="textSecondary">
          {note}
        </ThemedText>
      ) : null}

      {line.sets.map((set, index) => (
        // Sets have no stable id of their own; their order within the line is
        // the identity, and the list is never reordered after the fact.
        <ThemedView key={index} type="backgroundElement" style={styles.setRow}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.setIndex}>
            {index + 1}
          </ThemedText>
          <ThemedText type="small" style={styles.setValue}>
            {formatSet(set, line.metric)}
          </ThemedText>
          {set.note ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {set.note}
            </ThemedText>
          ) : null}
        </ThemedView>
      ))}

      {line.sets.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          No sets logged
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    gap: Spacing.one,
    padding: Spacing.three,
  },
  setRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  setIndex: {
    minWidth: 16,
  },
  setValue: {
    flexShrink: 0,
  },
});
