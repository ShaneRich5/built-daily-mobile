import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ExerciseCatalogList } from '@/components/exercise-catalog-list';
import { ThemedText } from '@/components/themed-text';
import { PageHeader } from '@/components/ui/page-header';
import { Screen } from '@/components/ui/screen';

/**
 * Browsing the exercise catalog, read-only. Reached from the account menu on
 * Home; picking an exercise for a workout happens in the workout's own search
 * sheet.
 */
export default function ExerciseCatalogScreen() {
  const [query, setQuery] = useState('');

  return (
    <Screen scroll={false} edges={['top']}>
      <View style={styles.header}>
        <PageHeader title="Exercise catalog" />
      </View>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  footer: {
    paddingBottom: 32,
    paddingTop: 24,
  },
});
