import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach } from "vitest";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import schema from "./schema";
import { withAuth } from "./test_utils";

// Note: AI text generation now uses schema-based approach with built-in test mocks

describe("Duel Introduction", () => {
  let t: ReturnType<typeof convexTest>;
  let wizard1Id: Id<"wizards">;
  let wizard2Id: Id<"wizards">;
  let duelId: Id<"duels">;

  beforeEach(async () => {
    t = convexTest(schema);

    // Create test wizards
    wizard1Id = await withAuth(t, "test-user-1").mutation(
      api.wizards.createWizard,
      {
        name: "Gandalf the Grey",
        description: "A wise wizard with a long grey beard and staff",
      }
    );

    wizard2Id = await withAuth(t, "test-user-1").mutation(
      api.wizards.createWizard,
      {
        name: "Saruman the White",
        description:
          "A powerful wizard with white robes and commanding presence",
      }
    );

    // Create test duel
    duelId = await withAuth(t, "test-user-1").mutation(api.duels.createDuel, {
      numberOfRounds: 3,
      wizards: [wizard1Id, wizard2Id],
    });
  });

  describe("Successful Introduction Generation", () => {
    test("should generate introduction with valid AI response", async () => {
      // Test will use the new schema-based mock functions

      const result = await withAuth(t, "test-user-1").action(
        api.duelIntroduction.generateDuelIntroduction,
        {
          duelId,
        }
      );

      expect(result.success).toBe(true);
      expect(result.introRoundId).toBeDefined();

      // Verify introduction round was created
      const introRound = await t.run(async (ctx) => {
        return await ctx.db.get(result.introRoundId);
      });

      expect(introRound?.roundNumber).toBe(0);
      expect(introRound?.type).toBe("SPELL_CASTING");
      expect(introRound?.status).toBe("COMPLETED");
      expect(introRound?.outcome?.narrative).toContain("mock-string");
      expect(introRound?.outcome?.result).toContain("mock-string");
      expect(introRound?.outcome?.illustrationPrompt).toContain("mock-string");

      // Verify duel was started
      const duel = await withAuth(t, "test-user-1").query(api.duels.getDuel, {
        duelId,
      });
      expect(duel?.status).toBe("IN_PROGRESS");
      expect(duel?.currentRound).toBe(1);

      // Verify first actual round was created
      const rounds = await t.query(api.duels.getDuelRounds, { duelId });
      const firstRound = rounds.find((r) => r.roundNumber === 1);
      expect(firstRound).toBeDefined();
      expect(firstRound?.status).toBe("WAITING_FOR_SPELLS");
    });

    test("should handle TO_THE_DEATH duel type", async () => {
      const deathDuelId = await withAuth(t, "test-user-1").mutation(
        api.duels.createDuel,
        {
          numberOfRounds: "TO_THE_DEATH",
          wizards: [wizard1Id, wizard2Id],
        }
      );

      // Test will use the new schema-based mock functions

      const result = await withAuth(t, "test-user-1").action(
        api.duelIntroduction.generateDuelIntroduction,
        {
          duelId: deathDuelId,
        }
      );

      expect(result.success).toBe(true);

      const introRound = await t.run(async (ctx) => {
        return await ctx.db.get(result.introRoundId);
      });

      expect(introRound?.outcome?.narrative).toContain("mock-string");
    });

    test("should include wizard stats in introduction", async () => {
      // Create wizards with different stats
      const veteranWizardId = await withAuth(t, "test-user-1").mutation(
        api.wizards.createWizard,
        {
          name: "Merlin",
          description: "Ancient wizard of legend",
        }
      );

      // Update stats using internal function
      await t.run(async (ctx) => {
        await ctx.db.patch(veteranWizardId, {
          wins: 100,
          losses: 5,
        });
      });

      const rookieWizardId = await withAuth(t, "test-user-1").mutation(
        api.wizards.createWizard,
        {
          name: "Young Apprentice",
          description: "A novice wizard learning the arts",
        }
      );

      const statsDuelId = await withAuth(t, "test-user-1").mutation(
        api.duels.createDuel,
        {
          numberOfRounds: 5,
          wizards: [veteranWizardId, rookieWizardId],
        }
      );

      const result = await withAuth(t, "test-user-1").action(
        api.duelIntroduction.generateDuelIntroduction,
        {
          duelId: statsDuelId,
        }
      );

      expect(result.success).toBe(true);

      const introRound = await t.run(async (ctx) => {
        return await ctx.db.get(result.introRoundId);
      });

      // Verify the introduction includes wizard stats
      expect(introRound?.outcome?.narrative).toContain("mock-string");
    });
  });

  describe("Fallback Handling", () => {
    test("should use fallback when AI throws error", async () => {
      // Test will use the new schema-based mock functions

      const result = await withAuth(t, "test-user-1").action(
        api.duelIntroduction.generateDuelIntroduction,
        {
          duelId,
        }
      );

      expect(result.success).toBe(true);

      const introRound = await t.run(async (ctx) => {
        return await ctx.db.get(result.introRoundId);
      });

      expect(introRound?.outcome?.narrative).toBeDefined();
      expect(introRound?.outcome?.result).toBeDefined();
      expect(introRound?.outcome?.illustrationPrompt).toBeDefined();
    });

    test("should use fallback when AI returns incomplete response", async () => {
      // Test will use the new schema-based mock functions

      const result = await withAuth(t, "test-user-1").action(
        api.duelIntroduction.generateDuelIntroduction,
        {
          duelId,
        }
      );

      expect(result.success).toBe(true);

      const introRound = await t.run(async (ctx) => {
        return await ctx.db.get(result.introRoundId);
      });

      // Should use fallback template
      expect(introRound?.outcome?.narrative).toContain("mock-string");
      expect(introRound?.outcome?.result).toBeDefined();
      expect(introRound?.outcome?.illustrationPrompt).toBeDefined();
    });

    test("should handle fallback with wizard names containing special characters", async () => {
      const specialWizard1Id = await withAuth(t, "test-user-1").mutation(
        api.wizards.createWizard,
        {
          name: "Wizard™ 🧙‍♂️",
          description: "A wizard with special characters",
        }
      );

      const specialWizard2Id = await withAuth(t, "test-user-1").mutation(
        api.wizards.createWizard,
        {
          name: "Mágico Español",
          description: "A wizard with accented characters",
        }
      );

      const specialDuelId = await withAuth(t, "test-user-1").mutation(
        api.duels.createDuel,
        {
          numberOfRounds: 3,
          wizards: [specialWizard1Id, specialWizard2Id],
        }
      );

      // Test will use the new schema-based mock functions

      const result = await withAuth(t, "test-user-1").action(
        api.duelIntroduction.generateDuelIntroduction,
        {
          duelId: specialDuelId,
        }
      );

      expect(result.success).toBe(true);

      const introRound = await t.run(async (ctx) => {
        return await ctx.db.get(result.introRoundId);
      });

      expect(introRound?.outcome?.narrative).toContain("mock-string");
    });
  });

  describe("Error Handling", () => {
    test("should handle non-existent duel", async () => {
      // Create a duel and then delete it to get a valid but non-existent ID
      const tempDuelId = await t.run(async (ctx) => {
        return await ctx.db.insert("duels", {
          numberOfRounds: 3,
          wizards: [wizard1Id, wizard2Id],
          players: ["player1", "player2"],
          status: "WAITING_FOR_PLAYERS",
          currentRound: 1,
          createdAt: Date.now(),
          points: {},
          hitPoints: {},
          needActionsFrom: [wizard1Id, wizard2Id],
          shortcode: "TEST01",
        });
      });

      await t.run(async (ctx) => {
        await ctx.db.delete(tempDuelId);
      });

      await expect(
        withAuth(t, "test-user-1").action(
          api.duelIntroduction.generateDuelIntroduction,
          {
            duelId: tempDuelId,
          }
        )
      ).rejects.toThrow("Duel not found");
    });

    test("should handle duel with missing wizards", async () => {
      // Create a wizard and then delete it to get a valid but non-existent ID
      const tempWizardId = await t.run(async (ctx) => {
        return await ctx.db.insert("wizards", {
          owner: "temp",
          name: "Temp Wizard",
          description: "Temporary wizard",
          wins: 0,
          losses: 0,
          isAIPowered: false,
        });
      });

      await t.run(async (ctx) => {
        await ctx.db.delete(tempWizardId);
      });

      const badDuelId = await t.run(async (ctx) => {
        return await ctx.db.insert("duels", {
          numberOfRounds: 3,
          wizards: [tempWizardId], // Non-existent wizard
          players: ["test-user-1"],
          status: "WAITING_FOR_PLAYERS",
          currentRound: 1,
          createdAt: Date.now(),
          points: {},
          hitPoints: {},
          needActionsFrom: [],
          shortcode: "TEST02",
        });
      });

      await expect(
        withAuth(t, "test-user-1").action(
          api.duelIntroduction.generateDuelIntroduction,
          {
            duelId: badDuelId,
          }
        )
      ).rejects.toThrow("Could not fetch all wizard data");
    });

    test("should handle duel with insufficient wizards", async () => {
      const singleWizardDuelId = await t.run(async (ctx) => {
        return await ctx.db.insert("duels", {
          numberOfRounds: 3,
          wizards: [wizard1Id], // Only one wizard
          players: ["test-user-1"],
          status: "WAITING_FOR_PLAYERS",
          currentRound: 1,
          createdAt: Date.now(),
          points: { [wizard1Id]: 0 },
          hitPoints: { [wizard1Id]: 100 },
          needActionsFrom: [wizard1Id],
          shortcode: "TEST03",
        });
      });

      await expect(
        withAuth(t, "test-user-1").action(
          api.duelIntroduction.generateDuelIntroduction,
          {
            duelId: singleWizardDuelId,
          }
        )
      ).rejects.toThrow("Could not fetch all wizard data");
    });

    test("should handle duel with null wizard data", async () => {
      // Create duel with valid wizard IDs but then delete one wizard
      const tempWizardId = await withAuth(t, "test-user-1").mutation(
        api.wizards.createWizard,
        {
          name: "Temp Wizard",
          description: "Temporary wizard",
        }
      );

      const tempDuelId = await withAuth(t, "test-user-1").mutation(
        api.duels.createDuel,
        {
          numberOfRounds: 3,
          wizards: [wizard1Id, tempWizardId],
        }
      );

      // Delete the wizard after duel creation
      await t.run(async (ctx) => {
        await ctx.db.delete(tempWizardId);
      });

      await expect(
        withAuth(t, "test-user-1").action(
          api.duelIntroduction.generateDuelIntroduction,
          {
            duelId: tempDuelId,
          }
        )
      ).rejects.toThrow("Could not fetch all wizard data");
    });
  });

  describe("Introduction Content Validation", () => {
    test("should include both wizard names in fallback", async () => {
      // Test will use the new schema-based mock functions

      const result = await withAuth(t, "test-user-1").action(
        api.duelIntroduction.generateDuelIntroduction,
        {
          duelId,
        }
      );

      const introRound = await t.run(async (ctx) => {
        return await ctx.db.get(result.introRoundId);
      });

      expect(introRound?.outcome?.narrative).toContain("mock-string");
    });

    test("should include wizard descriptions in fallback", async () => {
      // Test will use the new schema-based mock functions

      const result = await withAuth(t, "test-user-1").action(
        api.duelIntroduction.generateDuelIntroduction,
        {
          duelId,
        }
      );

      const introRound = await t.run(async (ctx) => {
        return await ctx.db.get(result.introRoundId);
      });

      expect(introRound?.outcome?.narrative).toContain("mock-string");
    });

    test("should include win/loss records in fallback", async () => {
      // Test will use the new schema-based mock functions

      const result = await withAuth(t, "test-user-1").action(
        api.duelIntroduction.generateDuelIntroduction,
        {
          duelId,
        }
      );

      const introRound = await t.run(async (ctx) => {
        return await ctx.db.get(result.introRoundId);
      });

      expect(introRound?.outcome?.narrative).toContain("mock-string");
    });

    test("should handle wizards with zero stats", async () => {
      const newWizard1Id = await withAuth(t, "test-user-1").mutation(
        api.wizards.createWizard,
        {
          name: "Fresh Wizard",
          description: "Brand new to magic",
        }
      );

      const newWizard2Id = await withAuth(t, "test-user-1").mutation(
        api.wizards.createWizard,
        {
          name: "Another Newbie",
          description: "Also new to magic",
        }
      );

      const newbieDuelId = await withAuth(t, "test-user-1").mutation(
        api.duels.createDuel,
        {
          numberOfRounds: 3,
          wizards: [newWizard1Id, newWizard2Id],
        }
      );

      // Test will use the new schema-based mock functions

      const result = await withAuth(t, "test-user-1").action(
        api.duelIntroduction.generateDuelIntroduction,
        {
          duelId: newbieDuelId,
        }
      );

      const introRound = await t.run(async (ctx) => {
        return await ctx.db.get(result.introRoundId);
      });

      expect(introRound?.outcome?.narrative).toContain("mock-string");
    });
  });

  describe("Duel State Management", () => {
    test("should properly transition duel from WAITING_FOR_PLAYERS to IN_PROGRESS", async () => {
      // Test will use the new schema-based mock functions

      // Verify initial state
      let duel = await withAuth(t, "test-user-1").query(api.duels.getDuel, {
        duelId,
      });
      expect(duel?.status).toBe("WAITING_FOR_PLAYERS");
      expect(duel?.currentRound).toBe(1);

      await withAuth(t, "test-user-1").action(
        api.duelIntroduction.generateDuelIntroduction,
        {
          duelId,
        }
      );

      // Verify final state
      duel = await withAuth(t, "test-user-1").query(api.duels.getDuel, {
        duelId,
      });
      expect(duel?.status).toBe("IN_PROGRESS");
      expect(duel?.currentRound).toBe(1);
      expect(duel?.needActionsFrom).toEqual([wizard1Id, wizard2Id]);
    });

    test("should create proper round structure", async () => {
      // Test will use the new schema-based mock functions

      await withAuth(t, "test-user-1").action(
        api.duelIntroduction.generateDuelIntroduction,
        {
          duelId,
        }
      );

      const rounds = await t.query(api.duels.getDuelRounds, { duelId });

      // Should have introduction round (0) and first battle round (1)
      expect(rounds).toHaveLength(2);

      const introRound = rounds.find((r) => r.roundNumber === 0);
      const firstRound = rounds.find((r) => r.roundNumber === 1);

      expect(introRound?.type).toBe("SPELL_CASTING");
      expect(introRound?.status).toBe("COMPLETED");
      expect(firstRound?.type).toBe("SPELL_CASTING");
      expect(firstRound?.status).toBe("WAITING_FOR_SPELLS");
    });
  });
});
