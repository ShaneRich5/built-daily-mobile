import { Text, type TextProps } from 'react-native';

import { type ThemeColor, Typography, type TypographyVariant } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * `linkPrimary` and `code` predate the type scale and are kept so older screens
 * keep compiling; they resolve to `link` in the accent colour and `monoSmall`.
 */
export type ThemedTextType = TypographyVariant | 'linkPrimary' | 'code';

export type ThemedTextProps = TextProps & {
  type?: ThemedTextType;
  themeColor?: ThemeColor;
};

/** Variants that carry their own colour unless one is asked for. */
const DEFAULT_COLOR: Partial<Record<ThemedTextType, ThemeColor>> = {
  caption: 'textSecondary',
  overline: 'textSecondary',
  link: 'textBody',
  linkPrimary: 'tint',
};

function variantFor(type: ThemedTextType): TypographyVariant {
  if (type === 'linkPrimary') return 'link';
  if (type === 'code') return 'monoSmall';
  return type;
}

/**
 * Text in the app's type scale and theme colours.
 *
 * Weight comes from the variant's font family, never from `fontWeight` — see
 * `FontFamily` in the theme for why.
 */
export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const color = theme[themeColor ?? DEFAULT_COLOR[type] ?? 'text'];

  return <Text style={[Typography[variantFor(type)], { color }, style]} {...rest} />;
}
