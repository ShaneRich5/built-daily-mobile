import { Alert, Platform } from 'react-native';

import { confirm } from '@/services/confirm';

type AlertButton = { text: string; style?: string; onPress?: () => void };

describe('confirm', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Platform.OS = originalOS;
    jest.restoreAllMocks();
  });

  describe('on a phone', () => {
    beforeEach(() => {
      Platform.OS = 'ios';
    });

    function ask() {
      const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      const answer = confirm({
        title: 'Remove Bench?',
        message: 'Its sets go with it.',
        confirmLabel: 'Remove',
        destructive: true,
      });
      const [title, message, buttons, options] = alert.mock.calls[0] as [
        string,
        string,
        AlertButton[],
        { onDismiss?: () => void },
      ];

      return { answer, title, message, buttons, options };
    }

    it('shows the platform alert with a cancel and a confirm button', () => {
      const { title, message, buttons } = ask();

      expect(title).toBe('Remove Bench?');
      expect(message).toBe('Its sets go with it.');
      expect(buttons.map((button) => [button.text, button.style])).toEqual([
        ['Cancel', 'cancel'],
        ['Remove', 'destructive'],
      ]);
    });

    it('resolves true when confirmed', async () => {
      const { answer, buttons } = ask();
      buttons[1].onPress?.();

      await expect(answer).resolves.toBe(true);
    });

    it('resolves false when cancelled', async () => {
      const { answer, buttons } = ask();
      buttons[0].onPress?.();

      await expect(answer).resolves.toBe(false);
    });

    // Android lets an alert be dismissed by tapping outside it.
    it('resolves false when dismissed without choosing', async () => {
      const { answer, options } = ask();
      options.onDismiss?.();

      await expect(answer).resolves.toBe(false);
    });
  });

  // React Native's Alert does nothing on web, so the browser's own is used.
  describe('on web', () => {
    beforeEach(() => {
      Platform.OS = 'web';
    });

    it('asks with the browser dialog and returns its answer', async () => {
      const browser = jest.fn().mockReturnValue(true);
      (globalThis as { window?: unknown }).window = { confirm: browser };

      await expect(
        confirm({ title: 'Remove Bench?', message: 'Its sets go with it.', confirmLabel: 'Remove' }),
      ).resolves.toBe(true);
      expect(browser).toHaveBeenCalledWith('Remove Bench?\n\nIts sets go with it.');
    });
  });
});
