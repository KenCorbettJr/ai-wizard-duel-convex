import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

describe("Text-Only Mode Functionality", () => {
  test("should check image credits before generating illustrations", async () => {
    const t = convexTest(schema);

    // Create a user with sufficient credits
    await t.mutation(internal.users.createUserInternal, {
      clerkId: "user456",
      email: "test2@example.com",
      name: "Test User 2",
      imageCredits: 5,
    });

    // Test credit checking
    const hasCredits = await t.query(
      api.imageCreditService.hasImageCreditsForDuel,
      {
        userId: "user456",
      }
    );

    expect(hasCredits).toBe(true);

    // Test credit consumption
    const consumed = await t.mutation(
      api.imageCreditService.consumeImageCredit,
      {
        userId: "user456",
        metadata: { purpose: "test" },
      }
    );

    expect(consumed).toBe(true);

    // Check remaining credits
    const remainingCredits = await t.query(
      api.imageCreditService.getUserImageCredits,
      {
        userId: "user456",
      }
    );

    expect(remainingCredits).toBe(4);
  });

  test("should handle premium users with unlimited credits", async () => {
    const t = convexTest(schema);

    // Create a premium user
    await t.mutation(internal.users.createUserInternal, {
      clerkId: "premium123",
      email: "premium@example.com",
      name: "Premium User",
      imageCredits: 0, // No credits but premium
      subscriptionTier: "PREMIUM",
      subscriptionStatus: "ACTIVE",
    });

    // Test that premium user has unlimited credits
    const hasCredits = await t.query(
      api.imageCreditService.hasImageCreditsForDuel,
      {
        userId: "premium123",
      }
    );

    expect(hasCredits).toBe(true);

    // Test credit consumption for premium user
    const consumed = await t.mutation(
      api.imageCreditService.consumeImageCredit,
      {
        userId: "premium123",
        metadata: { purpose: "premium_test" },
      }
    );

    expect(consumed).toBe(true);

    // Credits should remain 0 for premium users (unlimited)
    const remainingCredits = await t.query(
      api.imageCreditService.getUserImageCredits,
      {
        userId: "premium123",
      }
    );

    expect(remainingCredits).toBe(0); // Still 0 because premium users don't consume actual credits
  });
});
