import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { Id } from "./_generated/dataModel";

describe("Duels", () => {
  test("should create a duel with correct initial values", async () => {
    const t = convexTest(schema);

    // Create wizards directly in database
    const wizard1Id = await t.run(async (ctx) => {
      return await ctx.db.insert("wizards", {
        owner: "user1",
        name: "Gandalf",
        description: "A wise wizard",
        wins: 0,
        losses: 0,
        isAIPowered: false,
      });
    });

    const wizard2Id = await t.run(async (ctx) => {
      return await ctx.db.insert("wizards", {
        owner: "user2",
        name: "Saruman",
        description: "A powerful wizard",
        wins: 0,
        losses: 0,
        isAIPowered: false,
      });
    });

    const duelId = await t.mutation(api.duels.createDuel, {
      numberOfRounds: 3,
      wizards: [wizard1Id, wizard2Id],
      players: ["user1", "user2"],
      sessionId: "session123",
    });

    const duel = await t.query(api.duels.getDuel, { duelId });

    expect(duel).toMatchObject({
      numberOfRounds: 3,
      wizards: [wizard1Id, wizard2Id],
      players: ["user1", "user2"],
      status: "WAITING_FOR_PLAYERS",
      currentRound: 1,
      sessionId: "session123",
    });

    // Check initial points and hit points
    expect(duel?.points[wizard1Id]).toBe(0);
    expect(duel?.points[wizard2Id]).toBe(0);
    expect(duel?.hitPoints[wizard1Id]).toBe(100);
    expect(duel?.hitPoints[wizard2Id]).toBe(100);

    // Check shortcode is generated
    expect(duel?.shortcode).toBeTruthy();
    expect(duel?.shortcode).toHaveLength(6);
  });

  test("should find duel by shortcode", async () => {
    const t = convexTest(schema);

    const wizard1Id = await t.run(async (ctx) => {
      return await ctx.db.insert("wizards", {
        owner: "user1",
        name: "Gandalf",
        description: "A wise wizard",
        wins: 0,
        losses: 0,
        isAIPowered: false,
      });
    });

    const wizard2Id = await t.run(async (ctx) => {
      return await ctx.db.insert("wizards", {
        owner: "user2",
        name: "Saruman",
        description: "A powerful wizard",
        wins: 0,
        losses: 0,
        isAIPowered: false,
      });
    });

    const duelId = await t.mutation(api.duels.createDuel, {
      numberOfRounds: 3,
      wizards: [wizard1Id, wizard2Id],
      players: ["user1", "user2"],
    });

    const duel = await t.query(api.duels.getDuel, { duelId });
    const shortcode = duel?.shortcode!;

    const foundDuel = await t.query(api.duels.getDuelByShortcode, {
      shortcode,
    });

    expect(foundDuel?._id).toBe(duelId);
  });

  test("should get player duels", async () => {
    const t = convexTest(schema);

    const wizard1Id = await t.run(async (ctx) => {
      return await ctx.db.insert("wizards", {
        owner: "user1",
        name: "Gandalf",
        description: "A wise wizard",
        wins: 0,
        losses: 0,
        isAIPowered: false,
      });
    });

    const wizard2Id = await t.run(async (ctx) => {
      return await ctx.db.insert("wizards", {
        owner: "user2",
        name: "Saruman",
        description: "A powerful wizard",
        wins: 0,
        losses: 0,
        isAIPowered: false,
      });
    });

    const duel1Id = await t.mutation(api.duels.createDuel, {
      numberOfRounds: 3,
      wizards: [wizard1Id],
      players: ["user1"],
    });

    const duel2Id = await t.mutation(api.duels.createDuel, {
      numberOfRounds: 5,
      wizards: [wizard1Id, wizard2Id],
      players: ["user1", "user2"],
    });

    // Create duel for different user
    await t.mutation(api.duels.createDuel, {
      numberOfRounds: 2,
      wizards: [wizard2Id],
      players: ["user2"],
    });

    const user1Duels = await t.query(api.duels.getPlayerDuels, {
      userId: "user1",
    });

    expect(user1Duels).toHaveLength(2);
    expect(user1Duels.map((d) => d._id)).toContain(duel1Id);
    expect(user1Duels.map((d) => d._id)).toContain(duel2Id);
  });

  test("should cancel a duel", async () => {
    const t = convexTest(schema);

    const wizard1Id = await t.run(async (ctx) => {
      return await ctx.db.insert("wizards", {
        owner: "user1",
        name: "Gandalf",
        description: "A wise wizard",
        wins: 0,
        losses: 0,
        isAIPowered: false,
      });
    });

    const wizard2Id = await t.run(async (ctx) => {
      return await ctx.db.insert("wizards", {
        owner: "user2",
        name: "Saruman",
        description: "A powerful wizard",
        wins: 0,
        losses: 0,
        isAIPowered: false,
      });
    });

    const duelId = await t.mutation(api.duels.createDuel, {
      numberOfRounds: 3,
      wizards: [wizard1Id, wizard2Id],
      players: ["user1", "user2"],
    });

    await t.mutation(api.duels.cancelDuel, { duelId });

    const duel = await t.query(api.duels.getDuel, { duelId });
    expect(duel?.status).toBe("CANCELLED");
  });

  test("should get active duels", async () => {
    const t = convexTest(schema);

    const wizard1Id = await t.run(async (ctx) => {
      return await ctx.db.insert("wizards", {
        owner: "user1",
        name: "Gandalf",
        description: "A wise wizard",
        wins: 0,
        losses: 0,
        isAIPowered: false,
      });
    });

    const wizard2Id = await t.run(async (ctx) => {
      return await ctx.db.insert("wizards", {
        owner: "user2",
        name: "Saruman",
        description: "A powerful wizard",
        wins: 0,
        losses: 0,
        isAIPowered: false,
      });
    });

    // Create duels with different statuses
    const waitingDuelId = await t.mutation(api.duels.createDuel, {
      numberOfRounds: 3,
      wizards: [wizard1Id],
      players: ["user1"],
    });

    const inProgressDuelId = await t.mutation(api.duels.createDuel, {
      numberOfRounds: 3,
      wizards: [wizard2Id],
      players: ["user2"],
    });

    const completedDuelId = await t.mutation(api.duels.createDuel, {
      numberOfRounds: 3,
      wizards: [wizard1Id, wizard2Id],
      players: ["user1", "user2"],
    });

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
