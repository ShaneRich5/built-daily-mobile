const preset = require('jest-expo/jest-preset');

// Packages Jest has to run Babel over rather than load as-is: the firebase ones
// ship untranspiled ESM, and react-native-body-highlighter ships raw JSX inside
// its `dist/*.js` (Metro transpiles node_modules, so only Jest trips on it).
// jest-expo's own ignore pattern is an allow-list inside a negative lookahead;
// these names get appended to it rather than the whole pattern being restated,
// so an upstream change to the preset's list is not silently overwritten.
const ESM_PACKAGES_TO_TRANSFORM = ['firebase', '@firebase', 'react-native-body-highlighter'];

module.exports = {
  ...preset,
  transform: {
    ...preset.transform,
    // @firebase/util imports a sibling `postinstall.mjs`, and the preset's own
    // transform key only covers .js/.jsx/.ts/.tsx — so .mjs reaches Jest as raw
    // ESM and fails to parse. Reuse the preset's Babel setup for it.
    '\\.mjs$': preset.transform['\\.[jt]sx?$'],
  },
  transformIgnorePatterns: preset.transformIgnorePatterns.map((pattern, index) =>
    index === 0 ? pattern.replace(/\)\)$/, `|${ESM_PACKAGES_TO_TRANSFORM.join('|')}))`) : pattern,
  ),
  moduleNameMapper: {
    // Must precede the preset's `^@/(.*)$` alias, which would otherwise resolve
    // `@/global.css` to the real stylesheet and hand Jest CSS to parse as JS.
    '\\.css$': '<rootDir>/jest/css-stub.js',
    ...preset.moduleNameMapper,
  },
  setupFiles: [...(preset.setupFiles ?? []), '<rootDir>/jest/setup.js'],
};
