import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { STARTING_TOKENS } from "./lib/pricing";

test("image credit service functionality", async () => {
  const t = convexTest(schema, import.meta.glob("./**/*.*s"));

  // Create a test user first
  await t
    .withIdentity({ subject: "test_user_123" })
    .mutation(api.users.getOrCreateUser, {
      clerkId: "test_user_123",
      email: "test@example.com",
      name: "Test User",
    });

  // Test getting user image credits
  const initialCredits = await t.query(
    api.imageCreditService.getUserImageCredits,
    {
      userId: "test_user_123",
    },
  );
  expect(initialCredits).toBe(STARTING_TOKENS); // Initial credits from user creation

  // Test checking if user has credits for duel
  const hasCredits = await t.query(
    api.imageCreditService.hasImageCreditsForDuel,
    {
      userId: "test_user_123",
    },
  );
  expect(hasCredits).toBe(true);

  // Test awarding credits
  await t.mutation(internal.imageCreditService.awardImageCredit, {
    userId: "test_user_123",
    amount: 5,
    source: "ADMIN_GRANT",
    metadata: { reason: "test_award" },
  });

  const creditsAfterAward = await t.query(
    api.imageCreditService.getUserImageCredits,
    {
      userId: "test_user_123",
    },
  );
  expect(creditsAfterAward).toBe(STARTING_TOKENS + 5);

  // Test credit history
  const history = await t.query(api.imageCreditService.getImageCreditHistory, {
    userId: "test_user_123",
    limit: 10,
  });
  expect(history.length).toBeGreaterThan(0);
  expect(history[0].type).toBe("EARNED"); // Most recent should be the award
  expect(history[0].amount).toBe(5);
});

test("a player without tokens can't start a duel", async () => {
  const t = convexTest(schema, import.meta.glob("./**/*.*s"));

  await t
    .withIdentity({ subject: "broke_user_123" })
    .mutation(api.users.getOrCreateUser, {
      clerkId: "broke_user_123",
      email: "broke@example.com",
      name: "Broke User",
    });
  await t.run(async (ctx) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", "broke_user_123"))
      .first();
    await ctx.db.patch(user!._id, { imageCredits: 0 });
  });

  const hasCreditsForDuel = await t.query(
    api.imageCreditService.hasImageCreditsForDuel,
    {
      userId: "broke_user_123",
    },
  );
  expect(hasCreditsForDuel).toBe(false);
});
