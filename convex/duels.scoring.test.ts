import { convexTest } from "convex-test";
import { beforeEach, describe, expect, test } from "vitest";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import schema from "./schema";
import { createTestDuel, withAuth } from "./test_utils";

// How a duel that reaches its last round is decided: health first, with
// rounds won as the tiebreak. Duels from before health scoring keep their
// old rule (points first, health as the tiebreak).
describe("Deciding a duel after the last round", () => {
  let t: ReturnType<typeof convexTest>;
  let aria: Id<"wizards">;
  let bram: Id<"wizards">;

  beforeEach(async () => {
    t = convexTest(schema, import.meta.glob("./**/*.*s"));
    aria = await withAuth(t, "test-user-1").mutation(
      internal.wizards.createWizard,
      { name: "Aria", description: "A storm caller" },
    );
    bram = await withAuth(t, "test-user-1").mutation(
      internal.wizards.createWizard,
      { name: "Bram", description: "A stone warden" },
    );
  });

  // Puts a 3-round duel on its last round with the given standing, then
  // resolves that round with the given outcome.
  async function finishDuel(opts: {
    legacy?: boolean;
    hitPoints: [number, number];
    points: [number, number];
    lastRound: { points: [number, number]; health: [number, number] };
  }) {
    const duelId = await createTestDuel(t, "test-user-1", {
      numberOfRounds: 3,
      wizards: [aria, bram],
    });
    const roundId = await t.run(async (ctx) => {
      await ctx.db.patch(duelId, {
        status: "IN_PROGRESS",
        currentRound: 3,
        hitPoints: { [aria]: opts.hitPoints[0], [bram]: opts.hitPoints[1] },
        points: { [aria]: opts.points[0], [bram]: opts.points[1] },
        scoring: opts.legacy ? undefined : "health",
      });
      return ctx.db.insert("duelRounds", {
        duelId,
        roundNumber: 3,
        type: "SPELL_CASTING",
        status: "PROCESSING",
      });
    });
    await t.mutation(internal.duels.completeRound, {
      roundId,
      outcome: {
        narrative: "The final clash.",
        pointsAwarded: {
          [aria]: opts.lastRound.points[0],
          [bram]: opts.lastRound.points[1],
        },
        healthChange: {
          [aria]: opts.lastRound.health[0],
          [bram]: opts.lastRound.health[1],
        },
      },
    });
    return t.run((ctx) => ctx.db.get(duelId));
  }

  test("new duels are created with health scoring", async () => {
    const duelId = await createTestDuel(t, "test-user-1", {
      numberOfRounds: 3,
      wizards: [aria, bram],
    });
    const duel = await t.run((ctx) => ctx.db.get(duelId));
    expect(duel?.scoring).toBe("health");
  });

  test("more health wins, even with fewer rounds won", async () => {
    const duel = await finishDuel({
      hitPoints: [80, 60],
      points: [0, 2],
      lastRound: { points: [0, 1], health: [-10, 0] },
    });
    expect(duel?.status).toBe("COMPLETED");
    expect(duel?.winners).toEqual([aria]);
    expect(duel?.losers).toEqual([bram]);
  });

  test("rounds won break a health tie", async () => {
    const duel = await finishDuel({
      hitPoints: [50, 50],
      points: [1, 1],
      lastRound: { points: [0, 1], health: [-10, -10] },
    });
    expect(duel?.winners).toEqual([bram]);
  });

  test("a tie on health and rounds won is a draw", async () => {
    const duel = await finishDuel({
      hitPoints: [50, 50],
      points: [1, 1],
      lastRound: { points: [0, 0], health: [0, 0] },
    });
    expect(duel?.winners).toEqual([aria, bram]);
    expect(duel?.losers).toEqual([]);
  });

  test("older duels still finish on points first", async () => {
    const duel = await finishDuel({
      legacy: true,
      hitPoints: [80, 40],
      points: [10, 14],
      lastRound: { points: [5, 6], health: [0, 0] },
    });
    expect(duel?.winners).toEqual([bram]);
  });
});
