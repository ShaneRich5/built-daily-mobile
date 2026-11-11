import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

/**
 * The workout stack: the workout itself, and the screen that edits a finished
 * one. Nested here rather than in the root layout so the edit screen pushes
 * over the workout and comes back to it, instead of over the tabs.
 *
 * No native headers: each screen draws its own top row, as the designs do — a
 * status pill and a way out — and a platform title bar above that would only
 * repeat it.
 */
export default function SessionLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: theme.background },
        headerShown: false,
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="edit" />
    </Stack>
  );
}
