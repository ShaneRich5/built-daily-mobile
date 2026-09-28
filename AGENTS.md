This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npm test                    # run the Jest suite once (jest --watchAll=false)
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint, typecheck, and the test suite before declaring any task done. CI (`.github/workflows/ci.yml`) runs the same three checks on every PR — a task isn't done if any of them fail there.

## Code quality & testing

- **Separate domain logic from UI.** `src/types/` for plain data types, `src/services/` for I/O (Firestore, network — the only place that imports the Firebase SDK), `src/app/` for route composition only. Screens and components call service functions; they don't talk to Firestore directly. This mirrors the web app's `lib/*-repository.ts` / `lib/*-mapper.ts` split and is what makes the domain layer testable without mocking Firestore in every test.
- **Prefer pure functions for anything with logic** (computing derived fields, status transitions, formatting) — easy to unit test, easy to reason about.
- **TypeScript strict mode stays on** (`tsconfig.json` `strict: true`). Don't loosen it to unblock a change; fix the type instead.
- **Testing stack:** Jest with the `jest-expo` preset, `@testing-library/react-native` (**not** `react-test-renderer` — it doesn't support React 19+, which this project is on) for component tests. `@testing-library/react-native`'s `render()` is async in the installed version — always `await render(...)` before querying `screen`.
- **E2E:** not set up yet. When it is, use Maestro via EAS Workflows (Expo's recommended E2E tool) — it requires a development build, not Expo Go, so it only affects CI build profiles, not the Expo Go link used for tester distribution.
- Add tests alongside the code they cover (e.g. `foo.ts` + `foo.test.ts`), not as a separate backfill pass.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
