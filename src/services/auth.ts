import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';

import { getFirebaseAuth } from '@/services/firebase';
import { ensureUserProfile } from '@/services/firestore/user-profile-repository';

export async function signIn(email: string, password: string) {
  await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
}

export async function signUp(email: string, password: string, displayName: string) {
  const credential = await createUserWithEmailAndPassword(
    getFirebaseAuth(),
    email.trim(),
    password,
  );

  const trimmedName = displayName.trim();
  if (trimmedName) {
    await updateProfile(credential.user, { displayName: trimmedName });

    // The auth listener already asked for a profile the moment the account was
    // created — before it had this name — and it does not fire again for a
    // rename. So ask once more now that the name is set.
    await ensureUserProfile(credential.user);
  }
}

export async function signOut() {
  await firebaseSignOut(getFirebaseAuth());
}
