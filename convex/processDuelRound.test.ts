import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { Id } from "./_generated/dataModel";
import { generateTestId } from "./test_utils";

// Mock the AI text generation
const mockGenerateObject = vi.fn();
vi.mock("./aiTextGeneration", () => ({
  generateObject: mockGenerateObject,
}));

describe("Process Duel Round", () => {
  let t: ReturnType<typeof convexTest>;
  let wizard1Id: Id<"wizards">;
  let wizard2Id: Id<"wizards">;
  let duelId: Id<"duels">;

  beforeEach(async () => {
    t = convexTest(schema);
    vi.clearAllMocks();

    // Create test wizards
    wizard1Id = await t.run(async (ctx) => {
      return await ctx.db.insert("wizards", {
        owner: "player1",
        name: "Gandalf",
        description: "A wise wizard with a long beard",
        wins: 5,
        losses: 2,
        isAIPowered: false,
      });
    });

    wizard2Id = await t.run(async (ctx) => {
      return await ctx.db.insert("wizards", {
        owner: "player2",
        name: "Saruman",
        description: "A powerful wizard with dark magic",
        wins: 3,
        losses: 4,
        isAIPowered: false,
      });
    });

    // Create test duel
    duelId = await t.mutation(api.duels.createDuel, {
      numberOfRounds: 3,
      wizards: [wizard1Id, wizard2Id],
      players: ["player1", "player2"],
    });

    await t.run(async (ctx) => {
      await ctx.db.patch(duelId, { status: "IN_PROGRESS" });
    });
  });

  describe("Successful Round Processing", () => {
    test("should process a round with valid AI response", async () => {
      // Create a round with spells
      const roundId = await t.run(async (ctx) => {
        return await ctx.db.insert("duelRounds", {
          duelId,
          roundNumber: 1,
          type: "SPELL_CASTING",
          status: "PROCESSING",
          spells: {
            [wizard1Id]: {
              description: "Lightning bolt!",
              castBy: wizard1Id,
              timestamp: Date.now(),
            },
            [wizard2Id]: {
              description: "Fire shield!",
              castBy: wizard2Id,
              timestamp: Date.now(),
            },
          },
        });
      });

      // Mock successful AI response
      const mockAIResponse = {
        narration:
          "The lightning bolt crackles through the air as the fire shield blazes to life!",
        result: "Epic magical clash!",
        illustrationPrompt: "Two wizards casting spells in a magical arena",
        wizard1: {
          pointsEarned: 7,
          healthChange: -5,
        },
        wizard2: {
          pointsEarned: 5,
          healthChange: -10,
        },
      };

      mockGenerateObject.mockResolvedValue(mockAIResponse);

      const result = await t.action(api.processDuelRound.processDuelRound, {
        duelId,
        roundId,
      });

      expect(result).toEqual({ success: true, roundId });

      // Verify round was completed
      const round = await t.run(async (ctx) => {
        return await ctx.db.get(roundId);
      });

      expect(round?.status).toBe("COMPLETED");
      expect(round?.outcome?.narrative).toContain("lightning bolt");
      expect(round?.outcome?.result).toBe("Epic magical clash!");

      // Verify duel state was updated
      const duel = await t.query(api.duels.getDuel, { duelId });
      expect(duel?.points[wizard1Id]).toBe(7);
      expect(duel?.points[wizard2Id]).toBe(5);
      expect(duel?.hitPoints[wizard1Id]).toBe(95);
      expect(duel?.hitPoints[wizard2Id]).toBe(90);
      expect(duel?.currentRound).toBe(2);
    });

    test("should bound health changes correctly", async () => {
      const roundId = await t.run(async (ctx) => {
        return await ctx.db.insert("duelRounds", {
          duelId,
          roundNumber: 1,
          type: "SPELL_CASTING",
          status: "PROCESSING",
          spells: {
            [wizard1Id]: {
              description: "Healing spell",
              castBy: wizard1Id,
              timestamp: Date.now(),
            },
            [wizard2Id]: {
              description: "Death ray",
              castBy: wizard2Id,
              timestamp: Date.now(),
            },
          },
        });
      });

      // Mock AI response with extreme health changes
      const mockAIResponse = {
        narration: "Extreme healing and devastating damage!",
        result: "Life and death magic!",
        illustrationPrompt: "Healing light vs death ray",
        wizard1: {
          pointsEarned: 8,
          healthChange: 50, // Should be capped at 100 total
        },
        wizard2: {
          pointsEarned: 2,
          healthChange: -150, // Should be capped at 0
        },
      };

      mockGenerateObject.mockResolvedValue(mockAIResponse);

      await t.action(api.processDuelRound.processDuelRound, {
        duelId,
        roundId,
      });

      const duel = await t.query(api.duels.getDuel, { duelId });
      expect(duel?.hitPoints[wizard1Id]).toBe(100); // Capped at max
      expect(duel?.hitPoints[wizard2Id]).toBe(0); // Capped at min
      expect(duel?.status).toBe("COMPLETED"); // Duel should end due to death
    });

    test("should end duel when wizard dies", async () => {
      const roundId = await t.run(async (ctx) => {
        return await ctx.db.insert("duelRounds", {
          duelId,
          roundNumber: 1,
          type: "SPELL_CASTING",
          status: "PROCESSING",
          spells: {
            [wizard1Id]: {
              description: "Killing curse",
              castBy: wizard1Id,
              timestamp: Date.now(),
            },
            [wizard2Id]: {
              description: "Shield charm",
              castBy: wizard2Id,
              timestamp: Date.now(),
            },
          },
        });
      });

      const mockAIResponse = {
        narration: "The killing curse strikes true!",
        result: "Wizard defeated!",
        illustrationPrompt: "Defeated wizard falling",
        wizard1: {
          pointsEarned: 10,
          healthChange: 0,
        },
        wizard2: {
          pointsEarned: 0,
          healthChange: -100,
        },
      };

      mockGenerateObject.mockResolvedValue(mockAIResponse);

      await t.action(api.processDuelRound.processDuelRound, {
        duelId,
        roundId,
      });

      const duel = await t.query(api.duels.getDuel, { duelId });
      expect(duel?.status).toBe("COMPLETED");
      expect(duel?.winners).toEqual([wizard1Id]);
      expect(duel?.losers).toEqual([wizard2Id]);
    });
  });

  describe("Fallback Handling", () => {
    test("should use fallback when AI returns invalid JSON", async () => {
      const roundId = await t.run(async (ctx) => {
        return await ctx.db.insert("duelRounds", {
          duelId,
          roundNumber: 1,
          type: "SPELL_CASTING",
          status: "PROCESSING",
          spells: {
            [wizard1Id]: {
              description: "Magic missile",
              castBy: wizard1Id,
              timestamp: Date.now(),
            },
            [wizard2Id]: {
              description: "Counter spell",
              castBy: wizard2Id,
              timestamp: Date.now(),
            },
          },
        });
      });

      // Mock AI response with invalid JSON
      mockGenerateObject.mockResolvedValue("This is not valid JSON at all!");

      const result = await t.action(api.processDuelRound.processDuelRound, {
        duelId,
        roundId,
      });

      expect(result).toEqual({ success: true, roundId });

      const round = await t.run(async (ctx) => {
        return await ctx.db.get(roundId);
      });

      expect(round?.status).toBe("COMPLETED");
      expect(round?.outcome?.narrative).toContain("magical energies crackle");
      expect(round?.outcome?.result).toContain("clash with spectacular");
    });

    test("should use fallback when AI throws error", async () => {
      const roundId = await t.run(async (ctx) => {
        return await ctx.db.insert("duelRounds", {
          duelId,
          roundNumber: 1,
          type: "SPELL_CASTING",
          status: "PROCESSING",
          spells: {
            [wizard1Id]: {
              description: "Fireball",
              castBy: wizard1Id,
              timestamp: Date.now(),
            },
            [wizard2Id]: {
              description: "Ice wall",
              castBy: wizard2Id,
              timestamp: Date.now(),
            },
          },
        });
      });

      // Mock AI to throw an error
      mockGenerateObject.mockRejectedValue(new Error("AI service unavailable"));

      const result = await t.action(api.processDuelRound.processDuelRound, {
        duelId,
        roundId,
      });

      expect(result).toEqual({ success: true, roundId });

      const round = await t.run(async (ctx) => {
        return await ctx.db.get(roundId);
      });

      expect(round?.status).toBe("COMPLETED");
      expect(round?.outcome?.narrative).toBeDefined();
      expect(round?.outcome?.result).toBeDefined();
    });

    test("should sanitize AI response values", async () => {
      const roundId = await t.run(async (ctx) => {
        return await ctx.db.insert("duelRounds", {
          duelId,
          roundNumber: 1,
          type: "SPELL_CASTING",
          status: "PROCESSING",
          spells: {
            [wizard1Id]: {
              description: "Power spell",
              castBy: wizard1Id,
              timestamp: Date.now(),
            },
            [wizard2Id]: {
              description: "Defense spell",
              castBy: wizard2Id,
              timestamp: Date.now(),
            },
          },
        });
      });

      // Mock AI response with out-of-bounds values
      const mockAIResponse = JSON.stringify({
        narration: "Epic battle!",
        result: "Great fight!",
        illustrationPrompt: "Battle scene",
        wizard1: {
          pointsEarned: 15, // Should be capped at 10
          healthChange: -200, // Should be bounded
        },
        wizard2: {
          pointsEarned: -5, // Should be capped at 0
          healthChange: 150, // Should be bounded
        },
      });

      mockGenerateObject.mockResolvedValue(mockAIResponse);

      await t.action(api.processDuelRound.processDuelRound, {
        duelId,
        roundId,
      });

      const duel = await t.query(api.duels.getDuel, { duelId });
      expect(duel?.points[wizard1Id]).toBe(10); // Capped at 10
      expect(duel?.points[wizard2Id]).toBe(0); // Capped at 0
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
          status: "IN_PROGRESS",
          currentRound: 1,
          createdAt: Date.now(),
          points: {},
          hitPoints: {},
          needActionsFrom: [],
        });
      });

      const roundId = await t.run(async (ctx) => {
        return await ctx.db.insert("duelRounds", {
          duelId: tempDuelId,
          roundNumber: 1,
          type: "SPELL_CASTING",
          status: "PROCESSING",
        });
      });

      await t.run(async (ctx) => {
        await ctx.db.delete(tempDuelId);
      });

      await expect(
        t.action(api.processDuelRound.processDuelRound, {
          duelId: tempDuelId,
          roundId,
        })
      ).rejects.toThrow("Duel not found");
    });

    test("should handle non-existent round", async () => {
      // Create a round and then delete it to get a valid but non-existent ID
      const tempRoundId = await t.run(async (ctx) => {
        return await ctx.db.insert("duelRounds", {
          duelId,
          roundNumber: 2,
          type: "SPELL_CASTING",
          status: "PROCESSING",
        });
      });

      await t.run(async (ctx) => {
        await ctx.db.delete(tempRoundId);
      });

      await expect(
        t.action(api.processDuelRound.processDuelRound, {
          duelId,
          roundId: tempRoundId,
        })
      ).rejects.toThrow("Round not found");
    });

    test("should handle missing wizard data", async () => {
      // Create duel with non-existent wizard
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
          wizards: [tempWizardId],
          players: ["player1"],
          status: "IN_PROGRESS",
          currentRound: 1,
          createdAt: Date.now(),
          points: {},
          hitPoints: {},
          needActionsFrom: [],
        });
      });

      const roundId = await t.run(async (ctx) => {
        return await ctx.db.insert("duelRounds", {
          duelId: badDuelId,
          roundNumber: 1,
          type: "SPELL_CASTING",
          status: "PROCESSING",
        });
      });

      await expect(
        t.action(api.processDuelRound.processDuelRound, {
          duelId: badDuelId,
          roundId,
        })
      ).rejects.toThrow("Could not fetch all wizard data");
    });

    test("should handle duel with insufficient wizards", async () => {
      const singleWizardDuelId = await t.run(async (ctx) => {
        return await ctx.db.insert("duels", {
          numberOfRounds: 3,
          wizards: [wizard1Id],
          players: ["player1"],
          status: "IN_PROGRESS",
          currentRound: 1,
          createdAt: Date.now(),
          points: { [wizard1Id]: 0 },
          hitPoints: { [wizard1Id]: 100 },
          needActionsFrom: [wizard1Id],
        });
      });

      const roundId = await t.run(async (ctx) => {
        return await ctx.db.insert("duelRounds", {
          duelId: singleWizardDuelId,
          roundNumber: 1,
          type: "SPELL_CASTING",
          status: "PROCESSING",
        });
      });

      await expect(
        t.action(api.processDuelRound.processDuelRound, {
          duelId: singleWizardDuelId,
          roundId,
        })
      ).rejects.toThrow("Could not fetch all wizard data");
    });
  });

  describe("Round Processing Edge Cases", () => {
    test("should handle round with missing spells", async () => {
      const roundId = await t.run(async (ctx) => {
        return await ctx.db.insert("duelRounds", {
          duelId,
          roundNumber: 1,
          type: "SPELL_CASTING",
          status: "PROCESSING",
          // No spells defined
        });
      });

      const mockAIResponse = JSON.stringify({
        narration: "Both wizards hesitate, no spells cast!",
        result: "Standoff!",
        illustrationPrompt: "Two wizards staring at each other",
        wizard1: {
          pointsEarned: 1,
          healthChange: 0,
        },
        wizard2: {
          pointsEarned: 1,
          healthChange: 0,
        },
      });

      mockGenerateObject.mockResolvedValue(mockAIResponse);

      const result = await t.action(api.processDuelRound.processDuelRound, {
        duelId,
        roundId,
      });

      expect(result).toEqual({ success: true, roundId });

      const round = await t.run(async (ctx) => {
        return await ctx.db.get(roundId);
      });

      expect(round?.status).toBe("COMPLETED");
      expect(round?.outcome?.narrative).toContain("hesitate");
    });

    test("should handle partial spell data", async () => {
      const roundId = await t.run(async (ctx) => {
        return await ctx.db.insert("duelRounds", {
          duelId,
          roundNumber: 1,
          type: "SPELL_CASTING",
          status: "PROCESSING",
          spells: {
            [wizard1Id]: {
              description: "Lightning bolt",
              castBy: wizard1Id,
              timestamp: Date.now(),
            },
            // wizard2 has no spell
          },
        });
      });

      const mockAIResponse = JSON.stringify({
        narration: "One wizard attacks while the other does nothing!",
        result: "Uncontested attack!",
        illustrationPrompt: "One wizard casting, other standing idle",
        wizard1: {
          pointsEarned: 8,
          healthChange: 0,
        },
        wizard2: {
          pointsEarned: 0,
          healthChange: -15,
        },
      });

      mockGenerateObject.mockResolvedValue(mockAIResponse);

      const result = await t.action(api.processDuelRound.processDuelRound, {
        duelId,
        roundId,
      });

      expect(result).toEqual({ success: true, roundId });

      const duel = await t.query(api.duels.getDuel, { duelId });
      expect(duel?.points[wizard1Id]).toBe(8);
      expect(duel?.points[wizard2Id]).toBe(0);
      expect(duel?.hitPoints[wizard2Id]).toBe(85);
    });

    test("should handle TO_THE_DEATH duel type", async () => {
      const deathDuelId = await t.run(async (ctx) => {
        return await ctx.db.insert("duels", {
          numberOfRounds: "TO_THE_DEATH",
          wizards: [wizard1Id, wizard2Id],
          players: ["player1", "player2"],
          status: "IN_PROGRESS",
          currentRound: 1,
          createdAt: Date.now(),
          points: { [wizard1Id]: 0, [wizard2Id]: 0 },
          hitPoints: { [wizard1Id]: 100, [wizard2Id]: 100 },
          needActionsFrom: [wizard1Id, wizard2Id],
        });
      });

      const roundId = await t.run(async (ctx) => {
        return await ctx.db.insert("duelRounds", {
          duelId: deathDuelId,
          roundNumber: 1,
          type: "SPELL_CASTING",
          status: "PROCESSING",
          spells: {
            [wizard1Id]: {
              description: "Mortal strike",
              castBy: wizard1Id,
              timestamp: Date.now(),
            },
            [wizard2Id]: {
              description: "Last stand",
              castBy: wizard2Id,
              timestamp: Date.now(),
            },
          },
        });
      });

      const mockAIResponse = JSON.stringify({
        narration: "A battle to the death rages on!",
        result: "Death match continues!",
        illustrationPrompt: "Intense death match",
        wizard1: {
          pointsEarned: 5,
          healthChange: -20,
        },
        wizard2: {
          pointsEarned: 3,
          healthChange: -25,
        },
      });

      mockGenerateObject.mockResolvedValue(mockAIResponse);

      await t.action(api.processDuelRound.processDuelRound, {
        duelId: deathDuelId,
        roundId,
      });

      const duel = await t.query(api.duels.getDuel, { duelId: deathDuelId });
      expect(duel?.numberOfRounds).toBe("TO_THE_DEATH");
      expect(duel?.status).toBe("IN_PROGRESS"); // Should continue until someone dies
      expect(duel?.currentRound).toBe(2);
    });
  });

  describe("Conclusion Generation", () => {
    test("should generate conclusion when duel ends", async () => {
      // Set up a duel that will end after this round
      const finalDuelId = await t.run(async (ctx) => {
        return await ctx.db.insert("duels", {
          numberOfRounds: 1, // Only 1 round
          wizards: [wizard1Id, wizard2Id],
          players: ["player1", "player2"],
          status: "IN_PROGRESS",
          currentRound: 1,
          createdAt: Date.now(),
          points: { [wizard1Id]: 0, [wizard2Id]: 0 },
          hitPoints: { [wizard1Id]: 100, [wizard2Id]: 100 },
          needActionsFrom: [wizard1Id, wizard2Id],
        });
      });

      const roundId = await t.run(async (ctx) => {
        return await ctx.db.insert("duelRounds", {
          duelId: finalDuelId,
          roundNumber: 1,
          type: "SPELL_CASTING",
          status: "PROCESSING",
          spells: {
            [wizard1Id]: {
              description: "Final spell",
              castBy: wizard1Id,
              timestamp: Date.now(),
            },
            [wizard2Id]: {
              description: "Last attempt",
              castBy: wizard2Id,
              timestamp: Date.now(),
            },
          },
        });
      });

      // Mock both the round response and conclusion response
      mockGenerateObject
        .mockResolvedValueOnce({
          narration: "The final round begins!",
          result: "Last battle!",
          illustrationPrompt: "Final confrontation",
          wizard1: {
            pointsEarned: 8,
            healthChange: -5,
          },
          wizard2: {
            pointsEarned: 3,
            healthChange: -10,
          },
        })
        .mockResolvedValueOnce({
          narration: "The duel concludes with Gandalf victorious!",
          result: "Gandalf wins the epic duel!",
          illustrationPrompt:
            "Gandalf celebrating victory while Saruman looks defeated",
        });

      await t.action(api.processDuelRound.processDuelRound, {
        duelId: finalDuelId,
        roundId,
      });

      const duel = await t.query(api.duels.getDuel, { duelId: finalDuelId });
      expect(duel?.status).toBe("COMPLETED");
      expect(duel?.winners).toEqual([wizard1Id]);

      // Check that conclusion round was created
      const rounds = await t.query(api.duels.getDuelRounds, {
        duelId: finalDuelId,
      });
      const conclusionRound = rounds.find((r) => r.type === "CONCLUSION");
      const finalRegularRound = rounds.find(
        (r) => r.type === "SPELL_CASTING" && r.roundNumber === 1
      );

      expect(conclusionRound).toBeDefined();
      expect(finalRegularRound).toBeDefined();
      expect(conclusionRound?.outcome?.narrative).toContain(
        "concludes with Gandalf victorious"
      );

      // Verify that conclusion round has a unique round number (should be 2, not 1)
      expect(conclusionRound?.roundNumber).toBe(2);
      expect(finalRegularRound?.roundNumber).toBe(1);
      expect(conclusionRound?.roundNumber).not.toBe(
        finalRegularRound?.roundNumber
      );
    });
  });

  describe("Previous Rounds Context", () => {
    test("should include previous round context in AI prompt", async () => {
      // Mock AI response for multiple rounds
      mockGenerateObject
        .mockResolvedValueOnce({
          narration: "First round battle begins!",
          result: "Round 1 complete",
          illustrationPrompt: "First round illustration",
          wizard1: { pointsEarned: 5, healthChange: -10 },
          wizard2: { pointsEarned: 3, healthChange: -5 },
        })
        .mockResolvedValueOnce({
          narration: "Second round continues the epic battle!",
          result: "Round 2 complete",
          illustrationPrompt: "Second round illustration",
          wizard1: { pointsEarned: 4, healthChange: -15 },
          wizard2: { pointsEarned: 6, healthChange: -8 },
        });

      // Start the duel
      await t.mutation(api.duels.startDuelAfterIntroduction, { duelId });

      // Cast spells for round 1
      await t.mutation(api.duels.castSpell, {
        duelId,
        wizardId: wizard1Id,
        spellDescription: "Fireball attack",
      });

      await t.mutation(api.duels.castSpell, {
        duelId,
        wizardId: wizard2Id,
        spellDescription: "Ice shield defense",
      });

      // Process round 1
      const rounds1 = await t.query(api.duels.getDuelRounds, { duelId });
      const round1 = rounds1.find((r) => r.roundNumber === 1);
      expect(round1).toBeDefined();

      await t.action(api.processDuelRound.processDuelRound, {
        duelId,
        roundId: round1!._id,
      });

      // Cast spells for round 2
      await t.mutation(api.duels.castSpell, {
        duelId,
        wizardId: wizard1Id,
        spellDescription: "Lightning bolt",
      });

      await t.mutation(api.duels.castSpell, {
        duelId,
        wizardId: wizard2Id,
        spellDescription: "Healing potion",
      });

      // Process round 2
      const rounds2 = await t.query(api.duels.getDuelRounds, { duelId });
      const round2 = rounds2.find((r) => r.roundNumber === 2);
      expect(round2).toBeDefined();

      await t.action(api.processDuelRound.processDuelRound, {
        duelId,
        roundId: round2!._id,
      });

      // Verify that the second AI call included context from the first round
      expect(mockGenerateObject).toHaveBeenCalledTimes(2);

      // Check the second call's prompt includes previous round context
      const secondCallArgs = mockGenerateObject.mock.calls[1];
      const secondPrompt = secondCallArgs[0];

      expect(secondPrompt).toContain("=== Previous Rounds ===");
      expect(secondPrompt).toContain("Round 1");
      expect(secondPrompt).toContain("First round battle begins!");
      expect(secondPrompt).toContain("Gandalf (+5)");
      expect(secondPrompt).toContain("Saruman (+3)");
      expect(secondPrompt).toContain("=== Round 2 ===");
    });
  });
});
