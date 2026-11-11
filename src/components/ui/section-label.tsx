import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export type SectionLabelProps = {
  children: string;
  /** A quiet link on the right: "See all", "Planner". */
  action?: { label: string; onPress: () => void };
  style?: StyleProp<ViewStyle>;
};

/** The small-caps heading over a group of cards: "EXERCISES", "THIS WEEK". */
export function SectionLabel({ children, action, style }: SectionLabelProps) {
  return (
    <View style={[styles.row, style]}>
      <ThemedText type="overline" accessibilityRole="header">
        {children}
      </ThemedText>

      {action ? (
        <Pressable
          accessibilityRole="link"
          hitSlop={12}
          onPress={action.onPress}
          style={({ pressed }) => pressed && styles.pressed}>
          <ThemedText type="link">{action.label}</ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pressed: {
    opacity: 0.6,
  },
});
