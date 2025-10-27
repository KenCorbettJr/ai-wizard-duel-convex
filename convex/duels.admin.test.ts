import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { withAuth, withSuperAdminAuth, createTestUser } from "./test_utils";

describe("Duel Admin Functions", () => {
  test("searchDuels should filter duels by status", async () => {
    const t = convexTest(schema);

    // Create test users in database
    await createTestUser(t, "test-user-1", "user");
    await createTestUser(t, "super-admin-user", "super_admin");

    // Create test wizards
    const wizard1Id = await withAuth(t, "test-user-1").mutation(
      api.wizards.createWizard,
      {
        name: "Test Wizard 1",
        description: "A test wizard",
      }
    );

    const wizard2Id = await withAuth(t, "test-user-1").mutation(
      api.wizards.createWizard,
      {
        name: "Test Wizard 2",
        description: "Another test wizard",
      }
    );

    // Create test duels with different statuses
    await withAuth(t, "test-user-1").mutation(api.duels.createDuel, {
      numberOfRounds: 3,
      wizards: [wizard1Id, wizard2Id],
    });

    const duel2Id = await withAuth(t, "test-user-1").mutation(
      api.duels.createDuel,
      {
        numberOfRounds: 5,
        wizards: [wizard1Id, wizard2Id],
      }
    );

    // Cancel one duel
    await t.mutation(api.duels.cancelDuel, { duelId: duel2Id });

    // Test filtering by status
    const waitingDuels = await withSuperAdminAuth(t).query(
      api.duels.searchDuels,
      {
        status: "WAITING_FOR_PLAYERS",
      }
    );
    expect(waitingDuels.duels).toHaveLength(1);

    const cancelledDuels = await withSuperAdminAuth(t).query(
      api.duels.searchDuels,
      {
        status: "CANCELLED",
      }
    );
    expect(cancelledDuels.duels).toHaveLength(1);
    expect(cancelledDuels.duels[0]._id).toBe(duel2Id);

    // Test filtering by player
    const user1Duels = await withSuperAdminAuth(t).query(
      api.duels.searchDuels,
      {
        playerUserId: "test-user-1",
      }
    );
    expect(user1Duels.duels).toHaveLength(2);

    // Test filtering by round type
    const threeRoundDuels = await withSuperAdminAuth(t).query(
      api.duels.searchDuels,
      {
        numberOfRounds: 3,
      }
    );
    expect(threeRoundDuels.duels).toHaveLength(1);
    expect(threeRoundDuels.duels[0]._id).toBeDefined();
  });

  test("getDuelAnalytics should return comprehensive statistics", async () => {
    const t = convexTest(schema);

    // Create test users in database
    await createTestUser(t, "test-user-1", "user");
    await createTestUser(t, "super-admin-user", "super_admin");

    // Create test wizards
    const wizard1Id = await withAuth(t, "test-user-1").mutation(
      api.wizards.createWizard,
      {
        name: "Analytics Wizard 1",
        description: "A test wizard for analytics",
      }
    );

    const wizard2Id = await withAuth(t, "test-user-1").mutation(
      api.wizards.createWizard,
      {
        name: "Analytics Wizard 2",
        description: "Another test wizard for analytics",
      }
    );

    // Create multiple duels with different statuses
    await withAuth(t, "test-user-1").mutation(api.duels.createDuel, {
      numberOfRounds: 3,
      wizards: [wizard1Id, wizard2Id],
    });

    const duel2Id = await withAuth(t, "test-user-1").mutation(
      api.duels.createDuel,
      {
        numberOfRounds: "TO_THE_DEATH",
        wizards: [wizard1Id, wizard2Id],
      }
    );

    await withAuth(t, "test-user-1").mutation(api.duels.createDuel, {
      numberOfRounds: 5,
      wizards: [wizard1Id, wizard2Id],
    });

    // Cancel one duel
    await t.mutation(api.duels.cancelDuel, { duelId: duel2Id });

    // Get analytics
    const analytics = await withSuperAdminAuth(t).query(
      api.duels.getDuelAnalytics,
      {
        timeRange: "all",
      }
    );

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

    // Create test users in database
    await createTestUser(t, "test-user-1", "user");
    await createTestUser(t, "super-admin-user", "super_admin");

    // Create test wizards
    const wizard1Id = await withAuth(t, "test-user-1").mutation(
      api.wizards.createWizard,
      {
        name: "Monitor Wizard 1",
        description: "A test wizard for monitoring",
      }
    );

    const wizard2Id = await withAuth(t, "test-user-1").mutation(
      api.wizards.createWizard,
      {
        name: "Monitor Wizard 2",
        description: "Another test wizard for monitoring",
      }
    );

    // Create active duels
    const waitingDuelId = await withAuth(t, "test-user-1").mutation(
      api.duels.createDuel,
      {
        numberOfRounds: 3,
        wizards: [wizard1Id, wizard2Id],
      }
    );

    const inProgressDuelId = await withAuth(t, "test-user-1").mutation(
      api.duels.createDuel,
      {
        numberOfRounds: 5,
        wizards: [wizard1Id, wizard2Id],
      }
    );

    // Create a completed duel (should not appear in monitoring)
    const completedDuelId = await withAuth(t, "test-user-1").mutation(
      api.duels.createDuel,
      {
        numberOfRounds: 3,
        wizards: [wizard1Id, wizard2Id],
      }
    );
    await t.mutation(api.duels.cancelDuel, { duelId: completedDuelId });

    // Get monitoring data
    const monitoring = await withSuperAdminAuth(t).query(
      api.duels.getActiveDuelMonitoring
    );

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

    // Create test users in database
    await createTestUser(t, "test-user-1", "user");
    await createTestUser(t, "super-admin-user", "super_admin");

    // Create test wizards
    const wizard1Id = await withAuth(t, "test-user-1").mutation(
      api.wizards.createWizard,
      {
        name: "Cancel Wizard 1",
        description: "A test wizard for cancellation",
      }
    );

    const wizard2Id = await withAuth(t, "test-user-1").mutation(
      api.wizards.createWizard,
      {
        name: "Cancel Wizard 2",
        description: "Another test wizard for cancellation",
      }
    );

    // Create and start a duel
    const duelId = await withAuth(t, "test-user-1").mutation(
      api.duels.createDuel,
      {
        numberOfRounds: 3,
        wizards: [wizard1Id, wizard2Id],
      }
    );

    // Verify duel is waiting for players
    const duelBefore = await withAuth(t, "test-user-1").query(
      api.duels.getDuel,
      { duelId }
    );
    expect(duelBefore?.status).toBe("WAITING_FOR_PLAYERS");

    // Force cancel the duel
    await withSuperAdminAuth(t).mutation(api.duels.forceCancelDuel, {
      duelId,
      reason: "Admin intervention - inappropriate content",
    });

    // Verify duel is cancelled
    const duelAfter = await withAuth(t, "test-user-1").query(
      api.duels.getDuel,
      { duelId }
    );
    expect(duelAfter?.status).toBe("CANCELLED");
  });

  test("forceCancelDuel should not cancel completed duels", async () => {
    const t = convexTest(schema);

    // Create test users in database
    await createTestUser(t, "test-user-1", "user");
    await createTestUser(t, "super-admin-user", "super_admin");

    // Create test wizards
    const wizard1Id = await withAuth(t, "test-user-1").mutation(
      api.wizards.createWizard,
      {
        name: "Complete Wizard 1",
        description: "A test wizard",
      }
    );

    const wizard2Id = await withAuth(t, "test-user-1").mutation(
      api.wizards.createWizard,
      {
        name: "Complete Wizard 2",
        description: "Another test wizard",
      }
    );

    // Create a duel and manually set it to completed
    const duelId = await withAuth(t, "test-user-1").mutation(
      api.duels.createDuel,
      {
        numberOfRounds: 1,
        wizards: [wizard1Id, wizard2Id],
      }
    );

    // Start the duel
    await t.mutation(api.duels.startDuel, { duelId });

    // Create first round
    await t.mutation(api.duels.createIntroductionRound, {
      duelId,
      outcome: {
        narrative: "Test introduction",
      },
    });

    // Start actual duel
    await t.mutation(api.duels.startDuelAfterIntroduction, { duelId });

    // Cast spells for both wizards
    await withAuth(t, "test-user-1").mutation(api.duels.castSpell, {
      duelId,
      wizardId: wizard1Id,
      spellDescription: "Test spell 1",
    });

    await withAuth(t, "test-user-1").mutation(api.duels.castSpell, {
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
    const completedDuel = await withAuth(t, "test-user-1").query(
      api.duels.getDuel,
      { duelId }
    );
    expect(completedDuel?.status).toBe("COMPLETED");

    // Try to force cancel - should throw error
    await expect(
      withSuperAdminAuth(t).mutation(api.duels.forceCancelDuel, {
        duelId,
        reason: "Should not work",
      })
    ).rejects.toThrow("Cannot cancel a completed duel");
  });

  test("searchDuels should support pagination", async () => {
    const t = convexTest(schema);

    // Create test users in database
    await createTestUser(t, "test-user-1", "user");
    await createTestUser(t, "super-admin-user", "super_admin");

    // Create test wizards
    const wizard1Id = await withAuth(t, "test-user-1").mutation(
      api.wizards.createWizard,
      {
        name: "Page Wizard 1",
        description: "A test wizard for pagination",
      }
    );

    const wizard2Id = await withAuth(t, "test-user-1").mutation(
      api.wizards.createWizard,
      {
        name: "Page Wizard 2",
        description: "Another test wizard for pagination",
      }
    );

    // Create multiple duels
    const duelIds = [];
    for (let i = 0; i < 5; i++) {
      const duelId = await withAuth(t, "test-user-1").mutation(
        api.duels.createDuel,
        {
          numberOfRounds: 3,
          wizards: [wizard1Id, wizard2Id],
        }
      );
      duelIds.push(duelId);
    }

    // Test pagination
    const page1 = await withSuperAdminAuth(t).query(api.duels.searchDuels, {
      limit: 2,
      offset: 0,
    });
    expect(page1.duels).toHaveLength(2);
    expect(page1.total).toBe(5);
    expect(page1.hasMore).toBe(true);

    const page2 = await withSuperAdminAuth(t).query(api.duels.searchDuels, {
      limit: 2,
      offset: 2,
    });
    expect(page2.duels).toHaveLength(2);
    expect(page2.total).toBe(5);
    expect(page2.hasMore).toBe(true);

    const page3 = await withSuperAdminAuth(t).query(api.duels.searchDuels, {
      limit: 2,
      offset: 4,
    });
    expect(page3.duels).toHaveLength(1);
    expect(page3.total).toBe(5);
    expect(page3.hasMore).toBe(false);
  });

  test("searchDuels should filter by date range", async () => {
    const t = convexTest(schema);

    // Create test users in database
    await createTestUser(t, "test-user-1", "user");
    await createTestUser(t, "super-admin-user", "super_admin");

    // Create test wizards
    const wizard1Id = await withAuth(t, "test-user-1").mutation(
      api.wizards.createWizard,
      {
        name: "Date Wizard 1",
        description: "A test wizard for date filtering",
      }
    );

    const wizard2Id = await withAuth(t, "test-user-1").mutation(
      api.wizards.createWizard,
      {
        name: "Date Wizard 2",
        description: "Another test wizard for date filtering",
      }
    );

    // Create a duel
    await withAuth(t, "test-user-1").mutation(api.duels.createDuel, {
      numberOfRounds: 3,
      wizards: [wizard1Id, wizard2Id],
    });

    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneHourFromNow = now + 60 * 60 * 1000;

    // Test date filtering
    const duelsAfter = await withSuperAdminAuth(t).query(
      api.duels.searchDuels,
      {
        createdAfter: oneHourAgo,
      }
    );
    expect(duelsAfter.duels).toHaveLength(1);

    const duelsBefore = await withSuperAdminAuth(t).query(
      api.duels.searchDuels,
      {
        createdBefore: oneHourFromNow,
      }
    );
    expect(duelsBefore.duels).toHaveLength(1);

    const duelsInFuture = await withSuperAdminAuth(t).query(
      api.duels.searchDuels,
      {
        createdAfter: oneHourFromNow,
      }
    );
    expect(duelsInFuture.duels).toHaveLength(0);
  });

  test("getPlayerDuelStats should return accurate statistics", async () => {
    const t = convexTest(schema);

    // Create test wizards
    const wizard1Id = await withAuth(t, "test-user-1").mutation(
      api.wizards.createWizard,
      {
        name: "Stats Wizard 1",
        description: "A test wizard for stats",
      }
    );

    const wizard2Id = await withAuth(t, "test-user-1").mutation(
      api.wizards.createWizard,
      {
        name: "Stats Wizard 2",
        description: "Another test wizard for stats",
      }
    );

    // Create duels with different outcomes
    const duel1Id = await withAuth(t, "test-user-1").mutation(
      api.duels.createDuel,
      {
        numberOfRounds: 3,
        wizards: [wizard1Id, wizard2Id],
      }
    );

    const duel2Id = await withAuth(t, "test-user-1").mutation(
      api.duels.createDuel,
      {
        numberOfRounds: 5,
        wizards: [wizard1Id, wizard2Id],
      }
    );

    await withAuth(t, "test-user-1").mutation(api.duels.createDuel, {
      numberOfRounds: 3,
      wizards: [wizard1Id, wizard2Id],
    });

    // Start one duel (in progress)
    await t.mutation(api.duels.startDuel, { duelId: duel1Id });

    // Cancel one duel
    await t.mutation(api.duels.cancelDuel, { duelId: duel2Id });

    // Leave one waiting

    // Get player stats
    const user1Stats = await withAuth(t, "test-user-1").query(
      api.duels.getPlayerDuelStats,
      {}
    );

    expect(user1Stats).toBeDefined();
    expect(user1Stats.totalDuels).toBe(3);
    expect(user1Stats.inProgress).toBe(2); // 1 in progress + 1 waiting
    expect(user1Stats.cancelled).toBe(1);
    expect(user1Stats.wins).toBe(0);
    expect(user1Stats.losses).toBe(0);
  });

  test("admin functions should reject non-super-admin users", async () => {
    const t = convexTest(schema);

    // Create test users in database
    await createTestUser(t, "test-user-1", "user");
    await createTestUser(t, "regular-user", "user");

    // Test that regular users can't access admin functions
    await expect(
      withAuth(t, "regular-user").query(api.duels.searchDuels, {})
    ).rejects.toThrow("Access denied: Super admin privileges required");

    await expect(
      withAuth(t, "regular-user").query(api.duels.getDuelAnalytics, {})
    ).rejects.toThrow("Access denied: Super admin privileges required");

    await expect(
      withAuth(t, "regular-user").query(api.duels.getActiveDuelMonitoring, {})
    ).rejects.toThrow("Access denied: Super admin privileges required");

    // Create a test duel first
    const wizard1Id = await withAuth(t, "test-user-1").mutation(
      api.wizards.createWizard,
      {
        name: "Test Wizard",
        description: "A test wizard",
      }
    );

    const duelId = await withAuth(t, "test-user-1").mutation(
      api.duels.createDuel,
      {
        wizards: [wizard1Id],
        numberOfRounds: 3,
      }
    );

    await expect(
      withAuth(t, "regular-user").mutation(api.duels.forceCancelDuel, {
        duelId,
        reason: "Should not work",
      })
    ).rejects.toThrow("Access denied: Super admin privileges required");
  });
});
