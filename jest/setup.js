// AsyncStorage is a native module, so it has no implementation under Jest.
// The package ships an in-memory mock for exactly this; Firebase Auth's
// persistence layer depends on it, so anything importing the firebase service
// needs this in place.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// jest-expo auto-mocks native modules, and the stub for `expo-crypto` returns
// undefined from `randomUUID()` — which would hand every new session line the
// same empty id. Node's own implementation stands in for the real one.
jest.mock('expo-crypto', () => ({
  randomUUID: () => require('node:crypto').randomUUID(),
}));
