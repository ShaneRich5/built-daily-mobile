import { render, screen } from '@testing-library/react-native';

import { ThemedText } from '@/components/themed-text';

describe('ThemedText', () => {
  it('renders its children', async () => {
    await render(<ThemedText>Hello Built Daily</ThemedText>);

    expect(screen.getByText('Hello Built Daily')).toBeTruthy();
  });
});
