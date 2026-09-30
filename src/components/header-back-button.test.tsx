import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { HeaderBackButton } from '@/components/header-back-button';

jest.mock('expo-router', () => ({
  router: { canGoBack: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

const mockRouter = router as jest.Mocked<typeof router>;

describe('HeaderBackButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('pops back to wherever the workout was opened from', async () => {
    mockRouter.canGoBack.mockReturnValue(true);
    await render(<HeaderBackButton />);

    await userEvent.press(screen.getByLabelText('Back'));

    expect(mockRouter.back).toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('falls back to the session list when there is no history to pop', async () => {
    // A cold open on a deep link straight to a workout: `back()` would do
    // nothing and leave the button dead.
    mockRouter.canGoBack.mockReturnValue(false);
    await render(<HeaderBackButton />);

    await userEvent.press(screen.getByLabelText('Back'));

    expect(mockRouter.replace).toHaveBeenCalledWith('/');
    expect(mockRouter.back).not.toHaveBeenCalled();
  });
});
