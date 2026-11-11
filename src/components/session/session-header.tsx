import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ChevronRightIcon } from '@/components/ui/icons';
import { Pill } from '@/components/ui/pill';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { SaveStatus } from '@/hooks/use-live-workout';

type LiveHeaderProps = {
  /** Something went wrong saving; shown beside the status pill. */
  saveStatus: SaveStatus;
  onHome: () => void;
};

/** The top row of a workout in progress: its status, and the way out. */
export function LiveHeader({ saveStatus, onHome }: LiveHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.status}>
        <Pill label="In progress" tone="warning" dot />
        {saveStatus === 'error' ? (
          <ThemedText type="caption" themeColor="danger">
            Not saved yet
          </ThemedText>
        ) : null}
      </View>
      <Button label="Home" variant="secondary" size="sm" onPress={onHome} />
    </View>
  );
}

type EditHeaderProps = {
  unsaved: boolean;
  onCancel: () => void;
};

/** The top row while editing a finished workout: cancel, and whether it is saved. */
export function EditHeader({ unsaved, onCancel }: EditHeaderProps) {
  return (
    <View style={[styles.row, styles.editRow]}>
      <Button label="Cancel" variant="ghost" onPress={onCancel} />
      <ThemedText type="labelStrong" accessibilityRole="header">
        Editing workout
      </ThemedText>
      {/* Holds its width when empty so the title stays centred. */}
      <ThemedText type="caption" themeColor="warningText" style={styles.unsaved}>
        {unsaved ? 'Unsaved' : ''}
      </ThemedText>
    </View>
  );
}

type WorkoutTitleCardProps = {
  title: string;
  /** "4 exercises · 9 of 12 sets done", or the date line when editing. */
  meta: string;
  onPress: () => void;
};

/** The workout's name and a summary line; tapping it edits name, date and note. */
export function WorkoutTitleCard({ title, meta, onPress }: WorkoutTitleCardProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${meta}`}
      accessibilityHint="Edits the workout name, date and note"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <View style={styles.text}>
        <ThemedText type="labelStrong" numberOfLines={1}>
          {title}
        </ThemedText>
        <ThemedText type="caption" numberOfLines={1}>
          {meta}
        </ThemedText>
      </View>
      <ChevronRightIcon size={16} color={theme.textFaint} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  editRow: {
    minHeight: 44,
  },
  status: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    gap: 10,
  },
  unsaved: {
    minWidth: 56,
    textAlign: 'right',
  },
  card: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 56,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  text: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  pressed: {
    opacity: 0.7,
  },
});
