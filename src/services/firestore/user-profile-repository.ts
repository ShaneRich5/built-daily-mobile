import { doc, getDoc, setDoc } from 'firebase/firestore';

import {
  type AuthIdentity,
  displayNameFromAuth,
  profileAfterSignIn,
  resolveDeviceTimezone,
} from '@/lib/user-profile';
import { getDb } from '@/services/firebase';
import { fromUserProfile, toUserProfile } from '@/services/firestore/user-profile-mapper';

type SignedInUser = AuthIdentity & { uid: string };

/**
 * Calls run one after another, never side by side. Sign-up triggers two in
 * quick succession — the auth listener fires as the account is created, and
 * again once the chosen name has been set on it — and each is a read followed
 * by a write, so overlapping them could leave the earlier, nameless write on
 * top.
 */
let queue: Promise<void> = Promise.resolve();

/**
 * Makes sure `users/{uid}` exists and has the current name and timezone.
 *
 * The web app does this on every sign-in; mobile has to as well, or an account
 * created on the phone has no profile document at all — and Groups, onboarding
 * and the public profile all read it.
 *
 * Best-effort by design: it never rejects, so a failed profile write cannot
 * block signing in. The next sign-in tries again.
 */
export function ensureUserProfile(user: SignedInUser): Promise<void> {
  queue = queue.then(() => writeProfileIfNeeded(user)).catch(() => {});
  return queue;
}

async function writeProfileIfNeeded(user: SignedInUser): Promise<void> {
  const ref = doc(getDb(), 'users', user.uid);
  const snapshot = await getDoc(ref);
  const data = snapshot.data();

  const next = profileAfterSignIn(
    data ? toUserProfile(data) : null,
    // Read here, not when the call was queued: sign-up sets the name on this
    // same user object a moment after the first call is made.
    { displayName: displayNameFromAuth(user), timezone: resolveDeviceTimezone() },
    new Date(),
  );

  if (next) await setDoc(ref, fromUserProfile(next), { merge: true });
}
