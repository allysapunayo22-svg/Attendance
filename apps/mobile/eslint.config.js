// Compose Expo's pinned flat-config modules directly. Importing the aggregate
// package from this npm workspace resolves its internal `eslint/config` lookup
// against the Admin app's ESLint 8 installation instead of Mobile's ESLint 9.
const coreConfig = require("eslint-config-expo/flat/utils/core.js");
const expoConfig = require("eslint-config-expo/flat/utils/expo.js");
const reactConfig = require("eslint-config-expo/flat/utils/react.js");
const typescriptConfig = require("eslint-config-expo/flat/utils/typescript.js");
const { allExtensions } = require("eslint-config-expo/flat/utils/extensions.js");
const globals = require("globals");

module.exports = [
  ...coreConfig,
  ...typescriptConfig,
  ...reactConfig,
  ...expoConfig,
  {
    settings: {
      "import/extensions": allExtensions,
      "import/resolver": { node: { extensions: allExtensions } }
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        __DEV__: "readonly",
        ErrorUtils: false,
        FormData: false,
        XMLHttpRequest: false,
        alert: false,
        cancelAnimationFrame: false,
        cancelIdleCallback: false,
        clearImmediate: false,
        fetch: false,
        navigator: false,
        process: false,
        requestAnimationFrame: false,
        requestIdleCallback: false,
        setImmediate: false,
        window: false,
        "shared-node-browser": true
      }
    }
  },
  {
    rules: {
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react/no-unescaped-entities": "warn"
    }
  },
  {
    ignores: [".expo/**", "dist/**"]
  }
];
