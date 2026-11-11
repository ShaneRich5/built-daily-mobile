import { Pressable, type StyleProp, StyleSheet, type ViewStyle } from 'react-native';

import type { LucideIcon } from '@/components/ui/icons';
import { MinTouchTarget, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type IconButtonProps = {
  icon: LucideIcon;
  /** Required: an icon alone says nothing to a screen reader. */
  accessibilityLabel: string;
  onPress: () => void;
  /**
   * `outline` is the bordered square in the action bar, `soft` the grey circle
   * that closes a sheet, `plain` an icon with no chrome (back arrows, row menus).
   */
  variant?: 'outline' | 'soft' | 'plain';
  size?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function IconButton({
  icon: Icon,
  accessibilityLabel,
  onPress,
  variant = 'outline',
  size = MinTouchTarget,
  disabled = false,
  style,
  testID,
}: IconButtonProps) {
  const theme = useTheme();
  // Never let the tappable area drop under 44px, whatever the drawn size.
  const slop = Math.max(0, (MinTouchTarget - size) / 2);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={slop}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        { height: size, width: size },
        variant === 'outline' && {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          borderRadius: Radius.sm,
          borderWidth: 1,
        },
        variant === 'soft' && {
          backgroundColor: theme.backgroundElement,
          borderRadius: Radius.full,
        },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      <Icon
        size={variant === 'plain' ? 20 : 16}
        color={variant === 'soft' ? theme.textBody : theme.text}
        strokeWidth={2}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.4,
  },
});
