import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { withSuperAdminAuth, withAuth } from "./test_utils";
import { Id } from "./_generated/dataModel";

// Helper to create super admin user for tests
async function createSuperAdminUser(t: any) {
  await t.run(async (ctx: unknown) => {
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
}

describe("Admin Users - listUsers", () => {
  test("should list users with pagination", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.*s"));

    // Create super admin user (must match withSuperAdminAuth clerkId)
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

    // Create test users
    await t.run(async (ctx) => {
      for (let i = 1; i <= 5; i++) {
        await ctx.db.insert("users", {
          clerkId: `user-${i}`,
          email: `user${i}@test.com`,
          name: `Test User ${i}`,
          userId: `testuser${i}`,
          displayName: `User ${i}`,
          role: "user",
          subscriptionTier: "FREE",
          subscriptionStatus: "ACTIVE",
          imageCredits: i * 10,
          monthlyUsage: {
            duelsPlayed: 0,
            wizardsCreated: 0,
            imageGenerations: 0,
            adsWatched: 0,
            resetDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          },
          createdAt: Date.now() - i * 1000,
          updatedAt: Date.now(),
        });
      }
    });

    // Test pagination
    const result = await withSuperAdminAuth(t).query(api.adminUsers.listUsers, {
      paginationOpts: { numItems: 3, cursor: null },
    });

    expect(result.page.length).toBeLessThanOrEqual(3);
    expect(result.isDone).toBeDefined();
    expect(result.continueCursor).toBeDefined();
  });

  test("should search users by name", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.*s"));

    // Create super admin
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

    // Create users with different names
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkId: "alice-123",
        email: "alice@test.com",
        name: "Alice Smith",
        displayName: "Alice",
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

      await ctx.db.insert("users", {
        clerkId: "bob-456",
        email: "bob@test.com",
        name: "Bob Jones",
        displayName: "Bob",
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

    // Search for Alice
    const result = await withSuperAdminAuth(t).query(api.adminUsers.listUsers, {
      paginationOpts: { numItems: 10, cursor: null },
      searchQuery: "alice",
    });

    expect(result.page.length).toBe(1);
    expect(result.page[0].name).toBe("Alice Smith");
  });

  test("should search users by email", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.*s"));

    // Create super admin
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

    // Create user
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkId: "test-user",
        email: "unique@example.com",
        name: "Test User",
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

    // Search by email
    const result = await withSuperAdminAuth(t).query(api.adminUsers.listUsers, {
      paginationOpts: { numItems: 10, cursor: null },
      searchQuery: "unique@example",
    });

    expect(result.page.length).toBe(1);
    expect(result.page[0].email).toBe("unique@example.com");
  });

  test("should sort users by joinDate", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.*s"));

    // Create super admin
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

    // Create users with different creation times
    const now = Date.now();
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkId: "old-user",
        name: "Old User",
        role: "user",
        subscriptionTier: "FREE",
        subscriptionStatus: "ACTIVE",
        imageCredits: 10,
        monthlyUsage: {
          duelsPlayed: 0,
          wizardsCreated: 0,
          imageGenerations: 0,
          adsWatched: 0,
          resetDate: now + 30 * 24 * 60 * 60 * 1000,
        },
        createdAt: now - 10000,
        updatedAt: now,
      });

      await ctx.db.insert("users", {
        clerkId: "new-user",
        name: "New User",
        role: "user",
        subscriptionTier: "FREE",
        subscriptionStatus: "ACTIVE",
        imageCredits: 10,
        monthlyUsage: {
          duelsPlayed: 0,
          wizardsCreated: 0,
          imageGenerations: 0,
          adsWatched: 0,
          resetDate: now + 30 * 24 * 60 * 60 * 1000,
        },
        createdAt: now,
        updatedAt: now,
      });
    });

    // Sort by joinDate (newest first)
    const result = await withSuperAdminAuth(t).query(api.adminUsers.listUsers, {
      paginationOpts: { numItems: 10, cursor: null },
      sortBy: "joinDate",
    });

    // New user should be first (excluding super admin)
    const nonAdminUsers = result.page.filter((u) => u.role !== "super_admin");
    expect(nonAdminUsers[0].name).toBe("New User");
  });

  test("should sort users by username", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.*s"));

    // Create super admin
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

    // Create users with different names
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkId: "zebra-user",
        displayName: "Zebra",
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

      await ctx.db.insert("users", {
        clerkId: "alpha-user",
        displayName: "Alpha",
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

    // Sort by username
    const result = await withSuperAdminAuth(t).query(api.adminUsers.listUsers, {
      paginationOpts: { numItems: 10, cursor: null },
      sortBy: "username",
    });

    const nonAdminUsers = result.page.filter((u) => u.role !== "super_admin");
    expect(nonAdminUsers[0].displayName).toBe("Alpha");
  });

  test("should reject non-admin users", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.*s"));

    // Create regular user
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

    // Should throw error
    await expect(
      withAuth(t, "regular-user").query(api.adminUsers.listUsers, {
        paginationOpts: { numItems: 10, cursor: null },
      })
    ).rejects.toThrow("Access denied");
  });
});

describe("Admin Users - getUserStatistics", () => {
  test("should calculate wizard count correctly", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.*s"));

    // Create super admin
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

    // Create test user
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkId: "test-user",
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

    // Create wizards for test user
    await t.run(async (ctx) => {
      for (let i = 0; i < 3; i++) {
        await ctx.db.insert("wizards", {
          owner: "test-user",
          name: `Wizard ${i}`,
          description: "Test wizard",
        });
      }
    });

    const stats = await withSuperAdminAuth(t).query(
      api.adminUsers.getUserStatistics,
      { userId: "test-user" }
    );

    expect(stats.totalWizards).toBe(3);
  });

  test("should calculate multiplayer duel statistics", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.*s"));

    // Create super admin
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

    // Create test user
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkId: "test-user",
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

    // Create wizards
    const wizardIds = await t.run(async (ctx) => {
      const w1 = await ctx.db.insert("wizards", {
        owner: "test-user",
        name: "Wizard 1",
        description: "Test wizard",
      });
      const w2 = await ctx.db.insert("wizards", {
        owner: "other-user",
        name: "Wizard 2",
        description: "Test wizard",
      });
      return { w1, w2 };
    });

    // Create duels
    await t.run(async (ctx) => {
      // Won duel
      await ctx.db.insert("duels", {
        numberOfRounds: 3,
        wizards: [wizardIds.w1, wizardIds.w2],
        players: ["test-user", "other-user"],
        status: "COMPLETED",
        currentRound: 3,
        createdAt: Date.now(),
        completedAt: Date.now(),
        points: {},
        hitPoints: {},
        needActionsFrom: [],
        winners: [wizardIds.w1],
        losers: [wizardIds.w2],
      });

      // Lost duel
      await ctx.db.insert("duels", {
        numberOfRounds: 3,
        wizards: [wizardIds.w1, wizardIds.w2],
        players: ["test-user", "other-user"],
        status: "COMPLETED",
        currentRound: 3,
        createdAt: Date.now(),
        completedAt: Date.now(),
        points: {},
        hitPoints: {},
        needActionsFrom: [],
        winners: [wizardIds.w2],
        losers: [wizardIds.w1],
      });

      // In progress duel
      await ctx.db.insert("duels", {
        numberOfRounds: 3,
        wizards: [wizardIds.w1, wizardIds.w2],
        players: ["test-user", "other-user"],
        status: "IN_PROGRESS",
        currentRound: 1,
        createdAt: Date.now(),
        points: {},
        hitPoints: {},
        needActionsFrom: [],
      });
    });

    const stats = await withSuperAdminAuth(t).query(
      api.adminUsers.getUserStatistics,
      { userId: "test-user" }
    );

    expect(stats.multiplayerDuels.total).toBe(3);
    expect(stats.multiplayerDuels.wins).toBe(1);
    expect(stats.multiplayerDuels.losses).toBe(1);
    expect(stats.multiplayerDuels.inProgress).toBe(1);
  });

  test("should calculate campaign battle statistics", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.*s"));

    // Create super admin
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

    // Create test user
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkId: "test-user",
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

    // Create wizard and duel
    const { wizardId, duelId } = await t.run(async (ctx) => {
      const wizardId = await ctx.db.insert("wizards", {
        owner: "test-user",
        name: "Test Wizard",
        description: "Test",
      });

      const duelId = await ctx.db.insert("duels", {
        numberOfRounds: 3,
        wizards: [wizardId],
        players: ["test-user"],
        status: "COMPLETED",
        currentRound: 3,
        createdAt: Date.now(),
        completedAt: Date.now(),
        points: {},
        hitPoints: {},
        needActionsFrom: [],
        isCampaignBattle: true,
      });

      return { wizardId, duelId };
    });

    // Create campaign battles
    await t.run(async (ctx) => {
      // Won battles
      await ctx.db.insert("campaignBattles", {
        wizardId,
        userId: "test-user",
        opponentNumber: 1,
        duelId,
        status: "WON",
        completedAt: Date.now(),
        createdAt: Date.now(),
      });

      await ctx.db.insert("campaignBattles", {
        wizardId,
        userId: "test-user",
        opponentNumber: 2,
        duelId,
        status: "WON",
        completedAt: Date.now(),
        createdAt: Date.now(),
      });

      // Lost battle
      await ctx.db.insert("campaignBattles", {
        wizardId,
        userId: "test-user",
        opponentNumber: 3,
        duelId,
        status: "LOST",
        completedAt: Date.now(),
        createdAt: Date.now(),
      });
    });

    const stats = await withSuperAdminAuth(t).query(
      api.adminUsers.getUserStatistics,
      { userId: "test-user" }
    );

    expect(stats.campaignBattles.total).toBe(3);
    expect(stats.campaignBattles.wins).toBe(2);
    expect(stats.campaignBattles.losses).toBe(1);
    expect(stats.campaignBattles.currentProgress).toBe(2);
  });

  test("should determine activity level correctly", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.*s"));

    // Create super admin
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

    // Create inactive user (no activity in 30+ days)
    const oldDate = Date.now() - 40 * 24 * 60 * 60 * 1000;
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkId: "inactive-user",
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
        createdAt: oldDate,
        updatedAt: oldDate,
      });
    });

    const stats = await withSuperAdminAuth(t).query(
      api.adminUsers.getUserStatistics,
      { userId: "inactive-user" }
    );

    expect(stats.activityLevel).toBe("inactive");
  });

  test("should throw error for non-existent user", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.*s"));

    // Create super admin
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

    await expect(
      withSuperAdminAuth(t).query(api.adminUsers.getUserStatistics, {
        userId: "non-existent-user",
      })
    ).rejects.toThrow("User not found");
  });
});

describe("Admin Users - grantImageCredits", () => {
  test("should grant credits successfully", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.*s"));

    // Create super admin
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

    // Create target user
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkId: "target-user",
        role: "user",
        subscriptionTier: "FREE",
        subscriptionStatus: "ACTIVE",
        imageCredits: 5,
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

    // Grant credits
    const result = await withSuperAdminAuth(t).mutation(
      api.adminUsers.grantImageCredits,
      {
        targetUserId: "target-user",
        amount: 10,
        reason: "Customer support request",
      }
    );

    expect(result.success).toBe(true);
    expect(result.newBalance).toBe(15);

    // Verify transaction was recorded
    const transactions = await t.run(async (ctx) => {
      return await ctx.db
        .query("imageCreditTransactions")
        .withIndex("by_user", (q) => q.eq("userId", "target-user"))
        .collect();
    });

    expect(transactions.length).toBe(1);
    expect(transactions[0].type).toBe("GRANTED");
    expect(transactions[0].amount).toBe(10);
    expect(transactions[0].source).toBe("ADMIN_GRANT");
    expect(transactions[0].metadata?.reason).toBe("Customer support request");
  });

  test("should validate positive integer amount", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.*s"));

    // Create super admin
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

    // Create target user
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkId: "target-user",
        role: "user",
        subscriptionTier: "FREE",
        subscriptionStatus: "ACTIVE",
        imageCredits: 5,
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

    // Test negative amount
    await expect(
      withSuperAdminAuth(t).mutation(api.adminUsers.grantImageCredits, {
        targetUserId: "target-user",
        amount: -5,
        reason: "Test",
      })
    ).rejects.toThrow("Credit amount must be a positive integer");

    // Test zero amount
    await expect(
      withSuperAdminAuth(t).mutation(api.adminUsers.grantImageCredits, {
        targetUserId: "target-user",
        amount: 0,
        reason: "Test",
      })
    ).rejects.toThrow("Credit amount must be a positive integer");

    // Test decimal amount
    await expect(
      withSuperAdminAuth(t).mutation(api.adminUsers.grantImageCredits, {
        targetUserId: "target-user",
        amount: 5.5,
        reason: "Test",
      })
    ).rejects.toThrow("Credit amount must be a positive integer");
  });

  test("should require reason for credit grant", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.*s"));

    // Create super admin
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

    // Create target user
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkId: "target-user",
        role: "user",
        subscriptionTier: "FREE",
        subscriptionStatus: "ACTIVE",
        imageCredits: 5,
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

    // Test empty reason
    await expect(
      withSuperAdminAuth(t).mutation(api.adminUsers.grantImageCredits, {
        targetUserId: "target-user",
        amount: 10,
        reason: "",
      })
    ).rejects.toThrow("Reason is required");

    // Test whitespace-only reason
    await expect(
      withSuperAdminAuth(t).mutation(api.adminUsers.grantImageCredits, {
        targetUserId: "target-user",
        amount: 10,
        reason: "   ",
      })
    ).rejects.toThrow("Reason is required");
  });

  test("should throw error for non-existent target user", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.*s"));

    // Create super admin
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

    await expect(
      withSuperAdminAuth(t).mutation(api.adminUsers.grantImageCredits, {
        targetUserId: "non-existent-user",
        amount: 10,
        reason: "Test",
      })
    ).rejects.toThrow("Target user not found");
  });

  test("should reject non-admin users", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.*s"));

    // Create regular user
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

    await expect(
      withAuth(t, "regular-user").mutation(api.adminUsers.grantImageCredits, {
        targetUserId: "regular-user",
        amount: 10,
        reason: "Test",
      })
    ).rejects.toThrow("Access denied");
  });
});

describe("Admin Users - getCreditHistory", () => {
  test("should retrieve credit history with pagination", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.*s"));

    // Create super admin
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

    // Create test user
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkId: "test-user",
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

    // Create transactions
    await t.run(async (ctx) => {
      for (let i = 0; i < 5; i++) {
        await ctx.db.insert("imageCreditTransactions", {
          userId: "test-user",
          type: "EARNED",
          amount: 5,
          source: "AD_REWARD",
          createdAt: Date.now() - i * 1000,
        });
      }
    });

    // Get first page
    const result = await withSuperAdminAuth(t).query(
      api.adminUsers.getCreditHistory,
      {
        userId: "test-user",
        paginationOpts: { numItems: 3, cursor: null },
      }
    );

    expect(result.page.length).toBe(3);
    expect(result.isDone).toBe(false);
    expect(result.continueCursor).toBeDefined();

    // Get second page
    const result2 = await withSuperAdminAuth(t).query(
      api.adminUsers.getCreditHistory,
      {
        userId: "test-user",
        paginationOpts: { numItems: 3, cursor: result.continueCursor },
      }
    );

    expect(result2.page.length).toBe(2);
    expect(result2.isDone).toBe(true);
  });

  test("should order transactions by most recent first", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.*s"));

    // Create super admin
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

    // Create test user
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkId: "test-user",
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

    const now = Date.now();

    // Create transactions with different timestamps
    await t.run(async (ctx) => {
      await ctx.db.insert("imageCreditTransactions", {
        userId: "test-user",
        type: "EARNED",
        amount: 5,
        source: "SIGNUP_BONUS",
        createdAt: now - 2000,
      });

      await ctx.db.insert("imageCreditTransactions", {
        userId: "test-user",
        type: "CONSUMED",
        amount: -1,
        source: "ADMIN_GRANT",
        createdAt: now - 1000,
      });

      await ctx.db.insert("imageCreditTransactions", {
        userId: "test-user",
        type: "GRANTED",
        amount: 10,
        source: "ADMIN_GRANT",
        createdAt: now,
      });
    });

    const result = await withSuperAdminAuth(t).query(
      api.adminUsers.getCreditHistory,
      {
        userId: "test-user",
        paginationOpts: { numItems: 10, cursor: null },
      }
    );

    // Most recent should be first
    expect(result.page[0].type).toBe("GRANTED");
    expect(result.page[1].type).toBe("CONSUMED");
    expect(result.page[2].type).toBe("EARNED");
  });

  test("should include metadata in transactions", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.*s"));

    // Create super admin
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

    // Create test user
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkId: "test-user",
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

    // Create transaction with metadata
    await t.run(async (ctx) => {
      await ctx.db.insert("imageCreditTransactions", {
        userId: "test-user",
        type: "GRANTED",
        amount: 10,
        source: "ADMIN_GRANT",
        metadata: {
          grantedBy: "super-admin",
          reason: "Customer support",
        },
        createdAt: Date.now(),
      });
    });

    const result = await withSuperAdminAuth(t).query(
      api.adminUsers.getCreditHistory,
      {
        userId: "test-user",
        paginationOpts: { numItems: 10, cursor: null },
      }
    );

    expect(result.page[0].metadata?.grantedBy).toBe("super-admin");
    expect(result.page[0].metadata?.reason).toBe("Customer support");
  });

  test("should reject non-admin users", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.*s"));

    // Create regular user
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

    await expect(
      withAuth(t, "regular-user").query(api.adminUsers.getCreditHistory, {
        userId: "regular-user",
        paginationOpts: { numItems: 10, cursor: null },
      })
    ).rejects.toThrow("Access denied");
  });
});

describe("Admin Users - getPlatformStats", () => {
  test("should calculate total users correctly", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.*s"));

    // Create super admin
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

    // Create test users
    await t.run(async (ctx) => {
      for (let i = 0; i < 5; i++) {
        await ctx.db.insert("users", {
          clerkId: `user-${i}`,
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
      }
    });

    const stats = await withSuperAdminAuth(t).query(
      api.adminUsers.getPlatformStats,
      {}
    );

    expect(stats.totalUsers).toBe(6); // 5 regular users + 1 super admin
  });

  test("should calculate active users in last 24 hours", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.*s"));

    // Create super admin
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

    // Create active user
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkId: "active-user",
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

    // Create wizard in last 24h
    await t.run(async (ctx) => {
      await ctx.db.insert("wizards", {
        owner: "active-user",
        name: "Test Wizard",
        description: "Test",
        illustrationGeneratedAt: Date.now(),
      });
    });

    const stats = await withSuperAdminAuth(t).query(
      api.adminUsers.getPlatformStats,
      {}
    );

    expect(stats.activeUsers24h).toBeGreaterThanOrEqual(1);
  });

  test("should count total wizards and duels", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.*s"));

    // Create super admin
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

    // Create wizards
    const wizardIds = await t.run(async (ctx) => {
      const w1 = await ctx.db.insert("wizards", {
        owner: "user-1",
        name: "Wizard 1",
        description: "Test",
      });
      const w2 = await ctx.db.insert("wizards", {
        owner: "user-2",
        name: "Wizard 2",
        description: "Test",
      });
      return [w1, w2];
    });

    // Create duels
    await t.run(async (ctx) => {
      await ctx.db.insert("duels", {
        numberOfRounds: 3,
        wizards: wizardIds,
        players: ["user-1", "user-2"],
        status: "IN_PROGRESS",
        currentRound: 1,
        createdAt: Date.now(),
        points: {},
        hitPoints: {},
        needActionsFrom: [],
      });

      await ctx.db.insert("duels", {
        numberOfRounds: 3,
        wizards: wizardIds,
        players: ["user-1", "user-2"],
        status: "COMPLETED",
        currentRound: 3,
        createdAt: Date.now(),
        completedAt: Date.now(),
        points: {},
        hitPoints: {},
        needActionsFrom: [],
      });
    });

    const stats = await withSuperAdminAuth(t).query(
      api.adminUsers.getPlatformStats,
      {}
    );

    expect(stats.totalWizards).toBe(2);
    expect(stats.totalDuels).toBe(2);
    expect(stats.activeDuels).toBe(1);
  });

  test("should reject non-admin users", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.*s"));

    // Create regular user
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

    await expect(
      withAuth(t, "regular-user").query(api.adminUsers.getPlatformStats, {})
    ).rejects.toThrow("Access denied");
  });
});
