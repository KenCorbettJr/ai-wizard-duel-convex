import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import type { Id } from "./_generated/dataModel";

type Status = "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

async function seed() {
  const t = convexTest(schema, import.meta.glob("./**/*.*s"));
  const wizard = (name: string, opponentNumber?: number) =>
    t.run((ctx) =>
      ctx.db.insert("wizards", {
        owner: opponentNumber ? "campaign" : "p1",
        name,
        description: name,
        isCampaignOpponent: opponentNumber ? true : undefined,
        opponentNumber,
      }),
    );
  const player = await wizard("Player");
  const ember = await wizard("Ember", 1);
  const frost = await wizard("Frost", 2);

  const make = (createdAt: number, status: Status, opponent?: Id<"wizards">) =>
    t.run((ctx) =>
      ctx.db.insert("duels", {
        numberOfRounds: 3,
        wizards: [player, opponent ?? player],
        players: opponent ? ["p1", "campaign"] : ["p1", "p2"],
        status,
        currentRound: 1,
        createdAt,
        points: {},
        hitPoints: {},
        needActionsFrom: [],
        isCampaignBattle: opponent ? true : undefined,
      }),
    );
  const ids = {
    pvp: await make(1, "COMPLETED"),
    pvpCancelled: await make(2, "CANCELLED"),
    ember: await make(3, "IN_PROGRESS", ember),
    emberCancelled: await make(4, "CANCELLED", ember),
    frost: await make(5, "COMPLETED", frost),
  };
  return { t, ids, opponents: { ember, frost } };
}

const page = { limit: 10, offset: 0 };

describe("getWatchableDuels", () => {
  test("lists player duels and campaign battles together, live first, then newest", async () => {
    const { t, ids } = await seed();
    const result = await t.query(api.duels.getWatchableDuels, page);
    expect(result.duels.map((d) => d._id)).toEqual([
      ids.ember,
      ids.frost,
      ids.pvpCancelled,
      ids.pvp,
    ]);
    expect(result.total).toBe(4);
    expect(result.liveCount).toBe(1);
  });

  test("filters to live duels", async () => {
    const { t, ids } = await seed();
    const result = await t.query(api.duels.getWatchableDuels, {
      ...page,
      kind: "live",
    });
    expect(result.duels.map((d) => d._id)).toEqual([ids.ember]);
  });

  test("filters to player duels", async () => {
    const { t, ids } = await seed();
    const result = await t.query(api.duels.getWatchableDuels, {
      ...page,
      kind: "players",
    });
    expect(result.duels.map((d) => d._id)).toEqual([ids.pvpCancelled, ids.pvp]);
  });

  test("filters to campaign battles, skipping cancelled ones", async () => {
    const { t, ids } = await seed();
    const result = await t.query(api.duels.getWatchableDuels, {
      ...page,
      kind: "campaign",
    });
    expect(result.duels.map((d) => d._id)).toEqual([ids.ember, ids.frost]);
  });

  test("teases a spell from the first round only once it has resolved", async () => {
    const { t, ids } = await seed();
    const round = (
      duelId: Id<"duels">,
      status: "WAITING_FOR_SPELLS" | "COMPLETED",
    ) =>
      t.run(async (ctx) => {
        const duel = (await ctx.db.get(duelId))!;
        await ctx.db.insert("duelRounds", {
          duelId,
          roundNumber: 1,
          type: "SPELL_CASTING",
          status,
          spells: {
            [duel.wizards[0]]: {
              description: "A storm of chain lightning",
              castBy: duel.wizards[0],
              timestamp: 1,
            },
          },
        });
      });
    await round(ids.ember, "WAITING_FOR_SPELLS");
    await round(ids.frost, "COMPLETED");
    const result = await t.query(api.duels.getWatchableDuels, page);
    const byId = new Map(result.duels.map((d) => [d._id, d]));
    expect(byId.get(ids.ember)?.openings).toEqual([]);
    expect(byId.get(ids.frost)?.openings.map((o) => o.spell)).toEqual([
      "A storm of chain lightning",
    ]);
  });

  test("keeps results from spectators but not from the duelists", async () => {
    const { t, ids } = await seed();
    await t.run(async (ctx) => {
      const duel = (await ctx.db.get(ids.pvp))!;
      await ctx.db.patch(ids.pvp, {
        winners: [duel.wizards[0]],
        points: { [duel.wizards[0]]: 3 },
      });
    });
    const find = (r: { duels: Array<{ _id: Id<"duels"> }> }) =>
      r.duels.find((d) => d._id === ids.pvp) as {
        winners?: Id<"wizards">[];
        points: Record<string, number>;
        currentRound: number;
      };

    const spectator = find(await t.query(api.duels.getWatchableDuels, page));
    expect(spectator.winners).toBeUndefined();
    expect(spectator.points).toEqual({});
    expect(spectator.currentRound).toBe(0);

    const duelist = find(
      await t
        .withIdentity({ subject: "p1" })
        .query(api.duels.getWatchableDuels, page),
    );
    expect(duelist.winners).toHaveLength(1);
  });

  test("shows a duel still waiting to start only to its players", async () => {
    const { t, ids } = await seed();
    await t.run((ctx) =>
      ctx.db.patch(ids.pvp, {
        status: "WAITING_FOR_PLAYERS",
        shortcode: "ABC123",
      }),
    );
    const stranger = await t.query(api.duels.getWatchableDuels, page);
    expect(stranger.duels.map((d) => d._id)).not.toContain(ids.pvp);
    const player = await t
      .withIdentity({ subject: "p1" })
      .query(api.duels.getWatchableDuels, page);
    expect(player.duels.map((d) => d._id)).toContain(ids.pvp);
  });

  test("filters to battles against one campaign wizard", async () => {
    const { t, ids, opponents } = await seed();
    const result = await t.query(api.duels.getWatchableDuels, {
      ...page,
      opponentId: opponents.ember,
    });
    expect(result.duels.map((d) => d._id)).toEqual([ids.ember]);
    expect(result.total).toBe(1);
  });
});
