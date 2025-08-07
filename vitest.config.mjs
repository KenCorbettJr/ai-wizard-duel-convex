import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environmentMatchGlobs: [
      // all tests in convex/ will run in edge-runtime
      ["convex/**", "edge-runtime"],
      // all other tests use jsdom
      ["**", "jsdom"],
    ],
    setupFiles: ['./src/tests/setup.ts', './convex/test-setup.ts'],
    server: { deps: { inline: ["convex-test"] } },
    // Suppress console output during tests for cleaner output
    silent: false,
    reporter: ['verbose'],
    onConsoleLog: () => false, // Suppress console.log during tests
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})