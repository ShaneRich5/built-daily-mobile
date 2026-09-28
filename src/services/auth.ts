import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';

import { getFirebaseAuth } from '@/services/firebase';

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
  }
}

export async function signOut() {
  await firebaseSignOut(getFirebaseAuth());
}
