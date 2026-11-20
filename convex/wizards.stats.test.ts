import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

function setup() {
  return convexTest(schema, import.meta.glob("./**/*.*s"));
}
type T = ReturnType<typeof setup>;

async function makeWizard(t: T, name: string, owner = "owner-1") {
  return await t.run(
    async (ctx) =>
      await ctx.db.insert("wizards", { owner, name, description: `${name}!` }),
  );
}

async function record(t: T, wizardId: Id<"wizards">, won: boolean) {
  await t.mutation(internal.wizards.updateWizardStatsInternal, {
    wizardId,
    won,
  });
}

async function completedDuel(
  t: T,
  winner: Id<"wizards">,
  loser: Id<"wizards">,
  isCampaignBattle = false,
) {
  await t.run(async (ctx) => {
    await ctx.db.insert("duels", {
      numberOfRounds: 3,
      wizards: [winner, loser],
      players: [],
      status: "COMPLETED",
      currentRound: 3,
      createdAt: Date.now(),
      completedAt: Date.now(),
      points: {},
      hitPoints: {},
      needActionsFrom: [],
      winners: [winner],
      losers: [loser],
      isCampaignBattle,
    });
  });
}

describe("wizardStats and the leaderboard", () => {
  test("ranks by win rate, then wins, then total duels", async () => {
    const t = setup();
    const a = await makeWizard(t, "A"); // 3-0
    const b = await makeWizard(t, "B"); // 2-0
    const c = await makeWizard(t, "C"); // 2-1
    for (let i = 0; i < 3; i++) await record(t, a, true);
    for (let i = 0; i < 2; i++) await record(t, b, true);
    await record(t, c, true);
    await record(t, c, true);
    await record(t, c, false);

    const board = await t.query(api.wizards.getWizardLeaderboard, {
      minDuels: 1,
    });
    expect(board.map((w) => w.name)).toEqual(["A", "B", "C"]);
    expect(board.map((w) => w.rank)).toEqual([1, 2, 3]);
    expect(board[2]).toMatchObject({ wins: 2, losses: 1, totalDuels: 3 });
  });

  test("applies limit and minDuels", async () => {
    const t = setup();
    const lucky = await makeWizard(t, "Lucky"); // 1-0
    const steady = await makeWizard(t, "Steady"); // 3-1
    await record(t, lucky, true);
    for (let i = 0; i < 3; i++) await record(t, steady, true);
    await record(t, steady, false);

    const filtered = await t.query(api.wizards.getWizardLeaderboard, {
      minDuels: 3,
    });
    expect(filtered.map((w) => w.name)).toEqual(["Steady"]);

    const limited = await t.query(api.wizards.getWizardLeaderboard, {
      limit: 1,
      minDuels: 1,
    });
    expect(limited.map((w) => w.name)).toEqual(["Lucky"]);
  });

  test("campaign battles do not change stats", async () => {
    const t = setup();
    const a = await makeWizard(t, "A");
    await t.mutation(internal.wizards.updateWizardStatsInternal, {
      wizardId: a,
      won: true,
      isCampaignBattle: true,
    });
    const board = await t.query(api.wizards.getWizardLeaderboard, {});
    expect(board).toEqual([]);
  });

  test("deleted wizards drop off the board", async () => {
    const t = setup();
    const a = await makeWizard(t, "A");
    await record(t, a, true);
    await t.run(async (ctx) => {
      await ctx.db.delete(a);
    });
    expect(await t.query(api.wizards.getWizardLeaderboard, {})).toEqual([]);
  });

  test("backfill rebuilds stats from duel history and fixes drift", async () => {
    const t = setup();
    const a = await makeWizard(t, "A");
    const b = await makeWizard(t, "B");
    const ghost = await makeWizard(t, "Ghost");
    await completedDuel(t, a, b);
    await completedDuel(t, a, b);
    await completedDuel(t, b, a);
    await completedDuel(t, a, b, true); // campaign: ignored

    // Drifted data: a wrong row for A and a stale row for a wizard with no duels
    await t.run(async (ctx) => {
      await ctx.db.insert("wizardStats", {
        wizardId: a,
        wins: 99,
        losses: 0,
        totalDuels: 99,
        winRate: 1,
      });
      await ctx.db.insert("wizardStats", {
        wizardId: ghost,
        wins: 5,
        losses: 0,
        totalDuels: 5,
        winRate: 1,
      });
    });

    const result = await t.mutation(internal.wizards.backfillWizardStats, {});
    expect(result).toEqual({ wizardsWithStats: 2, rowsRemoved: 1 });

    const board = await t.query(api.wizards.getWizardLeaderboard, {});
    expect(board.map((w) => [w.name, w.wins, w.losses])).toEqual([
      ["A", 2, 1],
      ["B", 1, 2],
    ]);
  });

  test("stats written live match a backfill of the same history", async () => {
    const t = setup();
    const a = await makeWizard(t, "A");
    const b = await makeWizard(t, "B");
    for (const [w, l] of [
      [a, b],
      [a, b],
      [b, a],
    ] as const) {
      await completedDuel(t, w, l);
      await record(t, w, true);
      await record(t, l, false);
    }
    const live = await t.query(api.wizards.getWizardLeaderboard, {});
    await t.mutation(internal.wizards.backfillWizardStats, {});
    const rebuilt = await t.query(api.wizards.getWizardLeaderboard, {});
    expect(rebuilt).toEqual(live);
  });
});
