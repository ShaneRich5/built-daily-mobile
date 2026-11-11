import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { formatSet } from '@/lib/session-format';
import type { SessionLine } from '@/types/workout';

export function ExerciseLineCard({ line, note }: { line: SessionLine; note: string | null }) {
  return (
    <Card style={styles.card}>
      <ThemedText type="labelStrong">{line.nameSnapshot || 'Unnamed exercise'}</ThemedText>

      {note ? (
        <ThemedText type="small" themeColor="textSecondary">
          {note}
        </ThemedText>
      ) : null}

      {line.sets.map((set, index) => (
        // Sets have no stable id of their own; their order within the line is
        // the identity, and the list is never reordered after the fact.
        <View key={index} style={styles.setRow}>
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
        </View>
      ))}

      {line.sets.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          No sets logged
        </ThemedText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.one,
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
