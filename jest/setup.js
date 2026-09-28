// AsyncStorage is a native module, so it has no implementation under Jest.
// The package ships an in-memory mock for exactly this; Firebase Auth's
// persistence layer depends on it, so anything importing the firebase service
// needs this in place.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
