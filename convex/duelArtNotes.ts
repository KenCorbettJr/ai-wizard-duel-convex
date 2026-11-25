import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/** The duel's fixed height sentence, or null if it hasn't been worked out yet. */
export const getScale = internalQuery({
  args: { duelId: v.id("duels") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { duelId }) => {
    const note = await ctx.db
      .query("duelArtNotes")
      .withIndex("by_duel", (q) => q.eq("duelId", duelId))
      .unique();
    return note?.scale ?? null;
  },
});

/**
 * Stores the duel's height sentence. If one is already stored (two images
 * raced), the stored one wins and is returned, so every image uses the same.
 */
export const setScale = internalMutation({
  args: { duelId: v.id("duels"), scale: v.string() },
  returns: v.string(),
  handler: async (ctx, { duelId, scale }) => {
    const existing = await ctx.db
      .query("duelArtNotes")
      .withIndex("by_duel", (q) => q.eq("duelId", duelId))
      .unique();
    if (existing) return existing.scale;
    await ctx.db.insert("duelArtNotes", { duelId, scale });
    return scale;
  },
});

/** The battlefield after the latest battle round before `beforeRound`. */
export const getBattlefieldBefore = internalQuery({
  args: { duelId: v.id("duels"), beforeRound: v.number() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { duelId, beforeRound }) => {
    const row = await ctx.db
      .query("duelBattlefields")
      .withIndex("by_duel_and_round", (q) =>
        q.eq("duelId", duelId).lt("roundNumber", beforeRound),
      )
      .order("desc")
      .first();
    return row?.description ?? null;
  },
});

/** Stores (or, on a retry, replaces) the battlefield after a round. */
export const setBattlefield = internalMutation({
  args: {
    duelId: v.id("duels"),
    roundNumber: v.number(),
    description: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { duelId, roundNumber, description }) => {
    const existing = await ctx.db
      .query("duelBattlefields")
      .withIndex("by_duel_and_round", (q) =>
        q.eq("duelId", duelId).eq("roundNumber", roundNumber),
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { description });
    } else {
      await ctx.db.insert("duelBattlefields", {
        duelId,
        roundNumber,
        description,
      });
    }
    return null;
  },
});
