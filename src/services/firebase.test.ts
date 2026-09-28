// Importing this module pulls in the real firebase/auth, which also proves Jest
// transforms the firebase ESM bundles (see transformIgnorePatterns in jest.config.js).
import { getFirebaseAuth } from '@/services/firebase';

describe('getFirebaseAuth', () => {
  it('fails with an actionable message when env config is missing', () => {
    expect(() => getFirebaseAuth()).toThrow(/Copy \.env\.example to \.env/);
  });
});
