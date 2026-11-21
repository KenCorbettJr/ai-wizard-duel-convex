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
  test("lists player duels and campaign battles together by default, newest first", async () => {
    const { t, ids } = await seed();
    const result = await t.query(api.duels.getWatchableDuels, page);
    expect(result.duels.map((d) => d._id)).toEqual([
      ids.frost,
      ids.ember,
      ids.pvpCancelled,
      ids.pvp,
    ]);
    expect(result.total).toBe(4);
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
    expect(result.duels.map((d) => d._id)).toEqual([ids.frost, ids.ember]);
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
