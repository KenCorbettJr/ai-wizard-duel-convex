import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { Id } from "./_generated/dataModel";

describe("Campaign Database Schema Tests", () => {
  let t: unknown;

  beforeEach(async () => {
    t = convexTest(schema);
  });

  describe("campaign opponents as wizards", () => {
    test("should seed campaign opponents as wizards with all required fields", async () => {
      await t.mutation(api.campaigns.seedCampaignOpponents);

      const opponent = await t.query(api.campaigns.getCampaignOpponent, {
        opponentNumber: 1,
      });

      expect(opponent).toBeDefined();
      expect(opponent?.isCampaignOpponent).toBe(true);
      expect(opponent?.opponentNumber).toBe(1);
      expect(opponent?.name).toBeDefined();
      expect(opponent?.description).toBeDefined();
      expect(opponent?.personalityTraits).toBeDefined();
      expect(opponent?.spellStyle).toBeDefined();
      expect(opponent?.difficulty).toBeDefined();
      expect(opponent?.luckModifier).toBeDefined();
      expect(opponent?.illustrationPrompt).toBeDefined();
      expect(opponent?.isAIPowered).toBe(true);
      expect(opponent?.owner).toBe("campaign");
    });

    test("should retrieve all campaign opponents in order", async () => {
      await t.mutation(api.campaigns.seedCampaignOpponents);

      const allOpponents = await t.query(api.campaigns.getCampaignOpponents);
      expect(allOpponents).toHaveLength(10);

      // Verify they're ordered by opponent number
      for (let i = 0; i < allOpponents.length; i++) {
        expect(allOpponents[i].opponentNumber).toBe(i + 1);
        expect(allOpponents[i].isCampaignOpponent).toBe(true);
      }
    });

    test("should validate difficulty levels and corresponding luck modifiers", async () => {
      await t.mutation(api.campaigns.seedCampaignOpponents);

      const beginnerOpponent = await t.query(
        api.campaigns.getCampaignOpponent,
        {
          opponentNumber: 1, // First opponent should be beginner
        }
      );
      const intermediateOpponent = await t.query(
        api.campaigns.getCampaignOpponent,
        {
          opponentNumber: 5, // Middle opponent should be intermediate
        }
      );
      const advancedOpponent = await t.query(
        api.campaigns.getCampaignOpponent,
        {
          opponentNumber: 10, // Last opponent should be advanced
        }
      );

      expect(beginnerOpponent?.difficulty).toBe("BEGINNER");
      expect(beginnerOpponent?.luckModifier).toBe(-2);

      expect(intermediateOpponent?.difficulty).toBe("INTERMEDIATE");
      expect(intermediateOpponent?.luckModifier).toBe(0);

      expect(advancedOpponent?.difficulty).toBe("ADVANCED");
      expect(advancedOpponent?.luckModifier).toBe(2);
    });

    test("should support array of personality traits", async () => {
      await t.mutation(api.campaigns.seedCampaignOpponents);

      const opponent = await t.query(api.campaigns.getCampaignOpponent, {
        opponentNumber: 5,
      });

      expect(opponent?.personalityTraits).toBeDefined();
      expect(Array.isArray(opponent?.personalityTraits)).toBe(true);
      expect(opponent?.personalityTraits?.length).toBeGreaterThan(0);
    });

    test("should retrieve opponents by index efficiently", async () => {
      await t.mutation(api.campaigns.seedCampaignOpponents);

      // Test index-based retrieval
      const opponent3 = await t.query(api.campaigns.getCampaignOpponent, {
        opponentNumber: 3,
      });

      expect(opponent3?.opponentNumber).toBe(3);
      expect(opponent3?.isCampaignOpponent).toBe(true);

      // Test retrieving all opponents
      const allOpponents = await t.query(api.campaigns.getCampaignOpponents);
      expect(allOpponents).toHaveLength(10);

      // Verify they're ordered by opponent number
      for (let i = 0; i < allOpponents.length; i++) {
        expect(allOpponents[i].opponentNumber).toBe(i + 1);
      }
    });
  });

  describe("wizardCampaignProgress table", () => {
    let wizardId: Id<"wizards">;
    let userId: string;

    beforeEach(async () => {
      // Create a test user and wizard
      userId = "test_user_123";

      // Create a test wizard
      wizardId = await t.mutation(internal.wizards.createWizardInternal, {
        name: "Test Campaign Wizard",
        description: "A wizard for campaign testing",
        owner: userId,
      });
    });

    test("should create wizard campaign progress with initial state", async () => {
      const progress = await t.mutation(
        api.campaigns.initializeWizardCampaignProgress,
        {
          wizardId,
          userId,
        }
      );

      expect(progress).toBeDefined();

      const retrieved = await t.query(api.campaigns.getWizardCampaignProgress, {
        wizardId,
      });

      expect(retrieved).toMatchObject({
        wizardId,
        userId,
        currentOpponent: 1, // Should start at opponent 1
        defeatedOpponents: [], // Should start empty
        hasCompletionRelic: false, // Should start false
      });
      expect(retrieved?.createdAt).toBeDefined();
      expect(retrieved?.lastBattleAt).toBeUndefined();
    });

    test("should track defeated opponents progression", async () => {
      await t.mutation(api.campaigns.initializeWizardCampaignProgress, {
        wizardId,
        userId,
      });

      // Defeat first opponent
      await t.mutation(api.campaigns.defeatOpponent, {
        wizardId,
        opponentNumber: 1,
      });

      let progress = await t.query(api.campaigns.getWizardCampaignProgress, {
        wizardId,
      });

      expect(progress?.currentOpponent).toBe(2);
      expect(progress?.defeatedOpponents).toEqual([1]);
      expect(progress?.hasCompletionRelic).toBe(false);

      // Defeat second opponent
      await t.mutation(api.campaigns.defeatOpponent, {
        wizardId,
        opponentNumber: 2,
      });

      progress = await t.query(api.campaigns.getWizardCampaignProgress, {
        wizardId,
      });

      expect(progress?.currentOpponent).toBe(3);
      expect(progress?.defeatedOpponents).toEqual([1, 2]);
      expect(progress?.hasCompletionRelic).toBe(false);
    });

    test("should award completion relic after defeating all 10 opponents", async () => {
      await t.mutation(api.campaigns.initializeWizardCampaignProgress, {
        wizardId,
        userId,
      });

      // Defeat all 10 opponents
      for (let i = 1; i <= 10; i++) {
        await t.mutation(api.campaigns.defeatOpponent, {
          wizardId,
          opponentNumber: i,
        });
      }

      const progress = await t.query(api.campaigns.getWizardCampaignProgress, {
        wizardId,
      });

      expect(progress?.currentOpponent).toBe(11); // Beyond last opponent
      expect(progress?.defeatedOpponents).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
      ]);
      expect(progress?.hasCompletionRelic).toBe(true);
    });

    test("should support multiple wizards per user", async () => {
      const wizard2Id = await t.mutation(
        internal.wizards.createWizardInternal,
        {
          name: "Second Campaign Wizard",
          description: "Another wizard for the same user",
          owner: userId,
        }
      );

      // Initialize progress for both wizards
      await t.mutation(api.campaigns.initializeWizardCampaignProgress, {
        wizardId,
        userId,
      });

      await t.mutation(api.campaigns.initializeWizardCampaignProgress, {
        wizardId: wizard2Id,
        userId,
      });

      // Progress first wizard
      await t.mutation(api.campaigns.defeatOpponent, {
        wizardId,
        opponentNumber: 1,
      });

      // Check both wizards have independent progress
      const progress1 = await t.query(api.campaigns.getWizardCampaignProgress, {
        wizardId,
      });
      const progress2 = await t.query(api.campaigns.getWizardCampaignProgress, {
        wizardId: wizard2Id,
      });

      expect(progress1?.currentOpponent).toBe(2);
      expect(progress1?.defeatedOpponents).toEqual([1]);

      expect(progress2?.currentOpponent).toBe(1);
      expect(progress2?.defeatedOpponents).toEqual([]);

      // Get all user progress
      const userProgress = await t.query(
        api.campaigns.getUserCampaignProgress,
        {
          userId,
        }
      );

      expect(userProgress).toHaveLength(2);
      expect(userProgress.map((p) => p.wizardId)).toContain(wizardId);
      expect(userProgress.map((p) => p.wizardId)).toContain(wizard2Id);
    });

    test("should update lastBattleAt timestamp", async () => {
      await t.mutation(api.campaigns.initializeWizardCampaignProgress, {
        wizardId,
        userId,
      });

      const beforeBattle = Date.now();

      await t.mutation(api.campaigns.defeatOpponent, {
        wizardId,
        opponentNumber: 1,
      });

      const progress = await t.query(api.campaigns.getWizardCampaignProgress, {
        wizardId,
      });

      expect(progress?.lastBattleAt).toBeDefined();
      expect(progress?.lastBattleAt).toBeGreaterThanOrEqual(beforeBattle);
    });

    test("should enforce wizard ownership through userId", async () => {
      const otherUserId = "other_user_456";

      await t.mutation(api.campaigns.initializeWizardCampaignProgress, {
        wizardId,
        userId,
      });

      // Attempt to access progress with wrong user ID should fail
      await expect(
        t.mutation(api.campaigns.defeatOpponent, {
          wizardId,
          opponentNumber: 1,
          userId: otherUserId, // Wrong user
        })
      ).rejects.toThrow();
    });
  });

  describe("campaignBattles table", () => {
    let wizardId: Id<"wizards">;
    let duelId: Id<"duels">;
    let userId: string;

    beforeEach(async () => {
      userId = "test_user_123";

      // Create test wizard
      wizardId = await t.mutation(internal.wizards.createWizardInternal, {
        name: "Battle Test Wizard",
        description: "A wizard for battle testing",
        owner: userId,
      });

      // Create test duel (campaign battle)
      duelId = await t.mutation(internal.duels.createDuelInternal, {
        numberOfRounds: 3,
        wizards: [wizardId],
        players: [userId],
        isCampaignBattle: true,
      });
    });

    test("should create campaign battle record", async () => {
      const battleId = await t.mutation(api.campaigns.createCampaignBattle, {
        wizardId,
        userId,
        opponentNumber: 1,
        duelId,
      });

      expect(battleId).toBeDefined();

      const battle = await t.query(api.campaigns.getCampaignBattle, {
        battleId,
      });

      expect(battle).toMatchObject({
        wizardId,
        userId,
        opponentNumber: 1,
        duelId,
        status: "IN_PROGRESS",
      });
      expect(battle?.createdAt).toBeDefined();
      expect(battle?.completedAt).toBeUndefined();
    });

    test("should update battle status and completion time", async () => {
      const battleId = await t.mutation(api.campaigns.createCampaignBattle, {
        wizardId,
        userId,
        opponentNumber: 1,
        duelId,
      });

      const beforeCompletion = Date.now();

      await t.mutation(api.campaigns.completeCampaignBattle, {
        battleId,
        won: true,
      });

      const battle = await t.query(api.campaigns.getCampaignBattle, {
        battleId,
      });

      expect(battle?.status).toBe("WON");
      expect(battle?.completedAt).toBeDefined();
      expect(battle?.completedAt).toBeGreaterThanOrEqual(beforeCompletion);
    });

    test("should handle battle loss", async () => {
      const battleId = await t.mutation(api.campaigns.createCampaignBattle, {
        wizardId,
        userId,
        opponentNumber: 3,
        duelId,
      });

      await t.mutation(api.campaigns.completeCampaignBattle, {
        battleId,
        won: false,
      });

      const battle = await t.query(api.campaigns.getCampaignBattle, {
        battleId,
      });

      expect(battle?.status).toBe("LOST");
      expect(battle?.completedAt).toBeDefined();
    });

    test("should retrieve battles by wizard", async () => {
      // Create multiple battles for the same wizard
      const battle1Id = await t.mutation(api.campaigns.createCampaignBattle, {
        wizardId,
        userId,
        opponentNumber: 1,
        duelId,
      });

      const duel2Id = await t.mutation(internal.duels.createDuelInternal, {
        numberOfRounds: 3,
        wizards: [wizardId],
        players: [userId],
        isCampaignBattle: true,
      });

      const battle2Id = await t.mutation(api.campaigns.createCampaignBattle, {
        wizardId,
        userId,
        opponentNumber: 2,
        duelId: duel2Id,
      });

      const wizardBattles = await t.query(
        api.campaigns.getWizardCampaignBattles,
        {
          wizardId,
        }
      );

      expect(wizardBattles).toHaveLength(2);
      expect(wizardBattles.map((b) => b._id)).toContain(battle1Id);
      expect(wizardBattles.map((b) => b._id)).toContain(battle2Id);
    });

    test("should retrieve battles by user and opponent", async () => {
      const battleId = await t.mutation(api.campaigns.createCampaignBattle, {
        wizardId,
        userId,
        opponentNumber: 5,
        duelId,
      });

      const userOpponentBattles = await t.query(
        api.campaigns.getUserOpponentBattles,
        {
          userId,
          opponentNumber: 5,
        }
      );

      expect(userOpponentBattles).toHaveLength(1);
      expect(userOpponentBattles[0]._id).toBe(battleId);
      expect(userOpponentBattles[0].opponentNumber).toBe(5);
    });

    test("should link to duel system correctly", async () => {
      const battleId = await t.mutation(api.campaigns.createCampaignBattle, {
        wizardId,
        userId,
        opponentNumber: 1,
        duelId,
      });

      const battle = await t.query(api.campaigns.getCampaignBattle, {
        battleId,
      });

      // Verify the duel exists and is marked as campaign battle
      const linkedDuel = await t.query(api.duels.getDuel, {
        duelId: battle?.duelId!,
      });

      expect(linkedDuel?.isCampaignBattle).toBe(true);
      expect(linkedDuel?.wizards).toContain(wizardId);
    });

    test("should prevent duplicate battles for same wizard-opponent combination", async () => {
      await t.mutation(api.campaigns.createCampaignBattle, {
        wizardId,
        userId,
        opponentNumber: 1,
        duelId,
      });

      const duel2Id = await t.mutation(internal.duels.createDuelInternal, {
        numberOfRounds: 3,
        wizards: [wizardId],
        players: [userId],
        isCampaignBattle: true,
      });

      // Attempt to create duplicate battle should fail
      await expect(
        t.mutation(api.campaigns.createCampaignBattle, {
          wizardId,
          userId,
          opponentNumber: 1, // Same opponent
          duelId: duel2Id,
        })
      ).rejects.toThrow();
    });
  });

  describe("Index Performance Tests", () => {
    test("campaign opponents by_campaign_opponent index should be efficient", async () => {
      // Seed all 10 campaign opponents
      await t.mutation(api.campaigns.seedCampaignOpponents);

      // Test that we can efficiently retrieve specific opponents
      const startTime = Date.now();

      const opponent5 = await t.query(api.campaigns.getCampaignOpponent, {
        opponentNumber: 5,
      });

      const queryTime = Date.now() - startTime;

      expect(opponent5?.opponentNumber).toBe(5);
      expect(opponent5?.isCampaignOpponent).toBe(true);
      expect(queryTime).toBeLessThan(100); // Should be very fast with index
    });

    test("wizardCampaignProgress indexes should support efficient queries", async () => {
      const userId = "performance_test_user";

      // Create multiple wizards and progress records
      const wizardIds: Id<"wizards">[] = [];
      for (let i = 0; i < 5; i++) {
        const wizardId = await t.mutation(
          internal.wizards.createWizardInternal,
          {
            name: `Performance Wizard ${i}`,
            description: `Wizard ${i} for performance testing`,
            owner: userId,
          }
        );
        wizardIds.push(wizardId);

        await t.mutation(api.campaigns.initializeWizardCampaignProgress, {
          wizardId,
          userId,
        });
      }

      // Test by_wizard index
      const startTime1 = Date.now();
      const progress = await t.query(api.campaigns.getWizardCampaignProgress, {
        wizardId: wizardIds[2],
      });
      const queryTime1 = Date.now() - startTime1;

      expect(progress?.wizardId).toBe(wizardIds[2]);
      expect(queryTime1).toBeLessThan(100);

      // Test by_user index
      const startTime2 = Date.now();
      const userProgress = await t.query(
        api.campaigns.getUserCampaignProgress,
        {
          userId,
        }
      );
      const queryTime2 = Date.now() - startTime2;

      expect(userProgress).toHaveLength(5);
      expect(queryTime2).toBeLessThan(100);
    });

    test("campaignBattles indexes should support efficient queries", async () => {
      const userId = "battle_performance_user";

      const wizardId = await t.mutation(internal.wizards.createWizardInternal, {
        name: "Battle Performance Wizard",
        description: "Wizard for battle performance testing",
        owner: userId,
      });

      // Create multiple battles
      const battleIds: Id<"campaignBattles">[] = [];
      for (let i = 1; i <= 5; i++) {
        const duelId = await t.mutation(internal.duels.createDuelInternal, {
          numberOfRounds: 3,
          wizards: [wizardId],
          players: [userId],
          isCampaignBattle: true,
        });

        const battleId = await t.mutation(api.campaigns.createCampaignBattle, {
          wizardId,
          userId,
          opponentNumber: i,
          duelId,
        });
        battleIds.push(battleId);
      }

      // Test by_wizard index
      const startTime1 = Date.now();
      const wizardBattles = await t.query(
        api.campaigns.getWizardCampaignBattles,
        {
          wizardId,
        }
      );
      const queryTime1 = Date.now() - startTime1;

      expect(wizardBattles).toHaveLength(5);
      expect(queryTime1).toBeLessThan(100);

      // Test by_user_opponent index
      const startTime2 = Date.now();
      const userOpponentBattles = await t.query(
        api.campaigns.getUserOpponentBattles,
        {
          userId,
          opponentNumber: 3,
        }
      );
      const queryTime2 = Date.now() - startTime2;

      expect(userOpponentBattles).toHaveLength(1);
      expect(queryTime2).toBeLessThan(100);
    });
  });

  describe("Data Integrity and Constraints", () => {
    test("should maintain referential integrity between tables", async () => {
      const userId = "integrity_test_user";

      const wizardId = await t.mutation(internal.wizards.createWizardInternal, {
        name: "Integrity Test Wizard",
        description: "Testing referential integrity",
        owner: userId,
      });

      // Initialize campaign progress
      await t.mutation(api.campaigns.initializeWizardCampaignProgress, {
        wizardId,
        userId,
      });

      // Create campaign battle
      const duelId = await t.mutation(internal.duels.createDuelInternal, {
        numberOfRounds: 3,
        wizards: [wizardId],
        players: [userId],
        isCampaignBattle: true,
      });

      const battleId = await t.mutation(api.campaigns.createCampaignBattle, {
        wizardId,
        userId,
        opponentNumber: 1,
        duelId,
      });

      // Verify all references are valid
      const progress = await t.query(api.campaigns.getWizardCampaignProgress, {
        wizardId,
      });
      const battle = await t.query(api.campaigns.getCampaignBattle, {
        battleId,
      });
      const duel = await t.query(api.duels.getDuel, {
        duelId,
      });

      expect(progress?.wizardId).toBe(wizardId);
      expect(battle?.wizardId).toBe(wizardId);
      expect(battle?.duelId).toBe(duelId);
      expect(duel?.wizards).toContain(wizardId);
      expect(duel?.isCampaignBattle).toBe(true);
    });

    test("should validate opponent number ranges", async () => {
      const userId = "constraint_test_user";

      const wizardId = await t.mutation(internal.wizards.createWizardInternal, {
        name: "Constraint Test Wizard",
        description: "Testing campaign constraints",
        owner: userId,
      });

      await t.mutation(api.campaigns.initializeWizardCampaignProgress, {
        wizardId,
        userId,
      });

      // Should not be able to defeat opponent with invalid numbers
      await expect(
        t.mutation(api.campaigns.defeatOpponent, {
          wizardId,
          opponentNumber: 0, // Invalid: too low
        })
      ).rejects.toThrow();

      await expect(
        t.mutation(api.campaigns.defeatOpponent, {
          wizardId,
          opponentNumber: 11, // Invalid: too high
        })
      ).rejects.toThrow();
    });

    test("should validate campaign progress constraints", async () => {
      const userId = "constraint_test_user";

      const wizardId = await t.mutation(internal.wizards.createWizardInternal, {
        name: "Constraint Test Wizard",
        description: "Testing campaign constraints",
        owner: userId,
      });

      await t.mutation(api.campaigns.initializeWizardCampaignProgress, {
        wizardId,
        userId,
      });

      // Should not be able to defeat opponent out of order
      await expect(
        t.mutation(api.campaigns.defeatOpponent, {
          wizardId,
          opponentNumber: 3, // Skipping opponents 1 and 2
        })
      ).rejects.toThrow();

      // Should not be able to defeat same opponent twice
      await t.mutation(api.campaigns.defeatOpponent, {
        wizardId,
        opponentNumber: 1,
      });

      await expect(
        t.mutation(api.campaigns.defeatOpponent, {
          wizardId,
          opponentNumber: 1, // Already defeated
        })
      ).rejects.toThrow();
    });
  });
});
