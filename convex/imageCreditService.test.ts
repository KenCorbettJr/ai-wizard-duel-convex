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
  const initialCredits = await t
    .withIdentity({ subject: "test_user_123" })
    .query(api.imageCreditService.getUserImageCredits, {});
  expect(initialCredits).toBe(STARTING_TOKENS); // Initial credits from user creation

  // Test checking if user has credits for duel
  const hasCredits = await t
    .withIdentity({ subject: "test_user_123" })
    .query(api.imageCreditService.hasImageCreditsForDuel, {});
  expect(hasCredits).toBe(true);

  // Test awarding credits
  await t.mutation(internal.imageCreditService.awardImageCredit, {
    userId: "test_user_123",
    amount: 5,
    source: "ADMIN_GRANT",
    metadata: { reason: "test_award" },
  });

  const creditsAfterAward = await t
    .withIdentity({ subject: "test_user_123" })
    .query(api.imageCreditService.getUserImageCredits, {});
  expect(creditsAfterAward).toBe(STARTING_TOKENS + 5);

  // Test credit history
  const history = await t
    .withIdentity({ subject: "test_user_123" })
    .query(api.imageCreditService.getImageCreditHistory, { limit: 10 });
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

  const hasCreditsForDuel = await t
    .withIdentity({ subject: "broke_user_123" })
    .query(api.imageCreditService.hasImageCreditsForDuel, {});
  expect(hasCreditsForDuel).toBe(false);
});

test("token queries only answer for the signed-in player", async () => {
  const t = convexTest(schema, import.meta.glob("./**/*.*s"));
  await t.run(async (ctx) => {
    for (const [clerkId, imageCredits] of [
      ["rich_user", 40],
      ["snoop_user", 0],
    ] as const) {
      await ctx.db.insert("users", {
        clerkId,
        role: "user",
        imageCredits,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    await ctx.db.insert("imageCreditTransactions", {
      userId: "rich_user",
      type: "EARNED",
      amount: 40,
      source: "PURCHASE",
      createdAt: Date.now(),
    });
  });

  // Asking about someone else returns your own figures, not theirs
  const snoop = t.withIdentity({ subject: "snoop_user" });
  const spoof = { userId: "rich_user" };
  expect(
    await snoop.query(api.imageCreditService.getUserImageCredits, spoof),
  ).toBe(0);
  expect(
    await snoop.query(api.imageCreditService.hasImageCreditsForDuel, spoof),
  ).toBe(false);
  expect(
    await snoop.query(api.imageCreditService.getImageCreditHistory, spoof),
  ).toEqual([]);

  // Signed out: nothing
  expect(await t.query(api.imageCreditService.getUserImageCredits, spoof)).toBe(
    0,
  );
});
