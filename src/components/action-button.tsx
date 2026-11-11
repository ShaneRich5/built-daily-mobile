import type { StyleProp, ViewStyle } from 'react-native';

import { Button } from '@/components/ui/button';

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  /** `primary` fills with the accent; `secondary` and `danger` stay quieter. */
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * The button the pre-redesign screens were built with, now drawn by `Button`.
 * New screens use `Button` directly, which has the full set of variants.
 */
export function ActionButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  busy = false,
  style,
}: ActionButtonProps) {
  return (
    <Button
      label={label}
      onPress={onPress}
      variant={variant}
      disabled={disabled}
      busy={busy}
      style={style}
    />
  );
}
