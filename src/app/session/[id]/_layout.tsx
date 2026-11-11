import { Stack } from 'expo-router';

import { HeaderBackButton } from '@/components/header-back-button';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * The workout stack: the read view, and the two screens that edit it. Nested
 * here rather than in the root layout so the edit screens push over the workout
 * and come back to it, instead of over the tabs.
 *
 * `index` is this stack's first screen, so it gets no back button of its own —
 * the one back to the session list has to be supplied.
 */
export default function SessionLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: theme.background },
        headerBackTitle: 'Back',
        // The header sits on the page ground with no rule under it, as the
        // canvas draws its top rows.
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerTitleStyle: { fontFamily: FontFamily.semibold, fontSize: 17 },
      }}>
      <Stack.Screen
        name="index"
        options={{ headerTitle: 'Workout', headerLeft: () => <HeaderBackButton /> }}
      />
      <Stack.Screen name="edit" options={{ headerTitle: 'Edit details' }} />
      <Stack.Screen name="exercises" options={{ headerTitle: 'Edit exercises' }} />
    </Stack>
  );
}
