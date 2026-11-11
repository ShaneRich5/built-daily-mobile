import { Alert, Platform } from 'react-native';

export type ConfirmOptions = {
  title: string;
  message?: string;
  /** The button that goes ahead: "Remove", "Delete workout". */
  confirmLabel: string;
  /** Draws the confirm button as destructive (red on iOS). */
  destructive?: boolean;
};

/**
 * Asks before something that cannot be undone, and resolves to the answer.
 *
 * A service rather than a component because it is the platform's own dialog:
 * `Alert` on iOS and Android, and `window.confirm` on web — where React Native's
 * `Alert.alert` does nothing at all, so a screen calling it directly would
 * silently never confirm.
 */
export function confirm({
  title,
  message,
  confirmLabel,
  destructive = false,
}: ConfirmOptions): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(message ? `${title}\n\n${message}` : title));
  }

  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        {
          text: confirmLabel,
          style: destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      // Android can dismiss by tapping outside; that is a "no".
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
