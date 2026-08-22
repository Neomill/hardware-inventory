import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

/**
 * GitHub Pages serves project sites from https://<user>.github.io/<repo>/,
 * so every asset URL needs the repository name as its base path.
 * Override with VITE_BASE=/ when serving from a custom domain or root.
 */
const base = process.env.VITE_BASE ?? '/hardware-inventory/'

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
  },
})
