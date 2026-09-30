import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { sessionStatusColor, sessionStatusLabel } from '@/lib/session-format';
import type { SessionStatus } from '@/types/workout';

/** The state a workout is in: in progress, completed, or discarded. */
export function StatusBadge({ status }: { status: SessionStatus }) {
  return (
    <ThemedView type="backgroundSelected" style={styles.badge}>
      <ThemedText type="small" themeColor={sessionStatusColor(status)}>
        {sessionStatusLabel(status)}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
});
