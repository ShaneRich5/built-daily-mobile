import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { LucideIcon } from '@/components/ui/icons';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type PillTone =
  /** Amber: a workout in progress, a personal record. */
  | 'warning'
  /** Emerald: finished, a streak. */
  | 'success'
  /** Grey: anything that is neither. */
  | 'neutral'
  /** Red text on grey: discarded. */
  | 'danger';

export type PillProps = {
  label: string;
  tone?: PillTone;
  /** A leading status dot, as on "In progress". */
  dot?: boolean;
  icon?: LucideIcon;
  /** Status pills are small caps; counts and streaks ("4-week streak") are not. */
  uppercase?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** A small rounded label: a status, a PR, a streak. Never interactive. */
export function Pill({
  label,
  tone = 'neutral',
  dot = false,
  icon: Icon,
  uppercase = true,
  style,
}: PillProps) {
  const theme = useTheme();

  const colors = {
    warning: {
      background: theme.warningSubtle,
      border: theme.warningBorder,
      text: theme.warningText,
    },
    success: { background: theme.tintSubtle, border: theme.tintBorder, text: theme.tintText },
    neutral: {
      background: theme.backgroundElement,
      border: theme.border,
      text: theme.textSecondary,
    },
    danger: { background: theme.backgroundElement, border: theme.border, text: theme.danger },
  }[tone];

  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: colors.background, borderColor: colors.border },
        style,
      ]}>
      {dot ? <View style={[styles.dot, { backgroundColor: theme.warningDot }]} /> : null}
      {Icon ? <Icon size={12} color={colors.text} strokeWidth={3} /> : null}
      <ThemedText
        style={[styles.label, { color: colors.text }, uppercase ? styles.uppercase : styles.plain]}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dot: {
    borderRadius: Radius.full,
    height: 8,
    width: 8,
  },
  label: {
    fontFamily: FontFamily.semibold,
  },
  uppercase: {
    fontSize: 11,
    letterSpacing: 0.55,
    lineHeight: 14,
    textTransform: 'uppercase',
  },
  plain: {
    fontSize: 12,
    lineHeight: 16,
  },
});
