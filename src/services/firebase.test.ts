// Importing this module pulls in the real firebase/auth, which also proves Jest
// transforms the firebase ESM bundles (see transformIgnorePatterns in jest.config.js).
import { assertConfigured } from '@/services/firebase';

describe('assertConfigured', () => {
  it('names every missing key so the fix is obvious', () => {
    expect(() => assertConfigured({ apiKey: 'set', projectId: '', appId: undefined })).toThrow(
      /missing: projectId, appId/,
    );
  });

  it('points at the .env setup step', () => {
    expect(() => assertConfigured({ apiKey: '' })).toThrow(/Copy \.env\.example to \.env/);
  });

  it('passes when every value is present', () => {
    expect(() => assertConfigured({ apiKey: 'a', projectId: 'b' })).not.toThrow();
  });
});
