import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { withAuth } from "./test_utils";

describe("Integration Tests", () => {
  test("should complete a full duel workflow", async () => {
    const t = convexTest(schema);

    // Create two wizards
    const wizard1Id = await t.run(async (ctx) => {
      return await ctx.db.insert("wizards", {
        owner: "test-player-1",
        name: "Gandalf",
        description: "A wise wizard",
        wins: 0,
        losses: 0,
        isAIPowered: false,
      });
    });

    const wizard2Id = await t.run(async (ctx) => {
      return await ctx.db.insert("wizards", {
        owner: "test-player-2",
        name: "Saruman",
        description: "A powerful wizard",
        wins: 0,
        losses: 0,
        isAIPowered: false,
      });
    });

    // Create a duel
    const duelId = await withAuth(t, "test-player-1").mutation(
      api.duels.createDuel,
      {
        numberOfRounds: 3,
        wizards: [wizard1Id],
      }
    );

    // Verify duel was created correctly
    const duel = await withAuth(t, "test-player-1").query(api.duels.getDuel, {
      duelId,
    });
    expect(duel?.status).toBe("WAITING_FOR_PLAYERS");
    expect(duel?.wizards).toHaveLength(1);
    expect(duel?.shortcode).toHaveLength(6);

    // Test finding duel by shortcode
    const foundDuel = await t.query(api.duels.getDuelByShortcode, {
      shortcode: duel!.shortcode!,
    });
    expect(foundDuel?._id).toBe(duelId);

    // Create a round and complete it
    const roundId = await t.run(async (ctx) => {
      return await ctx.db.insert("duelRounds", {
        duelId,
        roundNumber: 1,
        type: "SPELL_CASTING",
        status: "PROCESSING",
      });
    });

    // Complete the round with an outcome
    await t.mutation(api.duels.completeRound, {
      roundId,
      outcome: {
        narrative: "Gandalf casts a powerful lightning spell!",
        pointsAwarded: {
          [wizard1Id]: 15,
        },
        healthChange: {
          [wizard1Id]: 0,
        },
      },
    });

    // Verify the round was completed and duel state updated
    const updatedDuel = await withAuth(t, "test-player-1").query(
      api.duels.getDuel,
      { duelId }
    );
    expect(updatedDuel?.points[wizard1Id]).toBe(15);
    expect(updatedDuel?.hitPoints[wizard1Id]).toBe(100);

    // Verify the round outcome
    const rounds = await t.query(api.duels.getDuelRounds, { duelId });
    const completedRound = rounds.find((r) => r._id === roundId);
    expect(completedRound?.status).toBe("COMPLETED");
    expect(completedRound?.outcome?.narrative).toContain("lightning spell");
  });

  test("should handle wizard stats updates after duel completion", async () => {
    const t = convexTest(schema);

    // Create a wizard
    const wizardId = await t.run(async (ctx) => {
      return await ctx.db.insert("wizards", {
        owner: "test-player-1",
        name: "Test Wizard",
        description: "A test wizard",
        wins: 5,
        losses: 3,
        isAIPowered: false,
      });
    });

    // Simulate winning a battle
    await withAuth(t, "test-player-1").mutation(api.wizards.updateWizardStats, {
      wizardId,
      won: true,
    });

    let wizard = await withAuth(t, "test-player-1").query(
      api.wizards.getWizard,
      { wizardId }
    );
    expect(wizard?.wins).toBe(6);
    expect(wizard?.losses).toBe(3);

    // Simulate losing a battle
    await withAuth(t, "test-player-1").mutation(api.wizards.updateWizardStats, {
      wizardId,
      won: false,
    });

    wizard = await withAuth(t, "test-player-1").query(api.wizards.getWizard, {
      wizardId,
    });
    expect(wizard?.wins).toBe(6);
    expect(wizard?.losses).toBe(4);
  });

  test("should handle multiple players and wizards", async () => {
    const t = convexTest(schema);

    // Create multiple wizards for different players
    const player1Wizards = await Promise.all([
      t.run(async (ctx) =>
        ctx.db.insert("wizards", {
          owner: "test-player-1",
          name: "Wizard A",
          description: "First wizard",
          wins: 0,
          losses: 0,
          isAIPowered: false,
        })
      ),
      t.run(async (ctx) =>
        ctx.db.insert("wizards", {
          owner: "test-player-1",
          name: "Wizard B",
          description: "Second wizard",
          wins: 0,
          losses: 0,
          isAIPowered: false,
        })
      ),
    ]);

    const player2Wizards = await Promise.all([
      t.run(async (ctx) =>
        ctx.db.insert("wizards", {
          owner: "test-player-2",
          name: "Wizard C",
          description: "Third wizard",
          wins: 0,
          losses: 0,
          isAIPowered: false,
        })
      ),
    ]);

    // Create duels involving different combinations
    const duel1Id = await withAuth(t, "test-player-1").mutation(
      api.duels.createDuel,
      {
        numberOfRounds: 3,
        wizards: [player1Wizards[0]],
      }
    );

    const duel2Id = await withAuth(t, "test-player-1").mutation(
      api.duels.createDuel,
      {
        numberOfRounds: 5,
        wizards: [player1Wizards[1]],
      }
    );

    // Test querying duels by player
    const player1Duels = await withAuth(t, "test-player-1").query(
      api.duels.getPlayerDuels,
      {}
    );
    expect(player1Duels).toHaveLength(2);
    expect(player1Duels.map((d) => d._id)).toContain(duel1Id);
    expect(player1Duels.map((d) => d._id)).toContain(duel2Id);

    const player2Duels = await withAuth(t, "test-player-2").query(
      api.duels.getPlayerDuels,
      {}
    );
    expect(player2Duels).toHaveLength(0);

    // Test querying wizards by user
    const player1WizardList = await withAuth(t, "test-player-1").query(
      api.wizards.getUserWizards,
      {}
    );
    expect(player1WizardList).toHaveLength(2);
    expect(player1WizardList.map((w) => w.name)).toContain("Wizard A");
    expect(player1WizardList.map((w) => w.name)).toContain("Wizard B");

    const player2WizardList = await withAuth(t, "test-player-2").query(
      api.wizards.getUserWizards,
      {}
    );
    expect(player2WizardList).toHaveLength(1);
    expect(player2WizardList[0].name).toBe("Wizard C");
  });
});
