import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import { withAuth, withSuperAdminAuth } from "./test_utils";
import { buildRatingPrompt, normalizeRating } from "./lib/duelRating";

function setup() {
  return convexTest(schema, import.meta.glob("./**/*.*s"));
}
type T = ReturnType<typeof setup>;

async function makeSuperAdmin(t: T) {
  await t.run(async (ctx) => {
    await ctx.db.insert("users", {
      clerkId: "super-admin-user",
      role: "super_admin",
      imageCredits: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
}

async function makeDuel(
  t: T,
  opts: { status?: "COMPLETED" | "IN_PROGRESS"; campaign?: boolean } = {},
) {
  return await t.run(async (ctx) => {
    const a = await ctx.db.insert("wizards", {
      owner: "o1",
      name: "Aldric",
      description: "A stern ice mage",
    });
    const b = await ctx.db.insert("wizards", {
      owner: "o2",
      name: "Bramble",
      description: "A chaotic hedge wizard",
    });
    const duelId = await ctx.db.insert("duels", {
      numberOfRounds: 3,
      wizards: [a, b],
      players: ["o1", "o2"],
      status: opts.status ?? "COMPLETED",
      currentRound: 1,
      createdAt: Date.now(),
      completedAt: Date.now(),
      points: {},
      hitPoints: {},
      needActionsFrom: [],
      winners: [a],
      losers: [b],
      isCampaignBattle: opts.campaign ?? false,
    });
    await ctx.db.insert("duelRounds", {
      duelId,
      roundNumber: 1,
      type: "SPELL_CASTING",
      status: "COMPLETED",
      spells: {
        [a]: { description: "An ice phoenix", castBy: a, timestamp: 1 },
        [b]: { description: "A flaming umbrella", castBy: b, timestamp: 1 },
      },
      outcome: { narrative: "Steam everywhere.", result: "Ice meets fire" },
    });
    return duelId as Id<"duels">;
  });
}

const rating = {
  cool: 8,
  funny: 9,
  engaging: 7,
  unpredictable: 8,
  overall: 8,
  summary: "The umbrella moment.",
};

describe("rating helpers", () => {
  test("normalizeRating clamps, rounds and averages", () => {
    const { scores, overall } = normalizeRating({
      cool: 15,
      funny: -3,
      engaging: 6.6,
      unpredictable: "bad",
    });
    expect(scores).toEqual({
      cool: 10,
      funny: 1,
      engaging: 7,
      unpredictable: 1,
    });
    expect(overall).toBe(4.8);
  });

  test("buildRatingPrompt includes spells, narration and outcome", () => {
    const prompt = buildRatingPrompt({
      numberOfRounds: 3,
      wizards: [{ name: "Aldric", description: "Ice mage" }],
      winners: ["Aldric"],
      losers: ["Bramble"],
      rounds: [
        {
          roundNumber: 1,
          spells: [{ wizard: "Aldric", spell: "An ice phoenix" }],
          narrative: "Steam everywhere.",
          result: "Ice meets fire",
        },
      ],
    });
    expect(prompt).toContain("Aldric cast: An ice phoenix");
    expect(prompt).toContain("Steam everywhere.");
    expect(prompt).toContain("winner(s) Aldric");
  });
});

describe("rating context", () => {
  test("returns a transcript for a completed player duel", async () => {
    const t = setup();
    const duelId = await makeDuel(t);
    const ctx = await t.query(internal.duelRatingsData.getRatingContext, {
      duelId,
    });
    expect(ctx?.winners).toEqual(["Aldric"]);
    expect(ctx?.rounds[0].spells.map((s) => s.spell).sort()).toEqual([
      "A flaming umbrella",
      "An ice phoenix",
    ]);
  });

  test("skips campaign battles and unfinished duels", async () => {
    const t = setup();
    const campaign = await makeDuel(t, { campaign: true });
    const live = await makeDuel(t, { status: "IN_PROGRESS" });
    for (const duelId of [campaign, live]) {
      expect(
        await t.query(internal.duelRatingsData.getRatingContext, { duelId }),
      ).toBeNull();
    }
  });

  test("saving twice replaces the rating", async () => {
    const t = setup();
    await makeSuperAdmin(t);
    const duelId = await makeDuel(t);
    await t.mutation(internal.duelRatingsData.saveRating, {
      duelId,
      ...rating,
    });
    await t.mutation(internal.duelRatingsData.saveRating, {
      duelId,
      ...rating,
      overall: 5,
    });
    const rows = await withSuperAdminAuth(t).query(
      api.duelRatingsData.listDuelRatings,
      {},
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      overall: 5,
      wizardNames: ["Aldric", "Bramble"],
      winnerNames: ["Aldric"],
    });
  });
});

describe("admin access and highlights", () => {
  test("non-admins cannot list ratings or highlight duels", async () => {
    const t = setup();
    const duelId = await makeDuel(t);
    await expect(
      withAuth(t, "regular").query(api.duelRatingsData.listDuelRatings, {}),
    ).rejects.toThrow();
    await expect(
      withAuth(t, "regular").mutation(api.duelRatingsData.setDuelHighlighted, {
        duelId,
        highlighted: true,
      }),
    ).rejects.toThrow();
  });

  test("highlighted duels are public, without ratings, and can be removed", async () => {
    const t = setup();
    await makeSuperAdmin(t);
    const duelId = await makeDuel(t);
    const other = await makeDuel(t);
    await t.mutation(internal.duelRatingsData.saveRating, {
      duelId,
      ...rating,
    });

    expect(await t.query(api.duelRatingsData.getHighlightedDuels, {})).toEqual(
      [],
    );

    const admin = withSuperAdminAuth(t);
    await admin.mutation(api.duelRatingsData.setDuelHighlighted, {
      duelId,
      highlighted: true,
    });

    const shown = await t.query(api.duelRatingsData.getHighlightedDuels, {});
    expect(shown.map((d) => d.duelId)).toEqual([duelId]);
    expect(shown[0]).toMatchObject({
      winnerNames: ["Aldric"],
      teaser: "Ice meets fire",
    });
    expect(JSON.stringify(shown)).not.toContain("umbrella moment");
    expect(shown.map((d) => d.duelId)).not.toContain(other);

    await admin.mutation(api.duelRatingsData.setDuelHighlighted, {
      duelId,
      highlighted: false,
    });
    expect(await t.query(api.duelRatingsData.getHighlightedDuels, {})).toEqual(
      [],
    );
  });

  test("only completed player duels can be highlighted", async () => {
    const t = setup();
    await makeSuperAdmin(t);
    const campaign = await makeDuel(t, { campaign: true });
    await expect(
      withSuperAdminAuth(t).mutation(api.duelRatingsData.setDuelHighlighted, {
        duelId: campaign,
        highlighted: true,
      }),
    ).rejects.toThrow(/completed player duels/);
  });
});
