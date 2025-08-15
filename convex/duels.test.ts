import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

import { withAuth } from "./test_utils";

describe("Duels", () => {
  test("should create a duel with correct initial values", async () => {
    const t = convexTest(schema);

    // Create wizards directly in database
    const wizard1Id = await t.run(async (ctx) => {
      return await ctx.db.insert("wizards", {
        owner: "test-user-1",
        name: "Gandalf",
        description: "A wise wizard",
        wins: 0,
        losses: 0,
        isAIPowered: false,
      });
    });

    const duelId = await withAuth(t, "test-user-1").mutation(
      api.duels.createDuel,
      {
        numberOfRounds: 3,
        wizards: [wizard1Id],
      }
    );

    const duel = await withAuth(t, "test-user-1").query(api.duels.getDuel, {
      duelId,
    });

    expect(duel).toMatchObject({
      numberOfRounds: 3,
      wizards: [wizard1Id],
      players: ["test-user-1"],
      status: "WAITING_FOR_PLAYERS",
      currentRound: 1,
    });

    // Check initial points and hit points
    expect(duel?.points[wizard1Id]).toBe(0);
    expect(duel?.hitPoints[wizard1Id]).toBe(100);

    // Check shortcode is generated
    expect(duel?.shortcode).toBeTruthy();
    expect(duel?.shortcode).toHaveLength(6);
  });

  test("should find duel by shortcode", async () => {
    const t = convexTest(schema);

    const wizard1Id = await t.run(async (ctx) => {
      return await ctx.db.insert("wizards", {
        owner: "test-user-1",
        name: "Gandalf",
        description: "A wise wizard",
        wins: 0,
        losses: 0,
        isAIPowered: false,
      });
    });

    const duelId = await withAuth(t, "test-user-1").mutation(
      api.duels.createDuel,
      {
        numberOfRounds: 3,
        wizards: [wizard1Id],
      }
    );

    const duel = await withAuth(t, "test-user-1").query(api.duels.getDuel, {
      duelId,
    });
    const shortcode = duel?.shortcode as string;

    const foundDuel = await t.query(api.duels.getDuelByShortcode, {
      shortcode,
    });

    expect(foundDuel?._id).toBe(duelId);
  });

  test("should get player duels", async () => {
    const t = convexTest(schema);

    const wizard1Id = await t.run(async (ctx) => {
      return await ctx.db.insert("wizards", {
        owner: "test-user-1",
        name: "Gandalf",
        description: "A wise wizard",
        wins: 0,
        losses: 0,
        isAIPowered: false,
      });
    });

    const wizard2Id = await t.run(async (ctx) => {
      return await ctx.db.insert("wizards", {
        owner: "test-user-1",
        name: "Saruman",
        description: "A powerful wizard",
        wins: 0,
        losses: 0,
        isAIPowered: false,
      });
    });

    const duel1Id = await withAuth(t, "test-user-1").mutation(
      api.duels.createDuel,
      {
        numberOfRounds: 3,
        wizards: [wizard1Id],
      }
    );

    const duel2Id = await withAuth(t, "test-user-1").mutation(
      api.duels.createDuel,
      {
        numberOfRounds: 5,
        wizards: [wizard2Id],
      }
    );

    const user1Duels = await withAuth(t, "test-user-1").query(
      api.duels.getPlayerDuels,
      {}
    );

    expect(user1Duels).toHaveLength(2);
    expect(user1Duels.map((d) => d._id)).toContain(duel1Id);
    expect(user1Duels.map((d) => d._id)).toContain(duel2Id);
  });

  test("should cancel a duel", async () => {
    const t = convexTest(schema);

    const wizard1Id = await t.run(async (ctx) => {
      return await ctx.db.insert("wizards", {
        owner: "test-user-1",
        name: "Gandalf",
        description: "A wise wizard",
        wins: 0,
        losses: 0,
        isAIPowered: false,
      });
    });

    const duelId = await withAuth(t, "test-user-1").mutation(
      api.duels.createDuel,
      {
        numberOfRounds: 3,
        wizards: [wizard1Id],
      }
    );

    await t.mutation(api.duels.cancelDuel, { duelId });

    const duel = await withAuth(t, "test-user-1").query(api.duels.getDuel, {
      duelId,
    });
    expect(duel?.status).toBe("CANCELLED");
  });

  test("should get active duels", async () => {
    const t = convexTest(schema);

    const wizard1Id = await t.run(async (ctx) => {
      return await ctx.db.insert("wizards", {
        owner: "test-user-1",
        name: "Gandalf",
        description: "A wise wizard",
        wins: 0,
        losses: 0,
        isAIPowered: false,
      });
    });

    const wizard2Id = await t.run(async (ctx) => {
      return await ctx.db.insert("wizards", {
        owner: "test-user-2",
        name: "Saruman",
        description: "A powerful wizard",
        wins: 0,
        losses: 0,
        isAIPowered: false,
      });
    });

    // Create duels with different statuses
    const waitingDuelId = await withAuth(t, "test-user-1").mutation(
      api.duels.createDuel,
      {
        numberOfRounds: 3,
        wizards: [wizard1Id],
      }
    );

    const inProgressDuelId = await withAuth(t, "test-user-2").mutation(
      api.duels.createDuel,
      {
        numberOfRounds: 3,
        wizards: [wizard2Id],
      }
    );

    const completedDuelId = await withAuth(t, "test-user-1").mutation(
      api.duels.createDuel,
      {
        numberOfRounds: 3,
        wizards: [wizard1Id],
      }
    );

    // Set statuses
    await t.run(async (ctx) => {
      await ctx.db.patch(inProgressDuelId, { status: "IN_PROGRESS" });
      await ctx.db.patch(completedDuelId, { status: "COMPLETED" });
    });

    const activeDuels = await t.query(api.duels.getActiveDuels, {});

    expect(activeDuels).toHaveLength(2);
    expect(activeDuels.map((d) => d._id)).toContain(waitingDuelId);
    expect(activeDuels.map((d) => d._id)).toContain(inProgressDuelId);
    expect(activeDuels.map((d) => d._id)).not.toContain(completedDuelId);
  });
});
test("should get completed duels for a player", async () => {
  const t = convexTest(schema);

  // Create wizards
  const wizard1Id = await t.run(async (ctx) => {
    return await ctx.db.insert("wizards", {
      owner: "test-user-1",
      name: "Gandalf",
      description: "A wise wizard",
      wins: 0,
      losses: 0,
      isAIPowered: false,
    });
  });

  // Create a completed duel
  const completedDuelId = await withAuth(t, "test-user-1").mutation(
    api.duels.createDuel,
    {
      numberOfRounds: 3,
      wizards: [wizard1Id],
    }
  );

  // Manually set the duel as completed
  await t.run(async (ctx) => {
    await ctx.db.patch(completedDuelId, {
      status: "COMPLETED",
      winners: [wizard1Id],
      losers: [],
    });
  });

  // Create an in-progress duel (should not appear in completed duels)
  await withAuth(t, "test-user-1").mutation(api.duels.createDuel, {
    numberOfRounds: 3,
    wizards: [wizard1Id],
  });

  // Get completed duels for user1
  const user1CompletedDuels = await withAuth(t, "test-user-1").query(
    api.duels.getPlayerCompletedDuels,
    {}
  );

  expect(user1CompletedDuels).toHaveLength(1);
  expect(user1CompletedDuels[0]._id).toBe(completedDuelId);
  expect(user1CompletedDuels[0].status).toBe("COMPLETED");

  // Get completed duels for a user with no duels
  const user3CompletedDuels = await withAuth(t, "test-user-3").query(
    api.duels.getPlayerCompletedDuels,
    {}
  );

  expect(user3CompletedDuels).toHaveLength(0);
});
