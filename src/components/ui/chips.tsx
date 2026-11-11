import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ChipOption = { id: string; label: string; accessibilityLabel?: string };

export type ChipsProps = {
  options: readonly ChipOption[];
  selected: readonly string[];
  /** Checkboxes rather than radios: more than one can be on. */
  multi?: boolean;
  onPress: (id: string) => void;
  /** Stretches the chips to share the row evenly, as the goal pickers do. */
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** A row of rounded choices; the chosen ones are dark. For goals, days and the like. */
export function Chips({ options, selected, multi = false, onPress, fill = false, style }: ChipsProps) {
  const theme = useTheme();

  return (
    <View style={[styles.chips, fill && styles.noWrap, style]}>
      {options.map((option) => {
        const on = selected.includes(option.id);

        return (
          <Pressable
            key={option.id}
            accessibilityRole={multi ? 'checkbox' : 'radio'}
            accessibilityState={{ checked: on }}
            accessibilityLabel={option.accessibilityLabel}
            onPress={() => onPress(option.id)}
            style={[
              styles.chip,
              fill && styles.filled,
              on
                ? { backgroundColor: theme.inverse, borderColor: theme.inverse }
                : { backgroundColor: theme.surface, borderColor: theme.border },
            ]}>
            <ThemedText type="link" style={{ color: on ? theme.onInverse : theme.textBody }}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  noWrap: {
    flexWrap: 'nowrap',
    gap: 6,
  },
  chip: {
    alignItems: 'center',
    borderRadius: Radius.full,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
  },
  filled: {
    borderRadius: Radius.md,
    flex: 1,
    paddingHorizontal: 0,
  },
});
