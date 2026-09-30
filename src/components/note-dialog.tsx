import { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type NoteDialogProps = {
  /** Names what is being annotated, e.g. "Note for set 2". */
  title: string;
  initialValue: string;
  onCancel: () => void;
  onSave: (value: string) => void;
};

/**
 * A note editor in a dialog, so a long note gets room to breathe instead of
 * being typed into a one-line box wedged into a set row.
 *
 * Mounted only while open, which is what seeds the draft: the value is read
 * once on mount, so reopening always starts from what is actually stored, and
 * cancelling leaves it untouched.
 */
export function NoteDialog({ title, initialValue, onCancel, onSave }: NoteDialogProps) {
  const theme = useTheme();
  const [value, setValue] = useState(initialValue);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      {/* Tapping the backdrop is the same as cancelling. */}
      <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel="Close">
        {/* Swallows taps so they do not reach the backdrop underneath. */}
        <Pressable style={styles.sheetWrapper} onPress={() => {}}>
          <ThemedView style={styles.sheet}>
            <ThemedText type="smallBold">{title}</ThemedText>

            <TextInput
              // Not `title`: that is already the control that opened this
              // dialog, and reusing it leaves two things answering to one name.
              accessibilityLabel="Note"
              value={value}
              onChangeText={setValue}
              placeholder="Anything worth remembering"
              placeholderTextColor={theme.textSecondary}
              multiline
              autoFocus
              style={[
                styles.input,
                { backgroundColor: theme.backgroundElement, color: theme.text },
              ]}
            />

            <View style={styles.actions}>
              <ActionButton
                label="Cancel"
                variant="secondary"
                onPress={onCancel}
                style={styles.action}
              />
              <ActionButton
                label="Save note"
                onPress={() => onSave(value)}
                style={styles.action}
              />
            </View>
          </ThemedView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.three,
  },
  sheetWrapper: {
    maxWidth: 480,
    width: '100%',
  },
  sheet: {
    borderRadius: Spacing.three,
    gap: Spacing.three,
    padding: Spacing.three,
  },
  input: {
    borderRadius: 10,
    fontSize: 16,
    minHeight: 120,
    padding: Spacing.three,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  action: {
    flex: 1,
  },
});
