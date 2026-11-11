import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { sessionDayLabel, sessionDurationLabel, sessionVolumeLabel } from '@/lib/session-format';
import type { WorkoutSession } from '@/types/workout';

export function SessionRow({ session }: { session: WorkoutSession }) {
  const duration = sessionDurationLabel(session.activeDurationSec);
  const preview = session.previewExerciseNames.join(', ');

  return (
    <Link href={`/session/${session.id}`} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${session.title || 'Untitled workout'}, ${sessionDayLabel(session)}`}
        style={({ pressed }) => pressed && styles.pressed}>
        <SessionRowBody session={session} duration={duration} preview={preview} />
      </Pressable>
    </Link>
  );
}

function SessionRowBody({
  session,
  duration,
  preview,
}: {
  session: WorkoutSession;
  duration: string | null;
  preview: string;
}) {
  return (
    <Card style={styles.row}>
      <View style={styles.titleLine}>
        <ThemedText type="label" style={styles.title} numberOfLines={1}>
          {session.title || 'Untitled workout'}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {sessionDayLabel(session)}
        </ThemedText>
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        {[sessionVolumeLabel(session), duration].filter(Boolean).join(' · ')}
      </ThemedText>

      {preview ? (
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {preview}
        </ThemedText>
      ) : null}

      <StatusBadge status={session.status} />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.one,
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
  pressed: {
    opacity: 0.7,
  },
});
