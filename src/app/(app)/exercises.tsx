import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExerciseCatalogList } from '@/components/exercise-catalog-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';

/**
 * Browsing the exercise catalog. Read-only: the same list becomes a picker when
 * it is reached from a workout (`/session/[id]/add`).
 */
export default function ExerciseCatalogScreen() {
  const [query, setQuery] = useState('');

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ExerciseCatalogList
          query={query}
          onChangeQuery={setQuery}
          footer={
            <ThemedText type="small" themeColor="textSecondary" style={styles.footer}>
              Weights are logged in pounds. Anything the catalog is missing can be added to a
              workout by name.
            </ThemedText>
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    marginBottom: BottomTabInset,
  },
  footer: {
    paddingTop: Spacing.four,
  },
});
