import { describeReadError } from '@/lib/read-error';

describe('describeReadError', () => {
  it('singles out a missing index, which a retry will never fix', () => {
    const error = new Error('The query requires an index. You can create it here: https://…');
    expect(describeReadError(error, 'Could not load your plans.')).toContain('Firestore index');
  });

  it('names a permission refusal', () => {
    const error = Object.assign(new Error('Missing or insufficient permissions.'), {
      code: 'permission-denied',
    });
    expect(describeReadError(error, 'Could not load your plans.')).toBe(
      'You do not have access to this data.',
    );
  });

  it('falls back to what the caller was reading', () => {
    expect(describeReadError(new Error('network'), 'Could not load your plans.')).toBe(
      'Could not load your plans.',
    );
  });
});
