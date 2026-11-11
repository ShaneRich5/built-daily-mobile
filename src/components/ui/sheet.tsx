import { createContext, type ReactNode, use, useEffect, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
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

/**
 * `content` hugs what is inside it (a few choices). `tall` takes most of the
 * screen and gives its body the room to scroll (search results, details).
 */
export type SheetSize = 'content' | 'tall';

/** How far the panel travels as it settles in — a nudge, not a full slide. */
const ENTER_OFFSET = 32;

const SheetCloseContext = createContext<(() => void) | null>(null);

export type SheetHostProps = {
  visible: boolean;
  onClose: () => void;
  size?: SheetSize;
  /** One `SheetFrame`. */
  children: ReactNode;
  testID?: string;
};

/**
 * The modal shell of a bottom sheet: the scrim, and the rounded panel that
 * rises from the bottom edge. What goes in the panel is a `SheetFrame`.
 *
 * The two are separate so one host can stay up while its frame changes — a
 * screen with several sheets (details → swap → search) renders a single host
 * and switches the frame inside it. Closing one `Modal` and opening another in
 * the same breath is unreliable on iOS; never unmounting the modal avoids it.
 *
 * Built on React Native's `Modal` rather than a sheet library: no native code
 * beyond what Expo Go ships, and a sheet hands its result back through plain
 * props instead of through a route. It closes on the scrim, the close button
 * and the Android back button; there is no drag-to-dismiss.
 *
 * The panel is marked modal for screen readers, which hides everything beside
 * it — the scrim included. That is intended: the close button is the way out
 * there, and a second, screen-sized "Close" would only be noise.
 */
export function SheetHost({
  visible,
  onClose,
  size = 'content',
  children,
  testID,
}: SheetHostProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  // State, not a ref: the value is read while rendering (it is in the style
  // below), which a ref must not be. It is created once and never set again.
  const [offset] = useState(() => new Animated.Value(ENTER_OFFSET));

  useEffect(() => {
    if (!visible) return;

    offset.setValue(ENTER_OFFSET);
    Animated.timing(offset, {
      toValue: 0,
      duration: 180,
      // The native driver does not exist on web, and asking for it there warns.
      useNativeDriver: Platform.OS !== 'web',
    }).start();
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
            size === 'tall' && styles.fill,
            {
              backgroundColor: theme.surface,
              // A tall sheet stops short of the status bar so the screen behind
              // still reads as "underneath".
              marginTop: insets.top + 48,
              transform: [{ translateY: offset }],
            },
          ]}>
          <SheetCloseContext value={onClose}>{children}</SheetCloseContext>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export type SheetFrameProps = {
  title: string;
  /** One line under the title saying what the sheet will do. */
  subtitle?: string;
  children: ReactNode;
  /** Pinned under the content: the confirm button and its side links. */
  footer?: ReactNode;
  /**
   * Lets the body fill the panel and scroll inside it. Set it on the frame of a
   * `tall` host; a `content` host sizes itself to the body instead.
   */
  fill?: boolean;
  /** Drops the side gutters, for bodies that draw edge-to-edge rows. */
  flush?: boolean;
};

/** What a sheet shows: grabber, title row with a close button, body, footer. */
export function SheetFrame({
  title,
  subtitle,
  children,
  footer,
  fill = false,
  flush = false,
}: SheetFrameProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const onClose = use(SheetCloseContext);
  const bottom = Math.max(insets.bottom, 20);

  return (
    <View style={fill && styles.fill}>
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
        {onClose ? (
          <IconButton
            icon={XIcon}
            accessibilityLabel="Close"
            onPress={onClose}
            variant="soft"
            size={40}
          />
        ) : null}
      </View>

      <View style={[styles.body, flush && styles.flush, fill && styles.fill]}>{children}</View>

      {footer ? (
        <View
          style={[styles.footer, { borderTopColor: theme.borderSubtle, paddingBottom: bottom }]}>
          {footer}
        </View>
      ) : (
        <View style={{ height: bottom }} />
      )}
    </View>
  );
}

export type SheetProps = Omit<SheetHostProps, 'children'> & Omit<SheetFrameProps, 'fill'>;

/**
 * A bottom sheet with one fixed purpose: a host and its frame together. Screens
 * that move between several sheets use `SheetHost` and `SheetFrame` directly.
 */
export function Sheet({ visible, onClose, size = 'content', testID, ...frame }: SheetProps) {
  return (
    <SheetHost visible={visible} onClose={onClose} size={size} testID={testID}>
      <SheetFrame {...frame} fill={size === 'tall'} />
    </SheetHost>
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
  fill: {
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
  flush: {
    paddingHorizontal: 0,
  },
  footer: {
    borderTopWidth: 1,
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
});
