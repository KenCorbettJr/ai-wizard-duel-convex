import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

test("time-based leaderboard functionality", async () => {
  const t = convexTest(schema);

  // Create test users
  await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      clerkId: "user1",
      role: "user",
      subscriptionTier: "FREE",
      subscriptionStatus: "ACTIVE",
      imageCredits: 10,
      monthlyUsage: {
        duelsPlayed: 0,
        wizardsCreated: 0,
        imageGenerations: 0,
        adsWatched: 0,
        resetDate: Date.now(),
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      clerkId: "user2",
      role: "user",
      subscriptionTier: "FREE",
      subscriptionStatus: "ACTIVE",
      imageCredits: 10,
      monthlyUsage: {
        duelsPlayed: 0,
        wizardsCreated: 0,
        imageGenerations: 0,
        adsWatched: 0,
        resetDate: Date.now(),
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  // Create test wizards
  const wizard1Id = await t.run(async (ctx) => {
    return await ctx.db.insert("wizards", {
      owner: "user1",
      name: "Test Wizard 1",
      description: "A test wizard",
      wins: 8,
      losses: 2,
    });
  });

  const wizard2Id = await t.run(async (ctx) => {
    return await ctx.db.insert("wizards", {
      owner: "user2",
      name: "Test Wizard 2",
      description: "Another test wizard",
      wins: 3,
      losses: 1,
    });
  });

  // Create test duels with different completion times
  const now = Date.now();
  const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

  // Recent duel (this week)
  await t.run(async (ctx) => {
    return await ctx.db.insert("duels", {
      numberOfRounds: 3,
      wizards: [wizard1Id, wizard2Id],
      players: ["user1", "user2"],
      status: "COMPLETED",
      currentRound: 3,
      createdAt: now - 1000,
      completedAt: now,
      points: { [wizard1Id]: 3, [wizard2Id]: 1 },
      hitPoints: { [wizard1Id]: 100, [wizard2Id]: 0 },
      needActionsFrom: [],
      winners: [wizard1Id],
      losers: [wizard2Id],
    });
  });

  // Old duel (last month)
  await t.run(async (ctx) => {
    return await ctx.db.insert("duels", {
      numberOfRounds: 3,
      wizards: [wizard1Id, wizard2Id],
      players: ["user1", "user2"],
      status: "COMPLETED",
      currentRound: 3,
      createdAt: oneMonthAgo,
      completedAt: oneMonthAgo + 1000,
      points: { [wizard1Id]: 1, [wizard2Id]: 3 },
      hitPoints: { [wizard1Id]: 0, [wizard2Id]: 100 },
      needActionsFrom: [],
      winners: [wizard2Id],
      losers: [wizard1Id],
    });
  });

  // Test all-time leaderboard
  const allTimeLeaderboard = await t.query(
    api.wizards.getWizardLeaderboardByPeriod,
    {
      period: "all",
      limit: 10,
      minDuels: 1,
    }
  );

  expect(allTimeLeaderboard).toHaveLength(2);
  expect(allTimeLeaderboard[0].name).toBe("Test Wizard 1"); // Higher overall win rate
  expect(allTimeLeaderboard[0].periodWins).toBe(1); // Actual wins from duel records (1 win from recent duel)
  expect(allTimeLeaderboard[0].periodLosses).toBe(1); // Actual losses from duel records (1 loss from old duel)

  // Test weekly leaderboard
  const weeklyLeaderboard = await t.query(
    api.wizards.getWizardLeaderboardByPeriod,
    {
      period: "week",
      limit: 10,
      minDuels: 1,
    }
  );

  expect(weeklyLeaderboard).toHaveLength(2);
  expect(weeklyLeaderboard[0].name).toBe("Test Wizard 1"); // Won the recent duel
  expect(weeklyLeaderboard[0].periodWins).toBe(1); // Only 1 win this week
  expect(weeklyLeaderboard[0].periodLosses).toBe(0);
  expect(weeklyLeaderboard[1].periodWins).toBe(0); // Lost the recent duel
  expect(weeklyLeaderboard[1].periodLosses).toBe(1);

  // Test monthly leaderboard
  const monthlyLeaderboard = await t.query(
    api.wizards.getWizardLeaderboardByPeriod,
    {
      period: "month",
      limit: 10,
      minDuels: 1,
    }
  );

  expect(monthlyLeaderboard).toHaveLength(2);
  // Should include both recent and old duels within the month
  expect(monthlyLeaderboard[0].periodTotalDuels).toBeGreaterThan(0);
});
