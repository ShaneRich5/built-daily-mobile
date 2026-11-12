import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { LucideIcon } from '@/components/ui/icons';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ActionRowProps = {
  label: string;
  /** A second, grey line: what the row is, or why it is unavailable. */
  detail?: string;
  icon?: LucideIcon;
  /** Stands in for the icon: a position number, a status ring. */
  leading?: ReactNode;
  /** Sits at the far end: "Here now", "Use". */
  trailing?: ReactNode;
  onPress: () => void;
  /** Red, for the one action in a menu that deletes something. */
  destructive?: boolean;
  disabled?: boolean;
  /** Tints the row, e.g. the picked row in a multi-select list. */
  selected?: boolean;
  accessibilityLabel?: string;
};

/** A full-width tappable row in a sheet: a menu item, a place to move to. */
export function ActionRow({
  label,
  detail,
  icon: Icon,
  leading,
  trailing,
  onPress,
  destructive = false,
  disabled = false,
  selected = false,
  accessibilityLabel,
}: ActionRowProps) {
  const theme = useTheme();
  const color = destructive ? theme.danger : disabled ? theme.textSecondary : theme.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (detail ? `${label}, ${detail}` : label)}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        selected && { backgroundColor: theme.selectedRow },
        pressed && { backgroundColor: theme.backgroundElement },
      ]}>
      {leading ?? (Icon ? <Icon size={18} color={color} strokeWidth={2} /> : null)}
      <View style={styles.text}>
        <ThemedText type="label" style={{ color }} numberOfLines={1}>
          {label}
        </ThemedText>
        {detail ? (
          <ThemedText type="caption" numberOfLines={1}>
            {detail}
          </ThemedText>
        ) : null}
      </View>
      {trailing}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    borderRadius: Radius.md,
    flexDirection: 'row',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  text: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
});
