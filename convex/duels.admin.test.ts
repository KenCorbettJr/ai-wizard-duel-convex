import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

describe("Duel Admin Functions", () => {
  test("searchDuels should filter duels by status", async () => {
    const t = convexTest(schema);

    // Create test wizards
    const wizard1Id = await t.mutation(api.wizards.createWizard, {
      name: "Test Wizard 1",
      description: "A test wizard",
      owner: "user1",
    });

    const wizard2Id = await t.mutation(api.wizards.createWizard, {
      name: "Test Wizard 2",
      description: "Another test wizard",
      owner: "user2",
    });

    // Create test duels with different statuses
    const duel1Id = await t.mutation(api.duels.createDuel, {
      numberOfRounds: 3,
      wizards: [wizard1Id, wizard2Id],
      players: ["user1", "user2"],
    });

    const duel2Id = await t.mutation(api.duels.createDuel, {
      numberOfRounds: 5,
      wizards: [wizard1Id, wizard2Id],
      players: ["user1", "user2"],
    });

    // Cancel one duel
    await t.mutation(api.duels.cancelDuel, { duelId: duel2Id });

    // Test filtering by status
    const waitingDuels = await t.query(api.duels.searchDuels, {
      status: "WAITING_FOR_PLAYERS",
    });
    expect(waitingDuels.duels).toHaveLength(1);

    const cancelledDuels = await t.query(api.duels.searchDuels, {
      status: "CANCELLED",
    });
    expect(cancelledDuels.duels).toHaveLength(1);
    expect(cancelledDuels.duels[0]._id).toBe(duel2Id);

    // Test filtering by player
    const user1Duels = await t.query(api.duels.searchDuels, {
      playerUserId: "user1",
    });
    expect(user1Duels.duels).toHaveLength(2);

    // Test filtering by round type
    const threeRoundDuels = await t.query(api.duels.searchDuels, {
      numberOfRounds: 3,
    });
    expect(threeRoundDuels.duels).toHaveLength(1);
    expect(threeRoundDuels.duels[0]._id).toBe(duel1Id);
  });

  test("getDuelAnalytics should return comprehensive statistics", async () => {
    const t = convexTest(schema);

    // Create test wizards
    const wizard1Id = await t.mutation(api.wizards.createWizard, {
      name: "Analytics Wizard 1",
      description: "A test wizard for analytics",
      owner: "user1",
    });

    const wizard2Id = await t.mutation(api.wizards.createWizard, {
      name: "Analytics Wizard 2",
      description: "Another test wizard for analytics",
      owner: "user2",
    });

    // Create multiple duels with different statuses
    const duel1Id = await t.mutation(api.duels.createDuel, {
      numberOfRounds: 3,
      wizards: [wizard1Id, wizard2Id],
      players: ["user1", "user2"],
    });

    const duel2Id = await t.mutation(api.duels.createDuel, {
      numberOfRounds: "TO_THE_DEATH",
      wizards: [wizard1Id, wizard2Id],
      players: ["user1", "user2"],
    });

    const duel3Id = await t.mutation(api.duels.createDuel, {
      numberOfRounds: 5,
      wizards: [wizard1Id, wizard2Id],
      players: ["user1", "user2"],
    });

    // Cancel one duel
    await t.mutation(api.duels.cancelDuel, { duelId: duel2Id });

    // Get analytics
    const analytics = await t.query(api.duels.getDuelAnalytics, {
      timeRange: "all",
    });

    expect(analytics).toBeDefined();
    expect(analytics.totalDuels).toBe(3);
    expect(analytics.statusBreakdown.waiting).toBe(2);
    expect(analytics.statusBreakdown.cancelled).toBe(1);
    expect(analytics.statusBreakdown.inProgress).toBe(0);
    expect(analytics.statusBreakdown.completed).toBe(0);
    expect(analytics.roundTypeBreakdown.fixedRounds).toBe(2);
    expect(analytics.roundTypeBreakdown.toTheDeath).toBe(1);
    expect(analytics.mostActiveWizards).toHaveLength(2);
    expect(analytics.dailyActivity).toHaveLength(7);
  });

  test("getActiveDuelMonitoring should return active duels with monitoring data", async () => {
    const t = convexTest(schema);

    // Create test wizards
    const wizard1Id = await t.mutation(api.wizards.createWizard, {
      name: "Monitor Wizard 1",
      description: "A test wizard for monitoring",
      owner: "user1",
    });

    const wizard2Id = await t.mutation(api.wizards.createWizard, {
      name: "Monitor Wizard 2",
      description: "Another test wizard for monitoring",
      owner: "user2",
    });

    // Create active duels
    const waitingDuelId = await t.mutation(api.duels.createDuel, {
      numberOfRounds: 3,
      wizards: [wizard1Id, wizard2Id],
      players: ["user1", "user2"],
    });

    const inProgressDuelId = await t.mutation(api.duels.createDuel, {
      numberOfRounds: 5,
      wizards: [wizard1Id, wizard2Id],
      players: ["user1", "user2"],
    });

    // Create a completed duel (should not appear in monitoring)
    const completedDuelId = await t.mutation(api.duels.createDuel, {
      numberOfRounds: 3,
      wizards: [wizard1Id, wizard2Id],
      players: ["user1", "user2"],
    });
    await t.mutation(api.duels.cancelDuel, { duelId: completedDuelId });

    // Get monitoring data
    const monitoring = await t.query(api.duels.getActiveDuelMonitoring);

    expect(monitoring).toBeDefined();
    expect(monitoring).toHaveLength(2); // Only active duels

    const waitingDuel1 = monitoring.find((m) => m.duel._id === waitingDuelId);
    const waitingDuel2 = monitoring.find(
      (m) => m.duel._id === inProgressDuelId
    );

    expect(waitingDuel1).toBeDefined();
    expect(waitingDuel1?.duel.status).toBe("WAITING_FOR_PLAYERS");
    expect(waitingDuel1?.waitingTime).toBeGreaterThan(0);

    expect(waitingDuel2).toBeDefined();
    expect(waitingDuel2?.duel.status).toBe("WAITING_FOR_PLAYERS");

    // Check wizard details are included
    expect(waitingDuel1?.wizards).toHaveLength(2);
    expect(waitingDuel1?.wizards[0]?.name).toBeDefined();
    expect(waitingDuel1?.wizards[0]?.owner).toBeDefined();
  });

  test("forceCancelDuel should cancel any duel with reason", async () => {
    const t = convexTest(schema);

    // Create test wizards
    const wizard1Id = await t.mutation(api.wizards.createWizard, {
      name: "Cancel Wizard 1",
      description: "A test wizard for cancellation",
      owner: "user1",
    });

    const wizard2Id = await t.mutation(api.wizards.createWizard, {
      name: "Cancel Wizard 2",
      description: "Another test wizard for cancellation",
      owner: "user2",
    });

    // Create and start a duel
    const duelId = await t.mutation(api.duels.createDuel, {
      numberOfRounds: 3,
      wizards: [wizard1Id, wizard2Id],
      players: ["user1", "user2"],
    });

    // Verify duel is waiting for players
    const duelBefore = await t.query(api.duels.getDuel, { duelId });
    expect(duelBefore?.status).toBe("WAITING_FOR_PLAYERS");

    // Force cancel the duel
    await t.mutation(api.duels.forceCancelDuel, {
      duelId,
      reason: "Admin intervention - inappropriate content",
    });

    // Verify duel is cancelled
    const duelAfter = await t.query(api.duels.getDuel, { duelId });
    expect(duelAfter?.status).toBe("CANCELLED");
  });

  test("forceCancelDuel should not cancel completed duels", async () => {
    const t = convexTest(schema);

    // Create test wizards
    const wizard1Id = await t.mutation(api.wizards.createWizard, {
      name: "Complete Wizard 1",
      description: "A test wizard",
      owner: "user1",
    });

    const wizard2Id = await t.mutation(api.wizards.createWizard, {
      name: "Complete Wizard 2",
      description: "Another test wizard",
      owner: "user2",
    });

    // Create a duel and manually set it to completed
    const duelId = await t.mutation(api.duels.createDuel, {
      numberOfRounds: 1,
      wizards: [wizard1Id, wizard2Id],
      players: ["user1", "user2"],
    });

    // Start the duel
    await t.mutation(api.duels.startDuel, { duelId });

    // Create first round
    const roundId = await t.mutation(api.duels.createIntroductionRound, {
      duelId,
      outcome: {
        narrative: "Test introduction",
      },
    });

    // Start actual duel
    await t.mutation(api.duels.startDuelAfterIntroduction, { duelId });

    // Cast spells for both wizards
    await t.mutation(api.duels.castSpell, {
      duelId,
      wizardId: wizard1Id,
      spellDescription: "Test spell 1",
    });

    await t.mutation(api.duels.castSpell, {
      duelId,
      wizardId: wizard2Id,
      spellDescription: "Test spell 2",
    });

    // Complete the round to finish the duel
    const currentRound = await t.query(api.duels.getDuelRounds, { duelId });
    const activeRound = currentRound.find((r) => r.roundNumber === 1);

    if (activeRound) {
      await t.mutation(api.duels.completeRound, {
        roundId: activeRound._id,
        outcome: {
          narrative: "Test battle outcome",
          pointsAwarded: {
            [wizard1Id]: 5,
            [wizard2Id]: 3,
          },
          healthChange: {
            [wizard1Id]: -10,
            [wizard2Id]: -15,
          },
        },
      });
    }

    // Verify duel is completed
    const completedDuel = await t.query(api.duels.getDuel, { duelId });
    expect(completedDuel?.status).toBe("COMPLETED");

    // Try to force cancel - should throw error
    await expect(
      t.mutation(api.duels.forceCancelDuel, {
        duelId,
        reason: "Should not work",
      })
    ).rejects.toThrow("Cannot cancel a completed duel");
  });

  test("searchDuels should support pagination", async () => {
    const t = convexTest(schema);

    // Create test wizards
    const wizard1Id = await t.mutation(api.wizards.createWizard, {
      name: "Page Wizard 1",
      description: "A test wizard for pagination",
      owner: "user1",
    });

    const wizard2Id = await t.mutation(api.wizards.createWizard, {
      name: "Page Wizard 2",
      description: "Another test wizard for pagination",
      owner: "user2",
    });

    // Create multiple duels
    const duelIds = [];
    for (let i = 0; i < 5; i++) {
      const duelId = await t.mutation(api.duels.createDuel, {
        numberOfRounds: 3,
        wizards: [wizard1Id, wizard2Id],
        players: ["user1", "user2"],
      });
      duelIds.push(duelId);
    }

    // Test pagination
    const page1 = await t.query(api.duels.searchDuels, {
      limit: 2,
      offset: 0,
    });
    expect(page1.duels).toHaveLength(2);
    expect(page1.total).toBe(5);
    expect(page1.hasMore).toBe(true);

    const page2 = await t.query(api.duels.searchDuels, {
      limit: 2,
      offset: 2,
    });
    expect(page2.duels).toHaveLength(2);
    expect(page2.total).toBe(5);
    expect(page2.hasMore).toBe(true);

    const page3 = await t.query(api.duels.searchDuels, {
      limit: 2,
      offset: 4,
    });
    expect(page3.duels).toHaveLength(1);
    expect(page3.total).toBe(5);
    expect(page3.hasMore).toBe(false);
  });

  test("searchDuels should filter by date range", async () => {
    const t = convexTest(schema);

    // Create test wizards
    const wizard1Id = await t.mutation(api.wizards.createWizard, {
      name: "Date Wizard 1",
      description: "A test wizard for date filtering",
      owner: "user1",
    });

    const wizard2Id = await t.mutation(api.wizards.createWizard, {
      name: "Date Wizard 2",
      description: "Another test wizard for date filtering",
      owner: "user2",
    });

    // Create a duel
    const duelId = await t.mutation(api.duels.createDuel, {
      numberOfRounds: 3,
      wizards: [wizard1Id, wizard2Id],
      players: ["user1", "user2"],
    });

    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneHourFromNow = now + 60 * 60 * 1000;

    // Test date filtering
    const duelsAfter = await t.query(api.duels.searchDuels, {
      createdAfter: oneHourAgo,
    });
    expect(duelsAfter.duels).toHaveLength(1);

    const duelsBefore = await t.query(api.duels.searchDuels, {
      createdBefore: oneHourFromNow,
    });
    expect(duelsBefore.duels).toHaveLength(1);

    const duelsInFuture = await t.query(api.duels.searchDuels, {
      createdAfter: oneHourFromNow,
    });
    expect(duelsInFuture.duels).toHaveLength(0);
  });

  test("getPlayerDuelStats should return accurate statistics", async () => {
    const t = convexTest(schema);

    // Create test wizards
    const wizard1Id = await t.mutation(api.wizards.createWizard, {
      name: "Stats Wizard 1",
      description: "A test wizard for stats",
      owner: "user1",
    });

    const wizard2Id = await t.mutation(api.wizards.createWizard, {
      name: "Stats Wizard 2",
      description: "Another test wizard for stats",
      owner: "user2",
    });

    // Create duels with different outcomes
    const duel1Id = await t.mutation(api.duels.createDuel, {
      numberOfRounds: 3,
      wizards: [wizard1Id, wizard2Id],
      players: ["user1", "user2"],
    });

    const duel2Id = await t.mutation(api.duels.createDuel, {
      numberOfRounds: 5,
      wizards: [wizard1Id, wizard2Id],
      players: ["user1", "user2"],
    });

    const duel3Id = await t.mutation(api.duels.createDuel, {
      numberOfRounds: 3,
      wizards: [wizard1Id, wizard2Id],
      players: ["user1", "user2"],
    });

    // Start one duel (in progress)
    await t.mutation(api.duels.startDuel, { duelId: duel1Id });

    // Cancel one duel
    await t.mutation(api.duels.cancelDuel, { duelId: duel2Id });

    // Leave one waiting

    // Get player stats
    const user1Stats = await t.query(api.duels.getPlayerDuelStats, {
      userId: "user1",
    });

    expect(user1Stats).toBeDefined();
    expect(user1Stats.totalDuels).toBe(3);
    expect(user1Stats.inProgress).toBe(2); // 1 in progress + 1 waiting
    expect(user1Stats.cancelled).toBe(1);
    expect(user1Stats.wins).toBe(0);
    expect(user1Stats.losses).toBe(0);
  });
});
