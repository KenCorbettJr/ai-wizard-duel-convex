// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import "./commands";

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Add custom assertions
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to wait for Convex to be ready
       * @example cy.waitForConvex()
       */
      waitForConvex(): Chainable<void>;

      /**
       * Custom command to sign in with test user
       * @example cy.signInTestUser()
       */
      signInTestUser(): Chainable<void>;

      /**
       * Custom command to create a test wizard
       * @example cy.createTestWizard('Test Wizard', 'A test wizard for e2e testing')
       */
      createTestWizard(name: string, description: string): Chainable<void>;

      /**
       * Custom command to wait for element with data-testid
       * @example cy.getByTestId('wizard-card')
       */
      getByTestId(testId: string): Chainable<JQuery<HTMLElement>>;
    }
  }
}
