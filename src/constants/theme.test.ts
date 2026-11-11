import { Colors, FontFamily, type ThemeColor, Typography } from '@/constants/theme';

/** WCAG relative luminance of a `#rrggbb` colour. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/**
 * Every pairing the app actually draws text in: [text, what it sits on].
 *
 * The dark palette is derived rather than designed, so this is what stands in
 * for a designer's eye — a pairing that slips under 4.5:1 fails here instead
 * of on someone's phone.
 */
const TEXT_ON_BACKGROUND: readonly (readonly [ThemeColor, ThemeColor])[] = [
  ['text', 'background'],
  ['text', 'surface'],
  ['text', 'backgroundElement'],
  ['textBody', 'background'],
  ['textBody', 'surface'],
  ['textMuted', 'surface'],
  ['textSecondary', 'background'],
  ['textSecondary', 'surface'],
  ['onTint', 'tint'],
  ['onInverse', 'inverse'],
  ['tintText', 'tintSubtle'],
  ['warningText', 'warningSubtle'],
  ['activityText', 'activitySubtle'],
  ['danger', 'surface'],
  ['danger', 'background'],
];

describe.each(['light', 'dark'] as const)('%s theme', (scheme) => {
  const colors = Colors[scheme];

  it.each(TEXT_ON_BACKGROUND)('%s on %s is readable (4.5:1)', (text, background) => {
    expect(contrast(colors[text], colors[background])).toBeGreaterThanOrEqual(4.5);
  });

  // The accent also carries meaning as a fill and an outline (a done tick, a
  // planned day), which needs 3:1 against what is behind it.
  it.each(['background', 'surface'] as const)('the accent stands out on %s (3:1)', (background) => {
    expect(contrast(colors.tint, colors[background])).toBeGreaterThanOrEqual(3);
  });
});

describe('Colors', () => {
  it('defines the same tokens in both themes', () => {
    expect(Object.keys(Colors.dark).sort()).toEqual(Object.keys(Colors.light).sort());
  });
});

describe('Typography', () => {
  const families = new Set<string>(Object.values(FontFamily));

  it.each(Object.entries(Typography))('%s uses a loaded font family', (_name, style) => {
    expect(families.has(style.fontFamily)).toBe(true);
  });

  // A custom font is one weight per family; `fontWeight` on top of it makes
  // Android synthesize a bold or fall back to the system font.
  it.each(Object.entries(Typography))('%s leaves weight to the family', (_name, style) => {
    expect('fontWeight' in style).toBe(false);
  });
});
