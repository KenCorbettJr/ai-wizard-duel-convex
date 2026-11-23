import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { withAuth } from "./test_utils";

function setup() {
  return convexTest(schema, import.meta.glob("./**/*.*s"));
}
type T = ReturnType<typeof setup>;

/** An active season with one wizard and some progress for each of two players. */
async function seed(t: T) {
  return await t.run(async (ctx) => {
    const seasonId = await ctx.db.insert("campaignSeasons", {
      name: "Season of Fire",
      description: "Test season",
      status: "ACTIVE",
      completionRelic: { name: "Ember", description: "Warm", luckBonus: 1 },
      opponents: [],
      createdAt: Date.now(),
      createdBy: "admin",
    });
    for (const [owner, defeated] of [
      ["alice", [1, 2, 3]],
      ["bob", [1]],
    ] as const) {
      const wizardId = await ctx.db.insert("wizards", {
        owner,
        name: `${owner}'s wizard`,
        description: "",
      });
      await ctx.db.insert("wizardCampaignProgress", {
        wizardId,
        userId: owner,
        seasonId,
        currentOpponent: defeated.length + 1,
        defeatedOpponents: [...defeated],
        hasCompletionRelic: false,
        createdAt: Date.now(),
      });
    }
  });
}

describe("campaign progress privacy", () => {
  test("each player sees only their own progress", async () => {
    const t = setup();
    await seed(t);

    const alice = await withAuth(t, "alice").query(
      api.campaigns.getUserCampaignProgress,
      {},
    );
    expect(alice.map((p) => p.userId)).toEqual(["alice"]);
    expect(alice[0].defeatedOpponents).toEqual([1, 2, 3]);

    const bobSeason = await withAuth(t, "bob").query(
      api.campaignSeasons.getUserCurrentSeasonProgress,
      {},
    );
    expect(bobSeason?.progress.map((p) => p.userId)).toEqual(["bob"]);
  });

  test("signed-out callers get nothing", async () => {
    const t = setup();
    await seed(t);

    expect(await t.query(api.campaigns.getUserCampaignProgress, {})).toEqual(
      [],
    );
    expect(
      await t.query(api.campaignSeasons.getUserCurrentSeasonProgress, {}),
    ).toBeNull();
    expect(await t.query(api.campaignSeasons.getUserSeasonHistory, {})).toEqual(
      [],
    );
    await expect(
      t.query(api.campaigns.getCampaignStatistics, {}),
    ).rejects.toThrow("Not authenticated");
  });
});
