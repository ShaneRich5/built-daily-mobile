import type { ReactNode } from 'react';
import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ChevronRightIcon } from '@/components/ui/icons';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ListRowProps = {
  title: string;
  /** The grey line under the title: a date, a count, "last done Mon". */
  meta?: string | null;
  /** Something before the text: a status ring, an icon tile. */
  leading?: ReactNode;
  /** Replaces the chevron: a pill, a spinner, a value. */
  trailing?: ReactNode;
  /** Without it the row is plain content and draws no chevron. */
  onPress?: () => void;
  disabled?: boolean;
  /** 64 for a row that stands alone in a list, 56 inside a denser stack. */
  minHeight?: 56 | 64;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** A card-shaped row: title, meta line, and a chevron when it goes somewhere. */
export function ListRow({
  title,
  meta,
  leading,
  trailing,
  onPress,
  disabled = false,
  minHeight = 64,
  accessibilityLabel,
  style,
  testID,
}: ListRowProps) {
  const theme = useTheme();

  const content = (
    <>
      {leading}
      <View style={styles.text}>
        <ThemedText type="label" numberOfLines={1}>
          {title}
        </ThemedText>
        {meta ? (
          <ThemedText type="caption" numberOfLines={1}>
            {meta}
          </ThemedText>
        ) : null}
      </View>
      {trailing ??
        (onPress ? <ChevronRightIcon size={16} color={theme.textFaint} strokeWidth={2} /> : null)}
    </>
  );

  const box = [
    styles.row,
    { backgroundColor: theme.surface, borderColor: theme.border, minHeight },
    style,
  ];

  if (!onPress) {
    return (
      <View style={box} testID={testID}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (meta ? `${title}, ${meta}` : title)}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [box, pressed && styles.pressed, disabled && styles.disabled]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  text: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
});
