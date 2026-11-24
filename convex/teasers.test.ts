import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { createTestUser, withAuth, withSuperAdminAuth } from "./test_utils";
import { parseYouTubeId } from "./teasers";
import type { Id } from "./_generated/dataModel";

function setup() {
  return convexTest(schema, import.meta.glob("./**/*.*s"));
}
type T = ReturnType<typeof setup>;

const HOUR = 60 * 60 * 1000;

async function makeDuel(
  t: T,
  opts: {
    rounds?: number; // Played rounds, all illustrated
    completedAgoMs?: number;
    isCampaignBattle?: boolean;
    textOnlyMode?: boolean;
  } = {},
) {
  const { rounds = 3, completedAgoMs = HOUR } = opts;
  return await t.run(async (ctx) => {
    const imageId = await ctx.storage.store(new Blob(["img"]));
    const wizards = await Promise.all(
      ["Zephyra", "Grimbold"].map((name) =>
        ctx.db.insert("wizards", {
          owner: "someone",
          name,
          description: `${name} the bold`,
        }),
      ),
    );
    const duelId = await ctx.db.insert("duels", {
      numberOfRounds: rounds,
      wizards,
      players: ["p1", "p2"],
      status: "COMPLETED",
      currentRound: rounds + 1,
      createdAt: Date.now() - completedAgoMs - HOUR,
      completedAt: Date.now() - completedAgoMs,
      points: {},
      hitPoints: {},
      needActionsFrom: [],
      winners: [wizards[0]],
      losers: [wizards[1]],
      isCampaignBattle: opts.isCampaignBattle,
      textOnlyMode: opts.textOnlyMode,
    });
    for (let n = 0; n <= rounds; n++) {
      await ctx.db.insert("duelRounds", {
        duelId,
        roundNumber: n,
        type: "SPELL_CASTING",
        status: "COMPLETED",
        outcome: { narrative: `Round ${n} story.`, illustration: imageId },
      });
    }
    await ctx.db.insert("duelRounds", {
      duelId,
      roundNumber: rounds + 1,
      type: "CONCLUSION",
      status: "COMPLETED",
      outcome: { narrative: "Zephyra wins!", illustration: imageId },
    });
    return duelId;
  });
}

async function addViews(t: T, duelId: Id<"duels">, uniqueViewers: number) {
  await t.run((ctx) =>
    ctx.db.insert("duelViewStats", {
      duelId,
      views: uniqueViewers,
      uniqueViewers,
      signedInViewers: 0,
      liveViews: 0,
      peakOnlookers: 1,
      lastViewedAt: Date.now(),
    }),
  );
}

describe("pickDailyDuel", () => {
  test("does nothing unless forced or enabled", async () => {
    const t = setup();
    await makeDuel(t);
    expect(await t.mutation(internal.teasers.pickDailyDuel, {})).toBeNull();
  });

  test("picks the most watched eligible duel, once a day", async () => {
    const t = setup();
    const quiet = await makeDuel(t);
    const popular = await makeDuel(t);
    await addViews(t, quiet, 2);
    await addViews(t, popular, 40);
    await makeDuel(t, { isCampaignBattle: true });
    await makeDuel(t, { textOnlyMode: true });
    await makeDuel(t, { completedAgoMs: 72 * HOUR });

    const teaserId = await t.mutation(internal.teasers.pickDailyDuel, {
      force: true,
    });
    const teaser = await t.run((ctx) => ctx.db.get(teaserId!));
    expect(teaser).toMatchObject({
      duelId: popular,
      status: "DRAFTING",
      source: "daily",
    });

    // A second forced run skips duels that already have a teaser.
    const next = await t.mutation(internal.teasers.pickDailyDuel, {
      force: true,
    });
    expect((await t.run((ctx) => ctx.db.get(next!)))?.duelId).toBe(quiet);
  });

  test("skips duels too short to tease without spoiling", async () => {
    const t = setup();
    await makeDuel(t, { rounds: 1 });
    expect(
      await t.mutation(internal.teasers.pickDailyDuel, { force: true }),
    ).toBeNull();
  });
});

describe("draft source", () => {
  test("never includes the deciding round, conclusion or winner", async () => {
    const t = setup();
    const duelId = await makeDuel(t, { rounds: 3 });
    const teaserId = await t.mutation(internal.teasers.pickDailyDuel, {
      force: true,
    });
    const source = await t.query(internal.teasers.getDraftSource, {
      teaserId: teaserId!,
    });
    expect(source && "rounds" in source).toBe(true);
    if (!source || !("rounds" in source)) return;
    expect(source.rounds.map((r) => r.roundNumber)).toEqual([0, 1, 2]);
    expect(JSON.stringify(source)).not.toContain("wins");
    expect(duelId).toBeDefined();
  });
});

describe("review flow", () => {
  async function renderedTeaser(t: T) {
    await createTestUser(t, "super-admin-user", "super_admin");
    const duelId = await makeDuel(t);
    const admin = withSuperAdminAuth(t);
    const teaserId = await admin.mutation(api.teasers.createTeaserForDuel, {
      duelId,
    });
    await t.mutation(internal.teasers.saveDraft, {
      teaserId,
      title: "Who survives?",
      description: "Two wizards collide.",
      segments: [
        { kind: "hook", line: "Zephyra versus Grimbold.", audioMs: 2000 },
      ],
    });
    const storageId = await t.run((ctx) =>
      ctx.storage.store(new Blob(["mp4"])),
    );
    expect(
      await t.mutation(internal.teasers.completeRender, {
        teaserId,
        storageId,
      }),
    ).toBe(true);
    return { duelId, teaserId, admin };
  }

  test("a rendered teaser notifies admins and waits for approval", async () => {
    const t = setup();
    const { duelId, teaserId, admin } = await renderedTeaser(t);
    const notes = await t.run((ctx) => ctx.db.query("notifications").collect());
    expect(notes.map((n) => n.type)).toEqual(["TEASER_READY"]);

    // Not on the duel page until approved.
    expect(await t.query(api.teasers.getDuelTeaser, { duelId })).toBeNull();
    await admin.mutation(api.teasers.approveTeaser, {
      teaserId,
      postToYouTube: false,
    });
    const live = await t.query(api.teasers.getDuelTeaser, { duelId });
    expect(live?.title).toBe("Who survives?");
    expect(live?.videoUrl).toBeTruthy();

    await admin.mutation(api.teasers.setTeaserYouTubeUrl, {
      teaserId,
      url: "https://youtube.com/shorts/abcdefghijk?feature=share",
    });
    expect(
      (await t.query(api.teasers.getDuelTeaser, { duelId }))?.youtubeUrl,
    ).toBe("https://www.youtube.com/shorts/abcdefghijk");
  });

  test("YouTube posting needs a connected channel", async () => {
    const t = setup();
    const { teaserId, admin } = await renderedTeaser(t);
    await expect(
      admin.mutation(api.teasers.approveTeaser, {
        teaserId,
        postToYouTube: true,
      }),
    ).rejects.toThrow(/YouTube isn't connected/);
  });

  test("players can't review teasers", async () => {
    const t = setup();
    const { teaserId } = await renderedTeaser(t);
    await createTestUser(t, "player", "user");
    await expect(
      withAuth(t, "player").mutation(api.teasers.approveTeaser, {
        teaserId,
        postToYouTube: false,
      }),
    ).rejects.toThrow();
  });

  test("a failed render can be marked and the duel gets a fresh teaser", async () => {
    const t = setup();
    await createTestUser(t, "super-admin-user", "super_admin");
    const duelId = await makeDuel(t);
    const admin = withSuperAdminAuth(t);
    const teaserId = await admin.mutation(api.teasers.createTeaserForDuel, {
      duelId,
    });
    await expect(
      admin.mutation(api.teasers.createTeaserForDuel, { duelId }),
    ).rejects.toThrow(/already has a teaser/);
    await t.mutation(internal.teasers.failTeaser, { teaserId, error: "boom" });
    await admin.mutation(api.teasers.createTeaserForDuel, { duelId });
  });
});

describe("parseYouTubeId", () => {
  test.each([
    ["https://www.youtube.com/watch?v=abcdefghijk", "abcdefghijk"],
    ["https://youtu.be/abcdefghijk", "abcdefghijk"],
    ["https://m.youtube.com/shorts/abcdefghijk", "abcdefghijk"],
    ["abcdefghijk", "abcdefghijk"],
    ["https://example.com/watch?v=abcdefghijk", null],
  ])("%s", (input, expected) => {
    expect(parseYouTubeId(input)).toBe(expected);
  });
});
