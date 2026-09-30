import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { NoteDialog } from '@/components/note-dialog';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type NoteFieldProps = {
  /**
   * The accessibility label and the dialog's title, so it has to say which note
   * this is — "Note for set 2" — even where the screen has no room to show that.
   */
  label: string;
  /**
   * The caption drawn above the box. Defaults to `label`; pass a shorter one
   * where the surrounding card already gives the context, or `null` to draw
   * none at all.
   */
  caption?: string | null;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

/**
 * A note, shown as a tappable line that opens a dialog to edit it. Reads the
 * stored note at a glance and gives it a full text area to be written in.
 */
export function NoteField({
  label,
  caption = label,
  value,
  placeholder = 'Note (optional)',
  onChange,
  disabled = false,
}: NoteFieldProps) {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={styles.field}>
      {caption !== null ? (
        <ThemedText type="small" themeColor="textSecondary">
          {caption}
        </ThemedText>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Opens a dialog to edit this note"
        disabled={disabled}
        onPress={() => setIsOpen(true)}
        style={({ pressed }) => [
          styles.box,
          { backgroundColor: theme.background },
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        <ThemedText
          type="small"
          themeColor={value.length > 0 ? 'text' : 'textSecondary'}
          numberOfLines={2}
        >
          {value.length > 0 ? value : placeholder}
        </ThemedText>
      </Pressable>

      {isOpen ? (
        <NoteDialog
          title={label}
          initialValue={value}
          onCancel={() => setIsOpen(false)}
          onSave={(next) => {
            onChange(next);
            setIsOpen(false);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
  },
  box: {
    borderRadius: Spacing.two,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
});
