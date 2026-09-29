import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import {
  isUnfinished,
  sessionDayLabel,
  sessionDurationLabel,
  sessionVolumeLabel,
} from '@/lib/session-format';
import type { WorkoutSession } from '@/types/workout';

export function SessionRow({ session }: { session: WorkoutSession }) {
  const duration = sessionDurationLabel(session.activeDurationSec);
  const preview = session.previewExerciseNames.join(', ');

  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <ThemedView type="backgroundElement" style={styles.titleLine}>
        <ThemedText type="smallBold" style={styles.title} numberOfLines={1}>
          {session.title || 'Untitled workout'}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {sessionDayLabel(session)}
        </ThemedText>
      </ThemedView>

      <ThemedText type="small" themeColor="textSecondary">
        {[sessionVolumeLabel(session), duration].filter(Boolean).join(' · ')}
      </ThemedText>

      {preview ? (
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {preview}
        </ThemedText>
      ) : null}

      {isUnfinished(session.status) ? (
        <ThemedText type="small" themeColor="tint">
          In progress
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: Spacing.three,
    gap: Spacing.one,
    padding: Spacing.three,
  },
  titleLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  title: {
    flexShrink: 1,
  },
});
