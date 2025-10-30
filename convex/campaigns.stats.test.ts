import { describe, it, expect, beforeEach } from "vitest";
import { convexTest, ConvexTestingHelper } from "convex-test";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { withAuth } from "./test_utils";

describe("Campaign Statistics", () => {
  let t: ConvexTestingHelper<typeof schema>;

  beforeEach(async () => {
    t = convexTest(schema);
    // Create default season for tests
    await t.mutation(internal.campaignSeasons.createDefaultSeasonInternal, {});
    // Seed campaign opponents for tests
    await t.mutation(api.campaigns.seedCampaignOpponents, {});
  });

  it("should calculate comprehensive campaign statistics", async () => {
    // Create a test user
    const userId = "test-user-123";

    // Create a test wizard with authentication
    const wizardId = await withAuth(t, userId).mutation(
      api.wizards.createWizard,
      {
        name: "Test Wizard",
        description: "A test wizard for statistics",
      }
    );

    // Initialize campaign progress
    await withAuth(t, userId).mutation(
      api.campaigns.initializeWizardCampaignProgress,
      {
        wizardId,
        userId,
      }
    );

    // Defeat a few opponents
    await withAuth(t, userId).mutation(api.campaigns.defeatOpponent, {
      wizardId,
      opponentNumber: 1,
      userId,
    });

    await withAuth(t, userId).mutation(api.campaigns.defeatOpponent, {
      wizardId,
      opponentNumber: 2,
      userId,
    });

    // Get campaign statistics
    const stats = await withAuth(t, userId).query(
      api.campaigns.getCampaignStatistics,
      {
        userId,
      }
    );

    expect(stats).toBeDefined();
    expect(stats.totalWizards).toBe(1);
    expect(stats.totalBattlesWon).toBe(2);
    expect(stats.completedCampaigns).toBe(0);
    expect(stats.activeCampaigns).toBe(1);
    expect(stats.averageProgress).toBe(2);
    expect(stats.completionPercentage).toBe(20); // 2/10 * 100
    expect(stats.relicsEarned).toBe(0);
    expect(stats.milestones).toHaveLength(6);
    expect(stats.milestones[0].achieved).toBe(true); // First Victory
    expect(stats.milestones[1].achieved).toBe(false); // Apprentice (needs 5)
  });

  it("should track effective luck with relic bonus", async () => {
    const userId = "test-user-456";

    // Create a test wizard
    const wizardId = await withAuth(t, userId).mutation(
      api.wizards.createWizard,
      {
        name: "Lucky Wizard",
        description: "A wizard with a relic",
      }
    );

    // Get initial effective luck (should be base 10)
    const initialLuck = await withAuth(t, userId).query(
      api.campaigns.getWizardEffectiveLuck,
      {
        wizardId,
      }
    );
    expect(initialLuck).toBe(10);

    // Initialize campaign progress and complete it
    await withAuth(t, userId).mutation(
      api.campaigns.initializeWizardCampaignProgress,
      {
        wizardId,
        userId,
      }
    );

    // Defeat all 10 opponents
    for (let i = 1; i <= 10; i++) {
      await withAuth(t, userId).mutation(api.campaigns.defeatOpponent, {
        wizardId,
        opponentNumber: i,
        userId,
      });
    }

    // Check campaign completion
    const completion = await withAuth(t, userId).mutation(
      api.campaigns.checkCampaignCompletion,
      {
        wizardId,
      }
    );
    expect(completion.completed).toBe(true);
    expect(completion.relicAwarded).toBe(true);

    // Get effective luck with relic bonus (should be 11)
    const relicLuck = await withAuth(t, userId).query(
      api.campaigns.getWizardEffectiveLuck,
      {
        wizardId,
      }
    );
    expect(relicLuck).toBe(11);

    // Test battle luck calculation
    const battleLuck = await withAuth(t, userId).query(
      api.campaigns.calculateBattleLuck,
      {
        wizardId,
        baseLuck: 15,
      }
    );
    expect(battleLuck).toBe(16); // 15 + 1 relic bonus
  });

  it("should get recent campaign battles with enriched data", async () => {
    const userId = "test-user-789";

    // Create a test wizard
    const wizardId = await withAuth(t, userId).mutation(
      api.wizards.createWizard,
      {
        name: "Battle Wizard",
        description: "A wizard for battle testing",
      }
    );

    // Initialize campaign progress
    await withAuth(t, userId).mutation(
      api.campaigns.initializeWizardCampaignProgress,
      {
        wizardId,
        userId,
      }
    );

    // Create a campaign battle
    const battleResult = await withAuth(t, userId).mutation(
      api.campaigns.startCampaignBattle,
      {
        wizardId,
        opponentNumber: 1,
      }
    );

    expect(battleResult.duelId).toBeDefined();
    expect(battleResult.campaignBattleId).toBeDefined();
    expect(battleResult.aiWizardId).toBeDefined();

    // Complete the battle
    await withAuth(t, userId).mutation(api.campaigns.completeCampaignBattle, {
      battleId: battleResult.campaignBattleId,
      won: true,
    });

    // Get recent battles
    const recentBattles = await withAuth(t, userId).query(
      api.campaigns.getRecentCampaignBattles,
      {
        userId,
        limit: 5,
      }
    );

    expect(recentBattles).toHaveLength(1);
    expect(recentBattles[0].wizardName).toBe("Battle Wizard");
    expect(recentBattles[0].opponentName).toBe("Pip the Apprentice"); // First opponent
    expect(recentBattles[0].status).toBe("WON");
    expect(recentBattles[0].duration).toBeDefined();
  });

  it("should generate campaign leaderboard", async () => {
    // Create multiple users with different progress
    const user1 = "user-1";
    const user2 = "user-2";

    // User 1: Complete campaign
    const wizard1 = await withAuth(t, user1).mutation(
      api.wizards.createWizard,
      {
        name: "Champion Wizard",
        description: "A champion wizard",
      }
    );

    await withAuth(t, user1).mutation(
      api.campaigns.initializeWizardCampaignProgress,
      {
        wizardId: wizard1,
        userId: user1,
      }
    );

    // Defeat all opponents for user 1
    for (let i = 1; i <= 10; i++) {
      await withAuth(t, user1).mutation(api.campaigns.defeatOpponent, {
        wizardId: wizard1,
        opponentNumber: i,
        userId: user1,
      });
    }

    // User 2: Partial progress
    const wizard2 = await withAuth(t, user2).mutation(
      api.wizards.createWizard,
      {
        name: "Novice Wizard",
        description: "A novice wizard",
      }
    );

    await withAuth(t, user2).mutation(
      api.campaigns.initializeWizardCampaignProgress,
      {
        wizardId: wizard2,
        userId: user2,
      }
    );

    // Defeat first 3 opponents for user 2
    for (let i = 1; i <= 3; i++) {
      await withAuth(t, user2).mutation(api.campaigns.defeatOpponent, {
        wizardId: wizard2,
        opponentNumber: i,
        userId: user2,
      });
    }

    // Get leaderboard
    const leaderboard = await withAuth(t, user1).query(
      api.campaigns.getCampaignLeaderboard,
      {
        limit: 10,
      }
    );

    expect(leaderboard).toHaveLength(2);
    expect(leaderboard[0].userId).toBe(user1);
    expect(leaderboard[0].totalBattlesWon).toBe(10);
    expect(leaderboard[0].completedCampaigns).toBe(1);
    expect(leaderboard[0].rank).toBe(1);

    expect(leaderboard[1].userId).toBe(user2);
    expect(leaderboard[1].totalBattlesWon).toBe(3);
    expect(leaderboard[1].completedCampaigns).toBe(0);
    expect(leaderboard[1].rank).toBe(2);
  });
});
