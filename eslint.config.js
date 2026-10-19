// ESLint 9 flat config — replaces .eslintrc.json (ESLint 9 no longer reads it). Same rules as before:
// eslint:recommended + prettier, browser code, `_`-prefixed arguments may be unused.
import js from "@eslint/js"
import globals from "globals"
import prettier from "eslint-config-prettier"

export default [
  { ignores: ["dist/**", "server/**", "release/**", "jcr_root/**", "crx-package/**", "target/**"] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser },
    },
    rules: {
      "no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
    },
  },
  {
    files: ["tests/**/*.js", "webpack.config.js", "eslint.config.js"],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ["**/*.cjs"],
    languageOptions: { sourceType: "commonjs", globals: { ...globals.node } },
  },
  prettier,
]
