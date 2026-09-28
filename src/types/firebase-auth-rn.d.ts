// `getReactNativePersistence` ships in the React Native bundle of firebase/auth
// (resolved via the "react-native" export condition) but is absent from the
// TypeScript entry point, so it has to be declared here.
// Upstream: https://github.com/firebase/firebase-js-sdk/issues/9316
//
// The import below is what makes this file a module, so the `declare module`
// below augments firebase/auth instead of replacing its type definitions.
import type { Persistence } from 'firebase/auth';

declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: {
    setItem(key: string, value: string): Promise<void>;
    getItem(key: string): Promise<string | null>;
    removeItem(key: string): Promise<void>;
  }): Persistence;
}
