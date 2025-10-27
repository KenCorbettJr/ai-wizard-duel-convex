import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach } from "vitest";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import schema from "./schema";
import { withAuth } from "./test_utils";

describe("Luck Rolls", () => {
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
        name: "Gandalf",
        description: "A wise wizard with a long beard",
      }
    );

    wizard2Id = await withAuth(t, "test-user-1").mutation(
      api.wizards.createWizard,
      {
        name: "Saruman",
        description: "A powerful wizard with dark magic",
      }
    );

    // Create test duel
    duelId = await withAuth(t, "test-user-1").mutation(api.duels.createDuel, {
      numberOfRounds: 3,
      wizards: [wizard1Id, wizard2Id],
    });
  });

  test("should store and retrieve luck rolls in duel rounds", async () => {
    // Create a round manually
    const roundId = await t.run(async (ctx) => {
      return await ctx.db.insert("duelRounds", {
        duelId,
        roundNumber: 1,
        type: "SPELL_CASTING",
        status: "WAITING_FOR_SPELLS",
      });
    });

    // Complete the round with luck rolls
    await t.mutation(api.duels.completeRound, {
      roundId,
      outcome: {
        narrative: "The wizards clash with magical force!",
        result: "Epic magical battle!",
        pointsAwarded: {
          [wizard1Id]: 5,
          [wizard2Id]: 3,
        },
        healthChange: {
          [wizard1Id]: -10,
          [wizard2Id]: -15,
        },
        luckRolls: {
          [wizard1Id]: 18,
          [wizard2Id]: 7,
        },
      },
    });

    // Retrieve the updated round
    const updatedRounds = await t.query(api.duels.getDuelRounds, { duelId });
    const completedRound = updatedRounds.find((r) => r.roundNumber === 1);

    expect(completedRound).toBeDefined();
    expect(completedRound?.status).toBe("COMPLETED");
    expect(completedRound?.outcome?.luckRolls).toBeDefined();
    expect(completedRound?.outcome?.luckRolls?.[wizard1Id]).toBe(18);
    expect(completedRound?.outcome?.luckRolls?.[wizard2Id]).toBe(7);
  });

  test("should handle rounds without luck rolls (backward compatibility)", async () => {
    // Create a round manually
    const roundId = await t.run(async (ctx) => {
      return await ctx.db.insert("duelRounds", {
        duelId,
        roundNumber: 1,
        type: "SPELL_CASTING",
        status: "WAITING_FOR_SPELLS",
      });
    });

    // Complete the round without luck rolls (old format)
    await t.mutation(api.duels.completeRound, {
      roundId,
      outcome: {
        narrative: "The wizards clash with magical force!",
        result: "Epic magical battle!",
        pointsAwarded: {
          [wizard1Id]: 5,
          [wizard2Id]: 3,
        },
        healthChange: {
          [wizard1Id]: -10,
          [wizard2Id]: -15,
        },
        // No luckRolls field
      },
    });

    // Retrieve the updated round
    const updatedRounds = await t.query(api.duels.getDuelRounds, { duelId });
    const completedRound = updatedRounds.find((r) => r.roundNumber === 1);

    expect(completedRound).toBeDefined();
    expect(completedRound?.status).toBe("COMPLETED");
    expect(completedRound?.outcome?.luckRolls).toBeUndefined();
  });

  test("should validate luck roll values are within D20 range", async () => {
    // Create a round manually
    const roundId = await t.run(async (ctx) => {
      return await ctx.db.insert("duelRounds", {
        duelId,
        roundNumber: 1,
        type: "SPELL_CASTING",
        status: "WAITING_FOR_SPELLS",
      });
    });

    // Test with valid D20 values (1-20)
    await t.mutation(api.duels.completeRound, {
      roundId,
      outcome: {
        narrative: "The wizards clash with magical force!",
        result: "Epic magical battle!",
        pointsAwarded: {
          [wizard1Id]: 5,
          [wizard2Id]: 3,
        },
        healthChange: {
          [wizard1Id]: -10,
          [wizard2Id]: -15,
        },
        luckRolls: {
          [wizard1Id]: 1, // Minimum D20 value
          [wizard2Id]: 20, // Maximum D20 value
        },
      },
    });

    // Retrieve the updated round
    const updatedRounds = await t.query(api.duels.getDuelRounds, { duelId });
    const completedRound = updatedRounds.find((r) => r.roundNumber === 1);

    expect(completedRound?.outcome?.luckRolls?.[wizard1Id]).toBe(1);
    expect(completedRound?.outcome?.luckRolls?.[wizard2Id]).toBe(20);
  });
});
