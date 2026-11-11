import { type ReactNode, useEffect, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconButton } from '@/components/ui/icon-button';
import { XIcon } from '@/components/ui/icons';
import { MaxContentWidth, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** One line under the title saying what the sheet will do. */
  subtitle?: string;
  children: ReactNode;
  /** Pinned under the content: the confirm button and its side links. */
  footer?: ReactNode;
  /**
   * `content` hugs what is inside it (a few choices). `tall` takes most of the
   * screen and gives `children` the room to scroll (search results).
   */
  size?: 'content' | 'tall';
  testID?: string;
};

/** How far the panel travels as it settles in — a nudge, not a full slide. */
const ENTER_OFFSET = 32;

/**
 * A bottom sheet, as the designs draw them: a scrim, a panel with 20px top
 * corners and a grabber, a title row with a close button, and an optional
 * pinned footer.
 *
 * Built on React Native's `Modal` rather than a sheet library — no native code
 * beyond what Expo Go ships, and the sheet hands its result back through plain
 * props instead of through a route. It closes on the scrim, the close button
 * and the Android back button; there is no drag-to-dismiss.
 *
 * The panel is marked modal for screen readers, which hides everything beside
 * it — the scrim included. That is intended: the close button is the way out
 * there, and a second, screen-sized "Close" would only be noise.
 */
export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'content',
  testID,
}: SheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  // State, not a ref: the value is read while rendering (it is in the style
  // below), which a ref must not be. It is created once and never set again.
  const [offset] = useState(() => new Animated.Value(ENTER_OFFSET));

  useEffect(() => {
    if (!visible) return;

    offset.setValue(ENTER_OFFSET);
    Animated.timing(offset, { toValue: 0, duration: 180, useNativeDriver: true }).start();
  }, [visible, offset]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
      testID={testID}>
      <KeyboardAvoidingView behavior="padding" style={styles.root}>
        <Pressable
          accessibilityLabel="Close"
          accessibilityRole="button"
          onPress={onClose}
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.scrim }]}
          testID="sheet-scrim"
        />

        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.panel,
            size === 'tall' && styles.tall,
            {
              backgroundColor: theme.surface,
              // A tall sheet stops short of the status bar so the screen behind
              // still reads as "underneath".
              marginTop: insets.top + 48,
              transform: [{ translateY: offset }],
            },
          ]}>
          <View style={styles.grabberRow}>
            <View style={[styles.grabber, { backgroundColor: theme.borderStrong }]} />
          </View>

          <View style={styles.header}>
            <View style={styles.titles}>
              <ThemedText type="heading" accessibilityRole="header">
                {title}
              </ThemedText>
              {subtitle ? <ThemedText type="caption">{subtitle}</ThemedText> : null}
            </View>
            <IconButton
              icon={XIcon}
              accessibilityLabel="Close"
              onPress={onClose}
              variant="soft"
              size={40}
            />
          </View>

          <View style={[styles.body, size === 'tall' && styles.bodyTall]}>{children}</View>

          {footer ? (
            <View
              style={[
                styles.footer,
                { borderTopColor: theme.borderSubtle, paddingBottom: Math.max(insets.bottom, 20) },
              ]}>
              {footer}
            </View>
          ) : (
            <View style={{ height: Math.max(insets.bottom, 20) }} />
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  panel: {
    alignSelf: 'center',
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  tall: {
    flex: 1,
  },
  grabberRow: {
    alignItems: 'center',
    paddingTop: 8,
  },
  grabber: {
    borderRadius: Radius.full,
    height: 4,
    width: 40,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  titles: {
    flex: 1,
    gap: 2,
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  bodyTall: {
    flex: 1,
  },
  footer: {
    borderTopWidth: 1,
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
});
