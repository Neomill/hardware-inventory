import path from 'node:path'
import react from '@vitejs/plugin-react'
import { configDefaults, defineConfig } from 'vitest/config'

/**
 * GitHub Pages serves project sites from https://<user>.github.io/<repo>/,
 * so every asset URL needs the repository name as its base path.
 * Override with VITE_BASE=/ when serving from a custom domain or root.
 */
const base = process.env.VITE_BASE ?? '/olaer-store/'

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // Playwright owns e2e/; its *.spec.ts files must never run under Vitest.
    exclude: [...configDefaults.exclude, 'e2e/**', 'playwright-report/**', 'test-results/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: 'coverage',
      // Still print numbers when a test fails, so gaps are visible either way.
      reportOnFailure: true,
      // Report on all of src so gaps are visible; enforce only where the rules live.
      include: ['src/**/*.{ts,tsx}'],
      // types.ts files hold only type declarations: no runtime code to cover.
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/test/**',
        'src/**/*.d.ts',
        'src/**/types.ts',
        'src/main.tsx',
      ],
      thresholds: {
        'src/domain/**': { lines: 90, functions: 90, statements: 90, branches: 85 },
        'src/stores/**': { lines: 90, functions: 90, statements: 90, branches: 85 },
      },
    },
  },
})
