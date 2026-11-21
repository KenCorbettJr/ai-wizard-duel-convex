/**
 * How often duels are watched, for understanding which duels are popular.
 * Not shown to players yet; admins can read it with getMostViewedDuels (or
 * browse the duelViewStats table in the Convex dashboard).
 *
 * A "visit" is an onlooker opening a duel page. Opening it again within
 * VISIT_GAP_MS (a refresh, a quick tab switch) is the same visit. Duelists
 * viewing their own duel aren't counted. Anonymous viewer IDs come from the
 * browser, so treat anonymous numbers as indicative, not audited.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { arenaCrowd, assertViewerId, userPresenceId } from "./presence";
import { verifySuperAdmin } from "./auth.utils";

export const VISIT_GAP_MS = 30 * 60 * 1000;

export const recordDuelView = mutation({
  args: { duelId: v.id("duels"), viewerId: v.string() },
  handler: async (ctx, { duelId, viewerId }) => {
    await assertViewerId(ctx, viewerId);
    const duel = await ctx.db.get(duelId);
    if (!duel || duel.isCampaignBattle || duel.status === "CANCELLED") return;
    if (duel.players.some((p) => userPresenceId(p) === viewerId)) return;

    const now = Date.now();
    const existing = await ctx.db
      .query("duelViews")
      .withIndex("by_duel_and_viewer", (q) =>
        q.eq("duelId", duelId).eq("viewerId", viewerId),
      )
      .unique();

    if (existing && now - existing.lastViewedAt < VISIT_GAP_MS) {
      // Same visit: just keep it alive.
      await ctx.db.patch(existing._id, { lastViewedAt: now });
      return;
    }
    const isNewViewer = !existing;
    if (existing) {
      await ctx.db.patch(existing._id, {
        visits: existing.visits + 1,
        lastViewedAt: now,
      });
    } else {
      await ctx.db.insert("duelViews", {
        duelId,
        viewerId,
        visits: 1,
        firstViewedAt: now,
        lastViewedAt: now,
      });
    }

    // This viewer may not have joined the arena yet, so count them in.
    const { onlookerIds } = await arenaCrowd(ctx, duel);
    const onlookersNow = new Set([...onlookerIds, viewerId]).size;

    const stats = await ctx.db
      .query("duelViewStats")
      .withIndex("by_duel", (q) => q.eq("duelId", duelId))
      .unique();
    const live = duel.status === "IN_PROGRESS" ? 1 : 0;
    const newViewer = isNewViewer ? 1 : 0;
    const newSignedIn = isNewViewer && viewerId.startsWith("user:") ? 1 : 0;

    if (stats) {
      await ctx.db.patch(stats._id, {
        views: stats.views + 1,
        uniqueViewers: stats.uniqueViewers + newViewer,
        signedInViewers: stats.signedInViewers + newSignedIn,
        liveViews: stats.liveViews + live,
        peakOnlookers: Math.max(stats.peakOnlookers, onlookersNow),
        lastViewedAt: now,
      });
    } else {
      await ctx.db.insert("duelViewStats", {
        duelId,
        views: 1,
        uniqueViewers: newViewer,
        signedInViewers: newSignedIn,
        liveViews: live,
        peakOnlookers: onlookersNow,
        lastViewedAt: now,
      });
    }
  },
});

const SORT_INDEXES = {
  views: "by_views",
  unique: "by_unique_viewers",
  live: "by_live_views",
  peak: "by_peak_onlookers",
  recent: "by_last_viewed_at",
} as const;

/** Most-watched duels, for the admin "Most Watched" page. */
export const getMostViewedDuels = query({
  args: {
    limit: v.optional(v.number()),
    sortBy: v.optional(
      v.union(
        v.literal("views"),
        v.literal("unique"),
        v.literal("live"),
        v.literal("peak"),
        v.literal("recent"),
      ),
    ),
  },
  handler: async (ctx, { limit = 50, sortBy = "views" }) => {
    await verifySuperAdmin(ctx);
    const top = await ctx.db
      .query("duelViewStats")
      .withIndex(SORT_INDEXES[sortBy])
      .order("desc")
      .take(Math.min(limit, 200));

    const rows = await Promise.all(
      top.map(async (stats) => {
        const duel = await ctx.db.get(stats.duelId);
        if (!duel) return null;
        const wizards = await Promise.all(
          duel.wizards.map((id) => ctx.db.get(id)),
        );
        const nameOf = (id: string) =>
          wizards.find((w) => w?._id === id)?.name ?? "Unknown wizard";
        const rating = await ctx.db
          .query("duelRatings")
          .withIndex("by_duel", (q) => q.eq("duelId", duel._id))
          .unique();
        return {
          ...stats,
          wizardNames: duel.wizards.map(nameOf),
          winnerNames: (duel.winners ?? []).map(nameOf),
          status: duel.status,
          numberOfRounds: duel.numberOfRounds,
          createdAt: duel.createdAt,
          featuredIllustration: duel.featuredIllustration,
          highlightedAt: duel.highlightedAt,
          aiRating: rating?.overall,
        };
      }),
    );
    return rows.filter((r) => r !== null);
  },
});
