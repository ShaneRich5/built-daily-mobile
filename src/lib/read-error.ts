/**
 * What to show when a Firestore read fails.
 *
 * `fallback` names the thing that could not be loaded ("Could not load your
 * plans."), so the two cases worth distinguishing — a missing index, which
 * needs a developer rather than a retry, and a permission refusal — can be
 * recognised in one place for every subscription.
 */
export function describeReadError(error: Error, fallback: string): string {
  if (error.message.includes('index')) {
    return 'This query needs a Firestore index. Check the dev server logs for the link that creates it.';
  }

  if ('code' in error && error.code === 'permission-denied') {
    return 'You do not have access to this data.';
  }

  return fallback;
}
