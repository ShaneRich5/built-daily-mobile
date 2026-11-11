import {
  ActivityIndicator,
  Pressable,
  type StyleProp,
  StyleSheet,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { LucideIcon } from '@/components/ui/icons';
import { MinTouchTarget, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ButtonVariant =
  /** The emerald call to action: Start, Resume, Finish. One per screen. */
  | 'primary'
  /** The dark confirm button: Add exercises, Edit workout. */
  | 'dark'
  /** White with a hairline border: Log activity, Details. */
  | 'secondary'
  /** Dashed outline, for "add another": Add set, Add exercise. */
  | 'dashed'
  /** An underlined text link sized like a button. */
  | 'ghost'
  /** `secondary` with a red label, for destructive actions. */
  | 'danger';

export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  disabled?: boolean;
  /** Swaps the label for a spinner and blocks presses. */
  busy?: boolean;
  /** For when the visible label is not enough on its own, e.g. "Add" in a row. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const HEIGHT: Record<ButtonSize, number> = { sm: 36, md: MinTouchTarget, lg: 52 };

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  disabled = false,
  busy = false,
  accessibilityLabel,
  style,
  testID,
}: ButtonProps) {
  const theme = useTheme();
  const blocked = disabled || busy;

  const background = {
    primary: theme.tint,
    dark: theme.inverse,
    secondary: theme.surface,
    dashed: 'transparent',
    ghost: 'transparent',
    danger: theme.surface,
  }[variant];

  const labelColor = {
    primary: theme.onTint,
    dark: theme.onInverse,
    secondary: theme.text,
    dashed: theme.textBody,
    ghost: theme.textBody,
    danger: theme.danger,
  }[variant];

  const bordered = variant === 'secondary' || variant === 'danger' || variant === 'dashed';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: blocked, busy }}
      disabled={blocked}
      onPress={onPress}
      testID={testID}
      // A 36px button still gets a 44px target.
      hitSlop={size === 'sm' ? 4 : undefined}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: background,
          borderRadius: size === 'lg' ? Radius.lg : Radius.sm,
          minHeight: HEIGHT[size],
        },
        bordered && {
          borderColor: variant === 'dashed' ? theme.borderStrong : theme.border,
          borderStyle: variant === 'dashed' ? 'dashed' : 'solid',
          borderWidth: 1,
        },
        variant === 'ghost' && styles.ghost,
        pressed && styles.pressed,
        blocked && styles.disabled,
        style,
      ]}>
      {busy ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <>
          {Icon ? <Icon size={16} color={labelColor} strokeWidth={2} /> : null}
          <ThemedText
            type={size === 'lg' ? 'labelStrong' : variant === 'ghost' ? 'link' : 'button'}
            style={[{ color: labelColor }, variant === 'ghost' && styles.underline]}
            numberOfLines={1}>
            {label}
          </ThemedText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  ghost: {
    paddingHorizontal: 0,
  },
  underline: {
    textDecorationLine: 'underline',
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.5,
  },
});
