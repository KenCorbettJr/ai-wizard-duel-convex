import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { withAuth } from "./test_utils";

function setup() {
  return convexTest(schema, import.meta.glob("./**/*.*s"));
}
type T = ReturnType<typeof setup>;

/** A duel with a resolved round 1 and a round 2 still waiting for spells. */
async function seed(t: T) {
  return await t.run(async (ctx) => {
    const wizard1Id = await ctx.db.insert("wizards", {
      owner: "player-1",
      name: "Gandalf",
      description: "A wise wizard",
      wins: 0,
      losses: 0,
      isAIPowered: false,
    });
    const wizard2Id = await ctx.db.insert("wizards", {
      owner: "player-2",
      name: "Saruman",
      description: "A powerful wizard",
      wins: 0,
      losses: 0,
      isAIPowered: false,
    });
    const duelId = await ctx.db.insert("duels", {
      numberOfRounds: 3,
      wizards: [wizard1Id, wizard2Id],
      players: ["player-1", "player-2"],
      status: "IN_PROGRESS",
      currentRound: 2,
      createdAt: Date.now(),
      points: {},
      hitPoints: {},
      needActionsFrom: [wizard1Id, wizard2Id],
    });
    const spells = {
      [wizard1Id]: { description: "Fireball", castBy: wizard1Id, timestamp: 1 },
      [wizard2Id]: { description: "Ice wall", castBy: wizard2Id, timestamp: 2 },
    };
    const resolvedId = await ctx.db.insert("duelRounds", {
      duelId,
      roundNumber: 1,
      type: "SPELL_CASTING",
      status: "COMPLETED",
      spells,
    });
    const pendingId = await ctx.db.insert("duelRounds", {
      duelId,
      roundNumber: 2,
      type: "SPELL_CASTING",
      status: "WAITING_FOR_SPELLS",
      spells: { [wizard1Id]: spells[wizard1Id] },
    });
    return { duelId, wizard1Id, wizard2Id, resolvedId, pendingId };
  });
}

describe("spellReactions.toggle", () => {
  test("a spectator's reaction is counted, and a second tap removes it", async () => {
    const t = setup();
    const { duelId, wizard1Id, resolvedId } = await seed(t);
    const fan = withAuth(t, "fan");

    expect(
      await fan.mutation(api.spellReactions.toggle, {
        roundId: resolvedId,
        wizardId: wizard1Id,
        emoji: "🔥",
      }),
    ).toEqual({ reacted: true });
    await withAuth(t, "other-fan").mutation(api.spellReactions.toggle, {
      roundId: resolvedId,
      wizardId: wizard1Id,
      emoji: "🔥",
    });

    expect(await fan.query(api.spellReactions.forDuel, { duelId })).toEqual([
      {
        roundId: resolvedId,
        wizardId: wizard1Id,
        emoji: "🔥",
        count: 2,
        mine: true,
      },
    ]);

    expect(
      await fan.mutation(api.spellReactions.toggle, {
        roundId: resolvedId,
        wizardId: wizard1Id,
        emoji: "🔥",
      }),
    ).toEqual({ reacted: false });
    const after = await fan.query(api.spellReactions.forDuel, { duelId });
    expect(after?.[0]).toMatchObject({ count: 1, mine: false });
  });

  test("the opponent can react, but not to their own spell", async () => {
    const t = setup();
    const { wizard1Id, wizard2Id, resolvedId } = await seed(t);
    const player2 = withAuth(t, "player-2");

    await player2.mutation(api.spellReactions.toggle, {
      roundId: resolvedId,
      wizardId: wizard1Id,
      emoji: "👏",
    });
    await expect(
      player2.mutation(api.spellReactions.toggle, {
        roundId: resolvedId,
        wizardId: wizard2Id,
        emoji: "👏",
      }),
    ).rejects.toThrow(/own spell/);
  });

  test("not before the round resolves", async () => {
    const t = setup();
    const { wizard1Id, pendingId } = await seed(t);
    await expect(
      withAuth(t, "fan").mutation(api.spellReactions.toggle, {
        roundId: pendingId,
        wizardId: wizard1Id,
        emoji: "🔥",
      }),
    ).rejects.toThrow(/once the round resolves/);
  });

  test("only allowed emoji, on a spell that exists", async () => {
    const t = setup();
    const { wizard1Id, resolvedId } = await seed(t);
    const { wizard2Id: strangerId } = await seed(t);
    const fan = withAuth(t, "fan");
    await expect(
      fan.mutation(api.spellReactions.toggle, {
        roundId: resolvedId,
        wizardId: wizard1Id,
        emoji: "🍆",
      }),
    ).rejects.toThrow(/Unknown reaction/);
    await expect(
      fan.mutation(api.spellReactions.toggle, {
        roundId: resolvedId,
        wizardId: strangerId, // A wizard from another duel
        emoji: "🔥",
      }),
    ).rejects.toThrow(/Spell not found/);
  });

  test("signed-out viewers can't react or see reactions", async () => {
    const t = setup();
    const { duelId, wizard1Id, resolvedId } = await seed(t);
    await expect(
      t.mutation(api.spellReactions.toggle, {
        roundId: resolvedId,
        wizardId: wizard1Id,
        emoji: "🔥",
      }),
    ).rejects.toThrow(/Sign in/);
    expect(await t.query(api.spellReactions.forDuel, { duelId })).toBeNull();
  });
});
