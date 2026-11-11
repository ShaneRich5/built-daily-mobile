import { StyleSheet, View } from 'react-native';

import { CheckIcon } from '@/components/ui/icons';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ExerciseProgress } from '@/lib/session/session-model';

const LABEL: Record<ExerciseProgress, string> = {
  done: 'Done',
  in_progress: 'In progress',
  not_started: 'Not started',
};

/**
 * Where an exercise stands, at a glance: a filled tick when every set is done,
 * a ring with a dot while it is part-way, an empty ring before it is started.
 */
export function ExerciseStatusIcon({ progress }: { progress: ExerciseProgress }) {
  const theme = useTheme();

  return (
    <View
      accessible
      accessibilityLabel={LABEL[progress]}
      accessibilityRole="image"
      style={[
        styles.ring,
        progress === 'done'
          ? { backgroundColor: theme.tint, borderColor: theme.tint }
          : { borderColor: progress === 'in_progress' ? theme.tint : theme.borderStrong },
      ]}>
      {progress === 'done' ? <CheckIcon size={12} color={theme.onTint} strokeWidth={3} /> : null}
      {progress === 'in_progress' ? (
        <View style={[styles.dot, { backgroundColor: theme.tint }]} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    alignItems: 'center',
    borderRadius: Radius.full,
    borderWidth: 1.5,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  dot: {
    borderRadius: Radius.full,
    height: 8,
    width: 8,
  },
});
