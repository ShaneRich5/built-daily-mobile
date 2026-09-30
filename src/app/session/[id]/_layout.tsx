import { Stack } from 'expo-router';

/**
 * The workout stack: the read view, and the two screens that edit it. Nested
 * here rather than in the root layout so the edit screens push over the workout
 * and come back to it, instead of over the tabs.
 */
export default function SessionLayout() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Back' }}>
      <Stack.Screen name="index" options={{ headerTitle: 'Workout' }} />
      <Stack.Screen name="edit" options={{ headerTitle: 'Edit details' }} />
      <Stack.Screen name="exercises" options={{ headerTitle: 'Edit exercises' }} />
    </Stack>
  );
}
