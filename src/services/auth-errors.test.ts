import { authErrorMessage } from '@/services/auth-errors';

describe('authErrorMessage', () => {
  it('maps a known Firebase error code to a readable message', () => {
    expect(authErrorMessage({ code: 'auth/email-already-in-use' })).toBe(
      'An account already exists for that email.',
    );
  });

  it('does not reveal which of email or password was wrong', () => {
    const forWrongPassword = authErrorMessage({ code: 'auth/wrong-password' });

    expect(forWrongPassword).toBe(authErrorMessage({ code: 'auth/user-not-found' }));
  });

  it('falls back to a generic message for unknown codes', () => {
    expect(authErrorMessage({ code: 'auth/some-future-code' })).toBe(
      'Something went wrong. Please try again.',
    );
  });

  it('handles errors that are not Firebase errors at all', () => {
    expect(authErrorMessage(new Error('boom'))).toBe('Something went wrong. Please try again.');
    expect(authErrorMessage(undefined)).toBe('Something went wrong. Please try again.');
  });
});
