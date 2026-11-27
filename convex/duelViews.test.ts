import { convexTest } from "convex-test";
import presenceTest from "@convex-dev/presence/test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { withAuth } from "./test_utils";
import { VISIT_GAP_MS } from "./duelViews";
import type { Id } from "./_generated/dataModel";

function setup() {
  const t = convexTest(schema, import.meta.glob("./**/*.*s"));
  presenceTest.register(t);
  return t;
}
type T = ReturnType<typeof setup>;

const ANON = "anon:3f2b9c1e-guest-viewer";

async function makeDuel(
  t: T,
  extra: {
    status?: "IN_PROGRESS" | "COMPLETED";
    isCampaignBattle?: boolean;
  } = {},
) {
  return await t.run((ctx) =>
    ctx.db.insert("duels", {
      numberOfRounds: 3,
      wizards: [],
      players: ["duelist-1", "duelist-2"],
      status: extra.status ?? "IN_PROGRESS",
      currentRound: 1,
      createdAt: Date.now(),
      points: {},
      hitPoints: {},
      needActionsFrom: [],
      isCampaignBattle: extra.isCampaignBattle,
    }),
  );
}

async function stats(t: T, duelId: Id<"duels">) {
  return await t.run((ctx) =>
    ctx.db
      .query("duelViewStats")
      .withIndex("by_duel", (q) => q.eq("duelId", duelId))
      .unique(),
  );
}

describe("recordDuelView", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  test("counts visits and unique viewers, folding quick repeats", async () => {
    const t = setup();
    const duelId = await makeDuel(t);
    const fan = withAuth(t, "fan");

    await fan.mutation(api.duelViews.recordDuelView, {
      duelId,
      viewerId: "user:fan",
    });
    // A refresh a minute later is the same visit
    vi.advanceTimersByTime(60_000);
    await fan.mutation(api.duelViews.recordDuelView, {
      duelId,
      viewerId: "user:fan",
    });
    await t.mutation(api.duelViews.recordDuelView, { duelId, viewerId: ANON });

    expect(await stats(t, duelId)).toMatchObject({
      views: 2,
      uniqueViewers: 2,
      signedInViewers: 1,
      liveViews: 2,
    });

    // Coming back later is a new visit, but not a new viewer
    vi.advanceTimersByTime(VISIT_GAP_MS + 1);
    await fan.mutation(api.duelViews.recordDuelView, {
      duelId,
      viewerId: "user:fan",
    });
    expect(await stats(t, duelId)).toMatchObject({
      views: 3,
      uniqueViewers: 2,
    });
  });

  test("replay views aren't live views", async () => {
    const t = setup();
    const duelId = await makeDuel(t, { status: "COMPLETED" });

    await t.mutation(api.duelViews.recordDuelView, { duelId, viewerId: ANON });

    expect(await stats(t, duelId)).toMatchObject({ views: 1, liveViews: 0 });
  });

  test("duelists aren't counted", async () => {
    const t = setup();
    const duelId = await makeDuel(t);

    await withAuth(t, "duelist-1").mutation(api.duelViews.recordDuelView, {
      duelId,
      viewerId: "user:duelist-1",
    });

    expect(await stats(t, duelId)).toBeNull();
  });

  test("onlookers of campaign battles are counted", async () => {
    const t = setup();
    const campaignId = await makeDuel(t, { isCampaignBattle: true });

    await t.mutation(api.duelViews.recordDuelView, {
      duelId: campaignId,
      viewerId: ANON,
    });

    expect(await stats(t, campaignId)).toMatchObject({ views: 1 });
  });

  test("nobody can record views as another account", async () => {
    const t = setup();
    const duelId = await makeDuel(t);

    await expect(
      t.mutation(api.duelViews.recordDuelView, {
        duelId,
        viewerId: "user:fan",
      }),
    ).rejects.toThrow("Not authorized");
  });

  test("tracks the biggest crowd in the arena at once", async () => {
    const t = setup();
    const duelId = await makeDuel(t);
    for (const id of ["anon:viewer-aaaa", "anon:viewer-bbbb"]) {
      await t.mutation(api.presence.heartbeat, {
        roomId: duelId,
        userId: id,
        sessionId: id,
        interval: 10_000,
      });
    }

    // A third viewer arrives before their first heartbeat lands
    await t.mutation(api.duelViews.recordDuelView, { duelId, viewerId: ANON });

    expect((await stats(t, duelId))?.peakOnlookers).toBe(3);
  });
});

describe("getMostViewedDuels", () => {
  async function makeAdmin(t: T) {
    await t.run((ctx) =>
      ctx.db.insert("users", {
        clerkId: "admin",
        role: "super_admin",
        imageCredits: 0,
        createdAt: 0,
        updatedAt: 0,
      }),
    );
  }

  async function view(t: T, duelId: Id<"duels">, viewers: string[]) {
    for (const viewerId of viewers) {
      await t.mutation(api.duelViews.recordDuelView, { duelId, viewerId });
    }
  }

  test("ranks duels by the chosen measure, with their AI rating", async () => {
    const t = setup();
    await makeAdmin(t);
    const quiet = await makeDuel(t, { status: "COMPLETED" });
    const popular = await makeDuel(t, { status: "COMPLETED" });
    await view(t, quiet, ["anon:viewer-aaaa"]);
    await view(t, popular, ["anon:viewer-aaaa", "anon:viewer-bbbb"]);
    await t.run((ctx) =>
      ctx.db.insert("duelRatings", {
        duelId: popular,
        cool: 8,
        funny: 7,
        engaging: 9,
        unpredictable: 6,
        overall: 7.5,
        summary: "A crowd-pleaser",
        ratedAt: 0,
      }),
    );

    const rows = await withAuth(t, "admin").query(
      api.duelViews.getMostViewedDuels,
      { sortBy: "views" },
    );

    expect(rows.map((r) => r.duelId)).toEqual([popular, quiet]);
    expect(rows[0]).toMatchObject({ views: 2, aiRating: 7.5 });
    expect(rows[1].aiRating).toBeUndefined();
  });

  test("is for super admins only", async () => {
    const t = setup();
    await expect(
      withAuth(t, "fan").query(api.duelViews.getMostViewedDuels, {}),
    ).rejects.toThrow();
  });
});
