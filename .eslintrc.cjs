module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    // Last, so Prettier owns formatting and ESLint only reports real problems
    'prettier',
  ],
  ignorePatterns: [
    'dist',
    'node_modules',
    '.eslintrc.cjs',
    'coverage',
    'playwright-report',
    'test-results',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    // The handbook forbids `any`
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
    ],
  },
  overrides: [
    {
      files: ['*.config.js', '*.config.ts', '**/*.test.ts', '**/*.test.tsx'],
      env: { node: true },
    },
    {
      // Playwright specs run in Node; page.evaluate callbacks run in the browser.
      files: ['e2e/**/*.ts', 'playwright.config.ts'],
      env: { node: true, browser: true },
      rules: {
        'react-refresh/only-export-components': 'off',
        'react-hooks/rules-of-hooks': 'off',
      },
    },
  ],
}
