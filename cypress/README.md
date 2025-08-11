# Cypress E2E Testing for AI Wizard Duel

This directory contains comprehensive Cypress tests for the AI Wizard Duel application, specifically configured to work with the emulator mode.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Start the emulator and application:

```bash
npm run emulate
```

3. Run Cypress tests:

```bash
# Run tests in headless mode
npm run cypress:emulate

# Open Cypress UI for interactive testing
npm run cypress:emulate:open
```

## Test Structure

### E2E Tests (`cypress/e2e/`)

- **01-homepage.cy.ts** - Tests the main landing page functionality
- **02-navigation.cy.ts** - Tests navigation between pages
- **03-wizard-management.cy.ts** - Tests wizard creation, editing, and management
- **04-duel-creation.cy.ts** - Tests duel creation and spell casting
- **05-admin-features.cy.ts** - Tests admin dashboard and moderation features
- **06-emulator-specific.cy.ts** - Tests specific to emulator mode (mocks, local services)
- **07-full-user-journey.cy.ts** - Complete user flow tests

### Component Tests (`cypress/component/`)

- **WizardCard.cy.tsx** - Tests the WizardCard component in isolation
- **ThemeToggle.cy.tsx** - Tests theme switching functionality

### Support Files

- **commands.ts** - Custom Cypress commands
- **emulator-helpers.ts** - Helper functions for emulator testing
- **e2e.ts** - E2E test configuration and setup

### Fixtures

- **wizards.json** - Test data for wizard-related tests
- **duels.json** - Test data for duel-related tests

## Emulator Mode Testing

The tests are specifically designed to work with your emulator setup:

- **Local Convex Backend**: Tests connect to `http://localhost:3210`
- **Mock AI Services**: AI image generation and text processing use mocks
- **Local Database**: All data is stored in the emulator database
- **No External Dependencies**: Tests run completely offline

## Custom Commands

### `cy.waitForConvex()`

Waits for the Convex emulator to be ready before running tests.

### `cy.getByTestId(testId)`

Selects elements by `data-testid` attribute.

### `cy.signInTestUser()`

Signs in with a test user (implementation depends on your auth setup).

### `cy.createTestWizard(name, description)`

Creates a test wizard through the UI.

## Running Tests

### Development

```bash
# Start emulator and open Cypress UI
npm run cypress:emulate:open
```

### CI/CD

```bash
# Run all tests headlessly
npm run cypress:emulate
```

### Individual Test Files

```bash
# Run specific test file
npx cypress run --spec "cypress/e2e/01-homepage.cy.ts"
```

## Test Data Management

Tests use the emulator database, which can be reset between test runs:

```bash
# Clear emulator database
npm run clear-emulate-db
```

## Best Practices

1. **Use data-testid attributes** in your components for reliable element selection
2. **Wait for Convex** before each test to ensure backend is ready
3. **Use fixtures** for consistent test data
4. **Test error scenarios** as well as happy paths
5. **Keep tests independent** - each test should be able to run in isolation

## Debugging

1. Use `cy.debug()` to pause test execution
2. Use `cy.log()` to add custom logging
3. Screenshots are automatically taken on test failures
4. Use the Cypress UI for interactive debugging

## Configuration

The Cypress configuration is in `cypress.config.ts` and includes:

- Base URL pointing to localhost:3000
- Custom viewport sizes
- Environment variables for emulator URLs
- Timeouts optimized for local development

## Adding New Tests

1. Create test files in the appropriate directory (`e2e/` or `component/`)
2. Use descriptive test names and organize with `describe` blocks
3. Add any new test data to the `fixtures/` directory
4. Update this README if you add new custom commands or patterns
