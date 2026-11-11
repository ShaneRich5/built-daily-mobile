import { Colors, FontFamily } from '@/constants/theme';

/**
 * The slice of a React Navigation theme this app overrides. Declared here
 * rather than imported so this module does not depend on the navigation
 * library and can be unit tested as plain data.
 */
export type NavigationThemeOverrides = {
  dark: boolean;
  colors: {
    primary: string;
    background: string;
    card: string;
    text: string;
    border: string;
    notification: string;
  };
  fonts: Record<
    'regular' | 'medium' | 'bold' | 'heavy',
    { fontFamily: string; fontWeight: '400' }
  >;
};

/**
 * Maps the design tokens onto what React Navigation draws itself: stack
 * headers, the screen background during a transition, and the tab bar.
 *
 * `fontWeight` is pinned to 400 for every slot because each Geist weight is
 * registered as its own family (see `FontFamily`) — letting navigation ask for
 * `600` on top of `Geist_600SemiBold` would synthesize a second layer of bold.
 */
export function navigationTheme(scheme: 'light' | 'dark'): NavigationThemeOverrides {
  const colors = Colors[scheme];

  return {
    dark: scheme === 'dark',
    colors: {
      // Header buttons and the back arrow: plain text colour, as on the canvas,
      // rather than the accent — emerald is kept for start, finish and done.
      primary: colors.text,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.border,
      notification: colors.tint,
    },
    fonts: {
      regular: { fontFamily: FontFamily.regular, fontWeight: '400' },
      medium: { fontFamily: FontFamily.medium, fontWeight: '400' },
      bold: { fontFamily: FontFamily.semibold, fontWeight: '400' },
      heavy: { fontFamily: FontFamily.bold, fontWeight: '400' },
    },
  };
}
