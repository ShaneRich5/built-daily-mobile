import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * A back control for a screen that is the first of its own stack.
 *
 * The workout screen opens a nested stack so its edit screens can carry their
 * own titles. Being that stack's first screen, react-navigation draws no back
 * button for it, and the parent stack — which is what the workout was pushed
 * onto — has its header hidden. Without this there is no way back to the list.
 */
export function HeaderBackButton({ label = 'Back' }: { label?: string }) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      // A cold open on a deep link has no history to pop, so fall back to the
      // list rather than leaving the button dead.
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      hitSlop={Spacing.two}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <SymbolView
        name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
        size={16}
        weight="semibold"
        tintColor={theme.tint}
      />
      <ThemedText type="small" themeColor="tint">
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.7,
  },
});
