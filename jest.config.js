const preset = require('jest-expo/jest-preset');

// The firebase packages ship untranspiled ESM, so Jest has to run Babel over them.
// jest-expo's own ignore pattern is an allow-list inside a negative lookahead;
// these names get appended to it rather than the whole pattern being restated,
// so an upstream change to the preset's list is not silently overwritten.
const ESM_PACKAGES_TO_TRANSFORM = ['firebase', '@firebase'];

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
