import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
} from '@expo-google-fonts/geist';
import { GeistMono_400Regular, GeistMono_500Medium } from '@expo-google-fonts/geist-mono';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { SessionProvider, useSession } from '@/contexts/session';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { navigationTheme } from '@/lib/navigation-theme';

SplashScreen.preventAutoHideAsync();

function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const { user, isLoading } = useSession();
  const ready = fontsReady && !isLoading;

  // The native splash stays up until the fonts are registered and the persisted
  // session is restored, so neither system-font text nor the sign-in screen
  // flashes before the real first frame.
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(app)" />
        {/* Pushed over the tabs rather than living in (app), where every file
            becomes a tab. Its own layout supplies the headers for the workout
            and its two edit screens. */}
        <Stack.Screen name="session/[id]" />
        <Stack.Screen name="history" />
        <Stack.Screen name="exercises" />
      </Stack.Protected>

      <Stack.Protected guard={!user}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';

  // `useFonts`, not the expo-font config plugin: the plugin embeds fonts at
  // build time, which Expo Go — a prebuilt app — never sees. The keys are the
  // family names the theme's `FontFamily` refers to.
  const [fontsLoaded, fontError] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    GeistMono_400Regular,
    GeistMono_500Medium,
  });

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const overrides = navigationTheme(scheme);

  return (
    <ThemeProvider
      value={{ ...base, ...overrides, colors: { ...base.colors, ...overrides.colors } }}>
      <StatusBar style="auto" />
      <SessionProvider>
        {/* A font that fails to load is not worth a blank app: text falls back
            to the system font and everything else carries on. */}
        <RootNavigator fontsReady={fontsLoaded || fontError !== null} />
      </SessionProvider>
    </ThemeProvider>
  );
}
