import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth, type Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

// Expo only inlines `process.env.EXPO_PUBLIC_*` read with static dot notation —
// destructuring or bracket access silently yields undefined at runtime.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Takes the config rather than reading module state, so it is testable without
// depending on which env vars happen to be set when the suite runs.
export function assertConfigured(config: Record<string, string | undefined>) {
  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Firebase config is incomplete (missing: ${missing.join(', ')}). ` +
        'Copy .env.example to .env and fill in the values from the Firebase console, then restart the dev server.',
    );
  }
}

function createAuth(): Auth {
  assertConfigured(firebaseConfig);
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

  // `getReactNativePersistence` only exists in the react-native bundle of
  // firebase/auth (see src/types/firebase-auth-rn.d.ts). The web build resolves
  // a bundle without it, so calling it there throws and takes the whole app
  // down at startup. `getAuth` is in both bundles and already defaults to
  // browser-local persistence, which is the same survives-a-restart intent.
  if (Platform.OS === 'web') return getAuth(app);

  // initializeAuth (not getAuth) so the session survives an app restart via AsyncStorage.
  return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
}

let authInstance: Auth | undefined;

export function getFirebaseAuth(): Auth {
  authInstance ??= createAuth();
  return authInstance;
}

export function getDb() {
  return getFirestore(getFirebaseAuth().app);
}
