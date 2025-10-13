import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import { verifySuperAdmin } from "./auth.utils";
import schema from "./schema";
import { withAuth, withSuperAdminAuth } from "./test_utils";

describe("Auth Utils", () => {
  test("verifySuperAdmin should allow super admin users", async () => {
    const t = convexTest(schema);

    // Create super admin user in database
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkId: "super-admin-user",
        role: "super_admin",
        subscriptionTier: "FREE",
        subscriptionStatus: "ACTIVE",
        imageCredits: 10,
        monthlyUsage: {
          duelsPlayed: 0,
          wizardsCreated: 0,
          imageGenerations: 0,
          adsWatched: 0,
          resetDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    // This should not throw
    await expect(
      withSuperAdminAuth(t).run(async (ctx) => {
        return await verifySuperAdmin(ctx);
      })
    ).resolves.toBeDefined();
  });

  test("verifySuperAdmin should reject regular users", async () => {
    const t = convexTest(schema);

    // Create regular user in database
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkId: "regular-user",
        role: "user",
        subscriptionTier: "FREE",
        subscriptionStatus: "ACTIVE",
        imageCredits: 10,
        monthlyUsage: {
          duelsPlayed: 0,
          wizardsCreated: 0,
          imageGenerations: 0,
          adsWatched: 0,
          resetDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    // This should throw
    await expect(
      withAuth(t, "regular-user").run(async (ctx) => {
        return await verifySuperAdmin(ctx);
      })
    ).rejects.toThrow("Access denied: Super admin privileges required");
  });

  test("verifySuperAdmin should reject unauthenticated users", async () => {
    const t = convexTest(schema);

    // This should throw
    await expect(
      t.run(async (ctx) => {
        return await verifySuperAdmin(ctx);
      })
    ).rejects.toThrow("Not authenticated");
  });
});
