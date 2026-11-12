import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconButton } from '@/components/ui/icon-button';
import { ArrowLeftIcon } from '@/components/ui/icons';

/**
 * The top row of a screen pushed over the tabs: a back arrow and its title.
 * Drawn in the screen rather than by the native stack, as the designs draw
 * every top row, so it sits in the same type and spacing as the rest.
 */
export function PageHeader({ title }: { title: string }) {
  return (
    <View style={styles.row}>
      <IconButton
        icon={ArrowLeftIcon}
        accessibilityLabel="Back"
        variant="plain"
        // A cold open on a deep link has no history to pop.
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        style={styles.back}
      />
      <ThemedText type="heading" accessibilityRole="header">
        {title}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  back: {
    marginLeft: -10,
  },
});
