import { defineConfig } from "cypress";

export default defineConfig({
  // Cypress 16 removed Cypress.env(). These are public, non-sensitive config
  // values (a local emulator URL and a test-only Clerk publishable key), so
  // they move to a top-level `expose` block and are read synchronously via
  // Cypress.expose(key) in tests/support. Secrets would use cy.env() instead.
  expose: {
    CONVEX_URL: "http://localhost:3210",
    CLERK_PUBLISHABLE_KEY:
      "pk_test_Z2VudWluZS1wb2xsaXdvZy04OS5jbGVyay5hY2NvdW50cy5kZXYk",
  },
  e2e: {
    baseUrl: "http://localhost:3000",
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    setupNodeEvents() {
      // implement node event listeners here
    },
    specPattern: "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}",
    supportFile: "cypress/support/e2e.ts",
  },
  component: {
    devServer: {
      framework: "next",
      bundler: "webpack",
    },
    specPattern: "cypress/component/**/*.cy.{js,jsx,ts,tsx}",
    supportFile: "cypress/support/component.ts",
  },
});
