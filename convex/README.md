# Convex Function Testing

This directory contains unit tests for Convex functions using the `convex-test` library.

## Setup

The testing environment is configured to use:

- **Vitest** as the test runner
- **convex-test** for mocking the Convex backend
- **@edge-runtime/vm** for better compatibility with Convex runtime

## Running Tests

```bash
# Run tests in watch mode
npm run test

# Run tests once
npm run test:once

# Run tests with coverage
npm run test:coverage

# Debug tests
npm run test:debug
```

## Test Files

### `wizards.test.ts`

Tests for wizard-related functions:

- Creating wizards
- Querying wizards by user
- Updating wizard stats
- Deleting wizards

### `duels.test.ts`

Tests for duel-related functions:

- Creating duels
- Finding duels by shortcode
- Managing duel status
- Querying player duels

### `aiTextGeneration.test.ts`

Tests for AI text generation with proper mocking of external dependencies.

## Writing Tests

### Basic Test Structure

```typescript
import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

describe("My Function", () => {
  test("should do something", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.*s"));

    // Test your function
    const result = await t.query(api.myFunction.myQuery, { arg: "value" });

    expect(result).toBe("expected");
  });
});
```

### Creating Test Data

To avoid issues with scheduled functions, create test data directly in the database:

```typescript
const wizardId = await t.run(async (ctx) => {
  return await ctx.db.insert("wizards", {
    owner: "user123",
    name: "Test Wizard",
    description: "A test wizard",
    wins: 0,
    losses: 0,
    isAIPowered: false,
  });
});
```

### Mocking External Dependencies

For functions that use external APIs or services:

```typescript
import { vi } from "vitest";

// Mock before importing
vi.mock("./externalService", () => ({
  serviceFunction: vi.fn(),
}));

import { myFunction } from "./myFunction";

test("should handle external service", async () => {
  const { serviceFunction } = await import("./externalService");
  serviceFunction.mockResolvedValue("mocked result");

  const result = await myFunction();
  expect(result).toBe("expected");
});
```

## Testing Scheduled Functions

For functions that use `ctx.scheduler.runAfter()`, you can test them using Vitest's fake timers:

```typescript
import { vi } from "vitest";

test("should schedule function", async () => {
  vi.useFakeTimers();

  const t = convexTest(schema, import.meta.glob("./**/*.*s"));

  // Call function that schedules something
  await t.mutation(api.myFunction.scheduleTask, { delay: 5000 });

  // Advance time
  vi.advanceTimersByTime(6000);

  // Wait for scheduled functions to complete
  await t.finishInProgressScheduledFunctions();

  // Assert results
  const result = await t.query(api.myFunction.getResult, {});
  expect(result).toBeTruthy();

  vi.useRealTimers();
});
```

## Best Practices

1. **Use `t.run()` for direct database operations** to avoid triggering scheduled functions during test setup
2. **Mock external dependencies** to make tests fast and reliable
3. **Test business logic, not implementation details** - focus on the function's behavior
4. **Use descriptive test names** that explain what the test is verifying
5. **Keep tests isolated** - each test should be independent and not rely on other tests
6. **Test error cases** as well as happy paths

## Limitations

The `convex-test` library is a mock implementation, so it doesn't have all the behaviors of the real Convex backend:

- Error messages may differ
- Size and time limits are not enforced
- ID format may be different
- Some runtime built-ins may behave differently

Always test your functions manually in the real Convex environment as well.
