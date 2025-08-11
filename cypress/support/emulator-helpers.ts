// Helper functions for working with the Convex emulator during testing

export const setupTestData = () => {
  // This function would set up test data in the emulator
  // Implementation depends on your Convex setup
  cy.log("Setting up test data in emulator...");

  // Example: Create test users, wizards, duels
  cy.task("seedEmulatorData", {
    wizards: 3,
    duels: 2,
    users: 5,
  });
};

export const clearTestData = () => {
  // Clear all test data from emulator
  cy.log("Clearing test data from emulator...");

  cy.task("clearEmulatorData");
};

export const waitForEmulatorReady = () => {
  // Wait for emulator services to be ready
  cy.request({
    url: `${Cypress.env("CONVEX_URL")}/version`,
    timeout: 30000,
    retryOnStatusCodeFailure: true,
    retryOnNetworkFailure: true,
  }).should("have.property", "status", 200);

  // Also check that the Next.js app is ready
  cy.request({
    url: "http://localhost:3000",
    timeout: 30000,
    retryOnStatusCodeFailure: true,
    retryOnNetworkFailure: true,
  }).should("have.property", "status", 200);
};

export const mockAIServices = () => {
  // Set up mocks for AI services in emulator mode
  cy.intercept("POST", "**/ai/**", {
    statusCode: 200,
    body: {
      success: true,
      result: "Mock AI response for testing",
    },
  }).as("aiRequest");
};

export const createTestWizard = (wizardData: any) => {
  // Helper to create a test wizard via API
  return cy.request({
    method: "POST",
    url: `${Cypress.env("CONVEX_URL")}/api/wizards`,
    body: wizardData,
  });
};

export const createTestDuel = (duelData: any) => {
  // Helper to create a test duel via API
  return cy.request({
    method: "POST",
    url: `${Cypress.env("CONVEX_URL")}/api/duels`,
    body: duelData,
  });
};
