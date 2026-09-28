import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getReactNativePersistence, initializeAuth, type Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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

function assertConfigured() {
  const missing = Object.entries(firebaseConfig)
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
  assertConfigured();
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

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
