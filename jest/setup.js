// AsyncStorage is a native module, so it has no implementation under Jest.
// The package ships an in-memory mock for exactly this; Firebase Auth's
// persistence layer depends on it, so anything importing the firebase service
// needs this in place.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Safe-area insets come from a native provider that does not exist under Jest;
// without it `useSafeAreaInsets` throws. The package's own mock answers with
// zero insets, so a component under test does not need wrapping in a provider.
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

// jest-expo auto-mocks native modules, and the stub for `expo-crypto` returns
// undefined from `randomUUID()` — which would hand every new session line the
// same empty id. Node's own implementation stands in for the real one.
jest.mock('expo-crypto', () => ({
  randomUUID: () => require('node:crypto').randomUUID(),
}));

// Keeping group rosters in step runs in the background after a workout,
// activity, goal or planner write. It reads and writes Firestore on a timer,
// which a component test has no business doing: it is a no-op here, and a
// test that cares asserts on the mock.
jest.mock('@/services/group-sync');
