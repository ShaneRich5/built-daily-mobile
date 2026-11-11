import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { DayMark } from '@/lib/groups-model';

const AVATAR_SIZE = { sm: 28, md: 40, lg: 48 } as const;

/** A round initial. `ring` means they trained today. */
export function Avatar({
  name,
  ring = false,
  size = 'md',
  style,
}: {
  name: string;
  ring?: boolean;
  size?: keyof typeof AVATAR_SIZE;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const px = AVATAR_SIZE[size];

  const circle = (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.avatar,
        { backgroundColor: theme.backgroundElement, borderRadius: px / 2, height: px, width: px },
        !ring && style,
      ]}>
      <ThemedText
        style={{ color: theme.textBody, fontFamily: FontFamily.semibold, fontSize: size === 'sm' ? 12 : size === 'md' ? 14 : 16 }}>
        {name.trim().charAt(0).toUpperCase() || '?'}
      </ThemedText>
    </View>
  );

  if (!ring) return circle;

  return (
    <View style={[styles.ring, { borderColor: theme.tint, borderRadius: px / 2 + 4 }, style]}>{circle}</View>
  );
}

/** Overlapping initials, with "+3" past `max`. */
export function StackedAvatars({ names, max = 3 }: { names: readonly string[]; max?: number }) {
  const theme = useTheme();
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;

  return (
    <View style={styles.stack} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {shown.map((name, i) => (
        <Avatar
          key={`${name}-${i}`}
          name={name}
          size="sm"
          style={[styles.stacked, { borderColor: theme.surface }, i > 0 && styles.overlap]}
        />
      ))}
      {extra > 0 ? (
        <View style={[styles.more, styles.overlap, { backgroundColor: theme.backgroundSelected, borderColor: theme.surface }]}>
          <ThemedText style={[styles.moreText, { color: theme.textMuted }]}>+{extra}</ThemedText>
        </View>
      ) : null}
    </View>
  );
}

/** One day in a week grid: filled for trained, a ring for planned, a faint ring for nothing — never "missed". */
export function DayDot({ mark }: { mark: DayMark }) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.dot,
        mark === 'trained' && { backgroundColor: theme.tint },
        mark === 'planned' && { borderColor: theme.tint, borderWidth: 2 },
        mark === 'none' && { borderColor: theme.borderStrong, borderWidth: 1 },
      ]}
    />
  );
}

/** "Thu" over "12". */
export function DayTile({ weekday, day, tone = 'plain' }: { weekday: string; day: number; tone?: 'plain' | 'green' }) {
  const theme = useTheme();
  const color = tone === 'green' ? theme.tintText : theme.text;

  return (
    <View
      style={[styles.tile, { backgroundColor: tone === 'green' ? theme.tintSubtle : theme.background }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <ThemedText style={[styles.tileWeekday, { color }]}>{weekday.toUpperCase()}</ThemedText>
      <ThemedText style={[styles.tileDay, { color }]}>{day}</ThemedText>
    </View>
  );
}

/** What groupmates see, said wherever groups are. */
export function PrivacyNote() {
  return (
    <ThemedText type="caption" style={styles.privacy}>
      Members see the days you train and plan, plus the workout name. Your sets, weights and notes stay yours.
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    borderWidth: 2,
    padding: 2,
  },
  stack: {
    flexDirection: 'row',
  },
  stacked: {
    borderWidth: 2,
  },
  overlap: {
    marginLeft: -8,
  },
  more: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 2,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  moreText: {
    fontFamily: FontFamily.semibold,
    fontSize: 11,
  },
  dot: {
    borderRadius: 8,
    height: 16,
    width: 16,
  },
  tile: {
    alignItems: 'center',
    borderRadius: Radius.sm,
    paddingVertical: 6,
    width: 44,
  },
  tileWeekday: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    lineHeight: 13,
    opacity: 0.7,
  },
  tileDay: {
    fontFamily: FontFamily.semibold,
    fontSize: 17,
    lineHeight: 22,
  },
  privacy: {
    paddingHorizontal: 4,
    textAlign: 'center',
  },
});
