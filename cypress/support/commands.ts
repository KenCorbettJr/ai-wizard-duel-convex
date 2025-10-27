/// <reference types="cypress" />
// import { mount } from "cypress/react";

// Custom command to wait for Convex to be ready
Cypress.Commands.add("waitForConvex", () => {
  cy.request({
    url: `${Cypress.env("CONVEX_URL")}/version`,
    timeout: 30000,
    retryOnStatusCodeFailure: true,
    retryOnNetworkFailure: true,
  }).should("have.property", "status", 200);
});

// Custom command to get elements by data-testid
Cypress.Commands.add("getByTestId", (testId: string) => {
  return cy.get(`[data-testid="${testId}"]`);
});

// Custom command to sign in with test user (for emulator mode)
Cypress.Commands.add("signInTestUser", () => {
  // In emulator mode, we can bypass Clerk authentication
  // This would need to be adapted based on your auth setup
  cy.visit("/");

  // Wait for the page to load
  cy.contains("AI Wizard Duel").should("be.visible");

  // Look for sign in button and click it
  cy.get("button").contains("Start Dueling").click();

  // In a real implementation, you might need to:
  // 1. Mock the Clerk authentication
  // 2. Use test credentials
  // 3. Set up test user session
});

// Custom command to create a test wizard
Cypress.Commands.add(
  "createTestWizard",
  (name: string, description: string) => {
    // Navigate to wizard creation
    cy.visit("/dashboard");

    // Wait for dashboard to load
    cy.contains("Dashboard").should("be.visible");

    // Click create wizard button (adjust selector based on your UI)
    cy.get("button").contains("Create Wizard").click();

    // Fill out wizard form
    cy.get('input[name="name"]').type(name);
    cy.get('textarea[name="description"]').type(description);

    // Submit form
    cy.get('button[type="submit"]').click();

    // Wait for wizard to be created
    cy.contains(name).should("be.visible");
  }
);

// Cypress.Commands.add("mount", mount);
