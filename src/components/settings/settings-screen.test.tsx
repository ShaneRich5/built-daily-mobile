import { render, screen, userEvent } from '@testing-library/react-native';
import * as Linking from 'expo-linking';

import { SettingsScreen } from '@/components/settings/settings-screen';
import { useSession } from '@/contexts/session';
import { createCalendarFeedUrl, getCalendarFeedUrl } from '@/services/calendar-feed';
import { confirm } from '@/services/confirm';

jest.mock('@/contexts/session');
jest.mock('@/services/auth');
jest.mock('@/services/confirm');
jest.mock('@/services/calendar-feed');
jest.mock('expo-linking', () => ({ openURL: jest.fn(() => Promise.resolve(true)) }));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
}));

const FEED = 'https://built-daily.example/api/calendar/bd_cal_abc123.ics';

beforeEach(() => {
  jest.mocked(useSession).mockReturnValue({
    user: { uid: 'user-1', email: 'sam@example.com' } as never,
    isLoading: false,
  });
  jest.mocked(confirm).mockResolvedValue(true);
});

afterEach(() => jest.clearAllMocks());

describe('Settings › Calendar', () => {
  it('makes a calendar link when there is none', async () => {
    jest.mocked(getCalendarFeedUrl).mockResolvedValue(null);
    jest.mocked(createCalendarFeedUrl).mockResolvedValue(FEED);
    await render(<SettingsScreen />);

    await userEvent.press(await screen.findByRole('button', { name: 'Make a calendar link' }));

    expect(createCalendarFeedUrl).toHaveBeenCalled();
    expect(await screen.findByRole('button', { name: 'Add to Apple Calendar' })).toBeTruthy();
  });

  it('subscribes in Apple Calendar with webcal, and in Google with its add-by-URL page', async () => {
    jest.mocked(getCalendarFeedUrl).mockResolvedValue(FEED);
    await render(<SettingsScreen />);

    await userEvent.press(await screen.findByRole('button', { name: 'Add to Apple Calendar' }));
    expect(Linking.openURL).toHaveBeenCalledWith(
      'webcal://built-daily.example/api/calendar/bd_cal_abc123.ics',
    );

    await userEvent.press(screen.getByRole('button', { name: 'Add to Google Calendar' }));
    expect(Linking.openURL).toHaveBeenLastCalledWith(
      expect.stringMatching(/^https:\/\/calendar\.google\.com\/calendar\/render\?cid=webcal%3A/),
    );
  });

  it('asks before swapping the link for a new one', async () => {
    jest.mocked(getCalendarFeedUrl).mockResolvedValue(FEED);
    jest.mocked(createCalendarFeedUrl).mockResolvedValue(`${FEED}2`);
    await render(<SettingsScreen />);

    await userEvent.press(await screen.findByRole('button', { name: 'Get a new link' }));

    expect(confirm).toHaveBeenCalled();
    expect(createCalendarFeedUrl).toHaveBeenCalled();
  });

  it('says so when the link can’t be loaded', async () => {
    jest.mocked(getCalendarFeedUrl).mockRejectedValue(new Error('503'));
    await render(<SettingsScreen />);

    expect(
      await screen.findByText(
        'Couldn’t load your calendar link. Check your connection and try again.',
      ),
    ).toBeTruthy();
  });
});
