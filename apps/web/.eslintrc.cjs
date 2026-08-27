/**
 * Frontend ESLint (established in Phase 4 — no config existed before).
 * Rules follow eslint + @typescript-eslint recommended sets. Nothing is
 * globally suppressed; findings are reported honestly in the Phase 4 docs.
 */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    // Standard convention: underscore-prefixed = intentionally unused.
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
  },
  env: { browser: true, es2021: true, node: true },
  ignorePatterns: ['dist', 'dev-dist', 'node_modules', '*.bak*', '*.cjs'],
  overrides: [
    {
      files: ['tests/**/*.ts', 'scripts/**/*.ts'],
      env: { node: true },
    },
  ],
};
