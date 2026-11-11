import { Colors, FontFamily } from '@/constants/theme';
import { navigationTheme } from '@/lib/navigation-theme';

describe('navigationTheme', () => {
  it.each(['light', 'dark'] as const)('paints %s headers and screens on the page ground', (scheme) => {
    const theme = navigationTheme(scheme);

    expect(theme.dark).toBe(scheme === 'dark');
    expect(theme.colors.background).toBe(Colors[scheme].background);
    expect(theme.colors.card).toBe(Colors[scheme].background);
    expect(theme.colors.text).toBe(Colors[scheme].text);
  });

  // Emerald is kept for start, finish and done; header buttons are plain text.
  it('does not spend the accent on header buttons', () => {
    expect(navigationTheme('light').colors.primary).toBe(Colors.light.text);
  });

  it('gives navigation the Geist families, with weight left to the family', () => {
    const { fonts } = navigationTheme('light');

    expect(fonts.regular.fontFamily).toBe(FontFamily.regular);
    expect(fonts.bold.fontFamily).toBe(FontFamily.semibold);
    expect(Object.values(fonts).every((font) => font.fontWeight === '400')).toBe(true);
  });
});
