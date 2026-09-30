import { render, screen } from '@testing-library/react-native';

import { StatusBadge } from '@/components/status-badge';

describe('StatusBadge', () => {
  it('shows a completed workout, not only an unfinished one', async () => {
    await render(<StatusBadge status="completed" />);

    expect(screen.getByText('Completed')).toBeTruthy();
  });

  it('shows an in-progress workout', async () => {
    await render(<StatusBadge status="in_progress" />);

    expect(screen.getByText('In progress')).toBeTruthy();
  });

  it('shows a discarded workout', async () => {
    await render(<StatusBadge status="discarded" />);

    expect(screen.getByText('Discarded')).toBeTruthy();
  });
});
