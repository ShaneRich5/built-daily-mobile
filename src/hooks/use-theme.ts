/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme() {
  const scheme = useColorScheme();
  // Null when the system has no preference (RN 0.88 dropped 'unspecified').
  const theme = scheme ?? 'light';

  return Colors[theme];
}
