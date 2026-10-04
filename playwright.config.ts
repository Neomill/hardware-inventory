import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests against the Vite dev server.
 *
 * The bundled Chromium is used by default (`npx playwright install chromium`).
 * Where that download is not possible, set PW_CHANNEL to an installed browser
 * channel instead, e.g. `PW_CHANNEL=msedge npm run test:e2e`.
 *
 * Port 5180, not the usual 5173, so e2e never collides with a dev server or
 * demo already running on 5173. An existing server on 5180 is reused.
 *
 * Every test gets a fresh browser context, so localStorage is empty and the app
 * starts from its seed data.
 */
const PORT = 5180
const BASE_URL = `http://localhost:${PORT}/olaer-store/`
const channel = process.env.PW_CHANNEL || undefined

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 60_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: BASE_URL,
    channel,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'en-PH',
    timezoneId: 'Asia/Manila',
    // Vite transforms modules on first request, so a cold page load is slow.
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], channel, viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'tablet',
      use: {
        ...devices['Desktop Chrome'],
        channel,
        viewport: { width: 768, height: 1024 },
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
