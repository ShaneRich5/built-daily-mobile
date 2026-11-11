import type { ReactNode } from 'react';
import { ScrollView, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { type Edge, SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ScreenProps = {
  children: ReactNode;
  /**
   * `true` wraps the children in a scroll view with the standard gutters.
   * Screens built on a `FlatList` pass `false` and use `screenContentStyle`
   * for the list's own content container instead.
   */
  scroll?: boolean;
  /**
   * Which safe-area edges this screen owns. A tab screen with no header owns
   * the top; a screen under a stack header owns none.
   */
  edges?: readonly Edge[];
  /** Pinned under the scrolling content: an action bar. */
  footer?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
};

/** The standard page gutters and rhythm: 16px sides, 20px between sections. */
export const screenContentStyle = {
  alignSelf: 'center',
  gap: 20,
  maxWidth: MaxContentWidth,
  padding: 16,
  width: '100%',
} as const satisfies ViewStyle;

/** The page ground, safe-area padding and (optionally) the scroll container. */
export function Screen({
  children,
  scroll = true,
  edges = ['top'],
  footer,
  contentStyle,
  testID,
}: ScreenProps) {
  const theme = useTheme();

  return (
    <SafeAreaView
      edges={edges}
      style={[styles.root, { backgroundColor: theme.background }]}
      testID={testID}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[screenContentStyle, contentStyle]}
          keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.root, contentStyle]}>{children}</View>
      )}
      {footer}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
