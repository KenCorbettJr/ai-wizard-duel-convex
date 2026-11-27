import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import { internal } from "./_generated/api";
import schema from "./schema";

describe("clearLegacySubscriptionFields", () => {
  it("removes the old subscription fields and keeps the rest", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.*s"));
    const id = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        clerkId: "legacy",
        role: "user",
        subscriptionTier: "FREE",
        subscriptionStatus: "ACTIVE",
        stripeCustomerId: "cus_123",
        imageCredits: 7,
        monthlyUsage: {
          duelsPlayed: 1,
          wizardsCreated: 2,
          imageGenerations: 3,
          adsWatched: 0,
          resetDate: 0,
        },
        createdAt: 1,
        updatedAt: 1,
      }),
    );

    await t.mutation(internal.migrations.clearLegacySubscriptionFields, {});

    const user = await t.run(async (ctx) => ctx.db.get(id));
    expect(user).toMatchObject({ clerkId: "legacy", imageCredits: 7 });
    expect(user).not.toHaveProperty("subscriptionTier");
    expect(user).not.toHaveProperty("subscriptionStatus");
    expect(user).not.toHaveProperty("stripeCustomerId");
    expect(user).not.toHaveProperty("monthlyUsage");
  });
});
