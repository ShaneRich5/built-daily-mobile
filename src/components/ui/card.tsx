import { StyleSheet, View, type ViewProps } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type CardProps = ViewProps & {
  /**
   * `emphasis` draws the darker 1.5px outline the designs give the one card
   * that is "live": the open exercise, a workout in progress.
   */
  variant?: 'default' | 'emphasis';
  /** Hero cards (Start, Resume) are rounder than list cards. */
  radius?: 'lg' | 'xl';
  padded?: boolean;
};

/** A white (or zinc-900) surface with a hairline border — the app's basic box. */
export function Card({
  variant = 'default',
  radius = 'lg',
  padded = true,
  style,
  ...rest
}: CardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: variant === 'emphasis' ? theme.text : theme.border,
          borderRadius: Radius[radius],
          borderWidth: variant === 'emphasis' ? 1.5 : 1,
        },
        padded && styles.padded,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    // Children with their own background would otherwise square off the corners.
    overflow: 'hidden',
  },
  padded: {
    padding: 12,
  },
});
