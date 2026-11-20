import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { verifySuperAdmin } from "./auth.utils";
import { scheduleDuelRating } from "./lib/scheduleDuelRating";
import type { DuelRatingContext } from "./lib/duelRating";

const ratingContextValidator = v.object({
  numberOfRounds: v.union(v.number(), v.literal("TO_THE_DEATH")),
  wizards: v.array(v.object({ name: v.string(), description: v.string() })),
  winners: v.array(v.string()),
  losers: v.array(v.string()),
  rounds: v.array(
    v.object({
      roundNumber: v.number(),
      spells: v.array(v.object({ wizard: v.string(), spell: v.string() })),
      narrative: v.string(),
      result: v.optional(v.string()),
    }),
  ),
});

/** Transcript for the rater. Null when the duel should not be rated. */
export const getRatingContext = internalQuery({
  args: { duelId: v.id("duels") },
  returns: v.union(v.null(), ratingContextValidator),
  handler: async (ctx, { duelId }): Promise<DuelRatingContext | null> => {
    const duel = await ctx.db.get(duelId);
    if (!duel || duel.status !== "COMPLETED" || duel.isCampaignBattle) {
      return null;
    }

    const wizardDocs = await Promise.all(
      duel.wizards.map((id) => ctx.db.get(id)),
    );
    const names = new Map<string, string>();
    for (const wizard of wizardDocs) {
      if (wizard) names.set(wizard._id, wizard.name);
    }
    const nameOf = (id: string) => names.get(id) ?? "Unknown wizard";

    const rounds = await ctx.db
      .query("duelRounds")
      .withIndex("by_duel", (q) => q.eq("duelId", duelId))
      .order("asc")
      .collect();

    const played = rounds
      .filter((r) => r.roundNumber > 0 && r.outcome?.narrative)
      .map((r) => ({
        roundNumber: r.roundNumber,
        spells: Object.entries(r.spells ?? {}).map(([wizardId, spell]) => ({
          wizard: nameOf(wizardId),
          spell: spell.description,
        })),
        narrative: r.outcome?.narrative ?? "",
        result: r.outcome?.result,
      }));
    if (played.length === 0) return null;

    return {
      numberOfRounds: duel.numberOfRounds,
      wizards: wizardDocs
        .filter((w): w is Doc<"wizards"> => w !== null)
        .map((w) => ({ name: w.name, description: w.description })),
      winners: (duel.winners ?? []).map(nameOf),
      losers: (duel.losers ?? []).map(nameOf),
      rounds: played,
    };
  },
});

export const saveRating = internalMutation({
  args: {
    duelId: v.id("duels"),
    cool: v.number(),
    funny: v.number(),
    engaging: v.number(),
    unpredictable: v.number(),
    overall: v.number(),
    summary: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { duelId, ...scores }) => {
    const existing = await ctx.db
      .query("duelRatings")
      .withIndex("by_duel", (q) => q.eq("duelId", duelId))
      .unique();
    const fields = { ...scores, ratedAt: Date.now() };
    if (existing) {
      await ctx.db.patch(existing._id, fields);
    } else {
      await ctx.db.insert("duelRatings", { duelId, ...fields });
    }
    return null;
  },
});

/**
 * Rate completed, unrated, non-campaign duels, newest first. Calls are
 * staggered to stay inside AI rate limits. Run from the CLI:
 *   npx convex run duelRatingsData:scheduleUnratedDuels '{"limit": 25}'
 */
export const scheduleUnratedDuels = internalMutation({
  args: { limit: v.optional(v.number()) },
  returns: v.number(),
  handler: async (ctx, { limit = 25 }) => {
    let scheduled = 0;
    for await (const duel of ctx.db
      .query("duels")
      .withIndex("by_status", (q) => q.eq("status", "COMPLETED"))
      .order("desc")) {
      if (scheduled >= limit) break;
      if (duel.isCampaignBattle) continue;
      const rated = await ctx.db
        .query("duelRatings")
        .withIndex("by_duel", (q) => q.eq("duelId", duel._id))
        .unique();
      if (rated) continue;
      await scheduleDuelRating(ctx, duel._id, scheduled * 2000);
      scheduled++;
    }
    return scheduled;
  },
});

const adminRatingValidator = v.object({
  duelId: v.id("duels"),
  cool: v.number(),
  funny: v.number(),
  engaging: v.number(),
  unpredictable: v.number(),
  overall: v.number(),
  summary: v.string(),
  ratedAt: v.number(),
  wizardNames: v.array(v.string()),
  winnerNames: v.array(v.string()),
  numberOfRounds: v.union(v.number(), v.literal("TO_THE_DEATH")),
  completedAt: v.optional(v.number()),
  featuredIllustration: v.optional(v.string()),
  highlightedAt: v.optional(v.number()),
});

/** Admin: the most recently rated duels with scores. The UI sorts and filters. */
export const listDuelRatings = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(adminRatingValidator),
  handler: async (ctx, { limit = 100 }) => {
    await verifySuperAdmin(ctx);
    const ratings = await ctx.db
      .query("duelRatings")
      .order("desc")
      .take(Math.min(limit, 300));

    const rows = [];
    for (const rating of ratings) {
      const duel = await ctx.db.get(rating.duelId);
      if (!duel) continue;
      const wizards = await Promise.all(
        duel.wizards.map((id) => ctx.db.get(id)),
      );
      const nameOf = (id: string) =>
        wizards.find((w) => w?._id === id)?.name ?? "Unknown wizard";
      rows.push({
        duelId: duel._id,
        cool: rating.cool,
        funny: rating.funny,
        engaging: rating.engaging,
        unpredictable: rating.unpredictable,
        overall: rating.overall,
        summary: rating.summary,
        ratedAt: rating.ratedAt,
        wizardNames: wizards.map((w) => w?.name ?? "Unknown wizard"),
        winnerNames: (duel.winners ?? []).map(nameOf),
        numberOfRounds: duel.numberOfRounds,
        completedAt: duel.completedAt,
        featuredIllustration: duel.featuredIllustration,
        highlightedAt: duel.highlightedAt,
      });
    }
    return rows;
  },
});

/** Admin: feature or un-feature a duel on the homepage. */
export const setDuelHighlighted = mutation({
  args: { duelId: v.id("duels"), highlighted: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { duelId, highlighted }) => {
    await verifySuperAdmin(ctx);
    const duel = await ctx.db.get(duelId);
    if (!duel) throw new Error("Duel not found");
    if (highlighted && (duel.status !== "COMPLETED" || duel.isCampaignBattle)) {
      throw new Error("Only completed player duels can be highlighted");
    }
    await ctx.db.patch(duelId, {
      highlightedAt: highlighted ? Date.now() : undefined,
    });
    return null;
  },
});

/** Public: admin-curated duels for the homepage. Never exposes ratings. */
export const getHighlightedDuels = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      duelId: v.id("duels"),
      wizardNames: v.array(v.string()),
      winnerNames: v.array(v.string()),
      numberOfRounds: v.union(v.number(), v.literal("TO_THE_DEATH")),
      featuredIllustration: v.optional(v.string()),
      teaser: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, { limit = 3 }) => {
    const duels = await ctx.db
      .query("duels")
      .withIndex("by_highlighted_at", (q) => q.gt("highlightedAt", 0))
      .order("desc")
      .take(Math.min(limit, 6));

    const rows = [];
    for (const duel of duels) {
      if (duel.isCampaignBattle) continue;
      const wizards = await Promise.all(
        duel.wizards.map((id) => ctx.db.get(id)),
      );
      const nameOf = (id: string) =>
        wizards.find((w) => w?._id === id)?.name ?? "Unknown wizard";
      const rounds = await ctx.db
        .query("duelRounds")
        .withIndex("by_duel", (q) => q.eq("duelId", duel._id))
        .order("desc")
        .take(3);
      const teaser = rounds.find((r) => r.outcome?.result)?.outcome?.result;
      rows.push({
        duelId: duel._id,
        wizardNames: wizards.map((w) => w?.name ?? "Unknown wizard"),
        winnerNames: (duel.winners ?? []).map(nameOf),
        numberOfRounds: duel.numberOfRounds,
        featuredIllustration: duel.featuredIllustration,
        teaser,
      });
    }
    return rows;
  },
});
