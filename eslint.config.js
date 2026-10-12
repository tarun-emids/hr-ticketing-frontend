// ESLint flat config: React-specific lint rules over the recommended core set.
// Runs as `npm run lint` and inside the pre-commit hook (lint-staged).
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

// Vitest injects its own globals (describe/it/expect/vi, ...) — without this
// the *.test.jsx files would fail on undefined-globals.
const vitestGlobals = {
  describe: "readonly",
  it: "readonly",
  test: "readonly",
  expect: "readonly",
  vi: "readonly",
  beforeEach: "readonly",
  afterEach: "readonly",
  beforeAll: "readonly",
  afterAll: "readonly",
};

export default [
  { ignores: ["dist/", "node_modules/", "coverage/"] },
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser },
    },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Za-z_$]" }],
      "react-refresh/only-export-components": "off",
    },
  },
  {
    files: ["src/**/*.test.{js,jsx}", "src/**/setup.{js,jsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...vitestGlobals },
    },
  },
  {
    files: ["*.config.js", ".husky/**"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
];
