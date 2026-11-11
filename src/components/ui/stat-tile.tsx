import { type StyleProp, StyleSheet, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { FontFamily } from '@/constants/theme';

export type StatTileProps = {
  /** Already formatted: "14", "1 hr 5 min". */
  value: string;
  label: string;
  style?: StyleProp<ViewStyle>;
};

/** One figure and what it counts — the row of three on a finished workout. */
export function StatTile({ value, label, style }: StatTileProps) {
  return (
    <Card style={[styles.tile, style]} accessible accessibilityLabel={`${value} ${label}`}>
      <ThemedText style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </ThemedText>
      <ThemedText type="caption" numberOfLines={1}>
        {label}
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    gap: 2,
    paddingVertical: 10,
  },
  value: {
    fontFamily: FontFamily.monoMedium,
    fontSize: 18,
    lineHeight: 24,
  },
});
