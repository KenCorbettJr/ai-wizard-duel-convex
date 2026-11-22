import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

async function seed(status: "IN_PROGRESS" | "COMPLETED" = "IN_PROGRESS") {
  const t = convexTest(schema, import.meta.glob("./**/*.*s"));
  const mine = await t.run((ctx) =>
    ctx.db.insert("wizards", { owner: "p1", name: "Mine", description: "" }),
  );
  const theirs = await t.run((ctx) =>
    ctx.db.insert("wizards", { owner: "p2", name: "Theirs", description: "" }),
  );
  const duelId = await t.run((ctx) =>
    ctx.db.insert("duels", {
      numberOfRounds: 3,
      wizards: [mine, theirs],
      players: ["p1", "p2"],
      status,
      currentRound: 2,
      createdAt: 0,
      points: {},
      hitPoints: { [mine]: 80, [theirs]: 60 },
      needActionsFrom: [mine, theirs],
    }),
  );
  const fought = await t.run((ctx) =>
    ctx.db.insert("duelRounds", {
      duelId,
      roundNumber: 1,
      type: "SPELL_CASTING",
      status: "COMPLETED",
    }),
  );
  const pending = await t.run((ctx) =>
    ctx.db.insert("duelRounds", {
      duelId,
      roundNumber: 2,
      type: "SPELL_CASTING",
      status: "WAITING_FOR_SPELLS",
    }),
  );
  return { t, mine, theirs, duelId, fought, pending };
}

describe("forfeitDuel", () => {
  test("ends the duel with the other player as the winner", async () => {
    const { t, mine, theirs, duelId, fought, pending } = await seed();
    await t.withIdentity({ subject: "p1" }).mutation(api.duels.forfeitDuel, {
      duelId,
    });

    await t.run(async (ctx) => {
      const duel = (await ctx.db.get(duelId))!;
      expect(duel.status).toBe("COMPLETED");
      expect(duel.winners).toEqual([theirs]);
      expect(duel.losers).toEqual([mine]);
      expect(duel.forfeitedBy).toBe(mine);
      expect(duel.needActionsFrom).toEqual([]);
      expect(duel.completedAt).toBeTypeOf("number");
      // The unfought round is dropped; fought rounds stay for the replay.
      expect(await ctx.db.get(pending)).toBeNull();
      expect(await ctx.db.get(fought)).not.toBeNull();
      // It counts on both records.
      expect((await ctx.db.get(theirs))!.wins).toBe(1);
      expect((await ctx.db.get(mine))!.losses).toBe(1);
    });
  });

  test("only the duelists can forfeit", async () => {
    const { t, duelId } = await seed();
    await expect(
      t
        .withIdentity({ subject: "someone" })
        .mutation(api.duels.forfeitDuel, { duelId }),
    ).rejects.toThrow(/Only the duelists/);
    await expect(t.mutation(api.duels.forfeitDuel, { duelId })).rejects.toThrow(
      /Not authenticated/,
    );
  });

  test("a finished duel can't be forfeited", async () => {
    const { t, duelId } = await seed("COMPLETED");
    await expect(
      t.withIdentity({ subject: "p1" }).mutation(api.duels.forfeitDuel, {
        duelId,
      }),
    ).rejects.toThrow(/in progress/);
  });

  test("a round finishing after the forfeit doesn't change the result", async () => {
    const { t, theirs, duelId, fought } = await seed();
    await t.withIdentity({ subject: "p1" }).mutation(api.duels.forfeitDuel, {
      duelId,
    });
    await t.mutation(internal.duels.completeRound, {
      roundId: fought,
      outcome: { narrative: "Late", healthChange: { [theirs]: -100 } },
    });

    await t.run(async (ctx) => {
      const duel = (await ctx.db.get(duelId))!;
      expect(duel.status).toBe("COMPLETED");
      expect(duel.winners).toEqual([theirs]);
      expect(duel.hitPoints[theirs]).toBe(60);
    });
  });
});

describe("cancelDuel", () => {
  test("strangers and signed-out callers can't cancel someone's duel", async () => {
    const { t, duelId } = await seed();
    await t.run((ctx) =>
      ctx.db.patch(duelId, { status: "WAITING_FOR_PLAYERS" }),
    );
    await expect(t.mutation(api.duels.cancelDuel, { duelId })).rejects.toThrow(
      /Not authenticated/,
    );
    await expect(
      t
        .withIdentity({ subject: "someone" })
        .mutation(api.duels.cancelDuel, { duelId }),
    ).rejects.toThrow(/Only a player/);
    const duel = await t.run((ctx) => ctx.db.get(duelId));
    expect(duel?.status).toBe("WAITING_FOR_PLAYERS");
  });

  test("a player can cancel a duel that hasn't started", async () => {
    const { t, duelId } = await seed();
    await t.run((ctx) =>
      ctx.db.patch(duelId, { status: "WAITING_FOR_PLAYERS" }),
    );
    await t.withIdentity({ subject: "p1" }).mutation(api.duels.cancelDuel, {
      duelId,
    });
    const duel = await t.run((ctx) => ctx.db.get(duelId));
    expect(duel?.status).toBe("CANCELLED");
  });

  test("a duel in progress can't be cancelled", async () => {
    const { t, duelId } = await seed();
    await expect(
      t.withIdentity({ subject: "p1" }).mutation(api.duels.cancelDuel, {
        duelId,
      }),
    ).rejects.toThrow(/Forfeit it instead/);
  });
});
