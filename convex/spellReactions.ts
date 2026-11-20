/**
 * Emoji reactions to a wizard's spell in a round. Any signed-in viewer can
 * react to a resolved round, live or in a replay, except to their own spell.
 * Each viewer gets one of each emoji per spell; reacting again removes it.
 */

import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { chatViewer } from "./duelChat";
import { isSpellReaction } from "./lib/spellReactions";

/** Reactions counted per duel. Far beyond what any duel should collect. */
const COUNT_LIMIT = 5000;

/** Add this emoji to the spell, or remove it if the viewer already had. */
export const toggle = mutation({
  args: {
    roundId: v.id("duelRounds"),
    wizardId: v.id("wizards"),
    emoji: v.string(),
  },
  returns: v.object({ reacted: v.boolean() }),
  handler: async (ctx, { roundId, wizardId, emoji }) => {
    const userId = await chatViewer(ctx);
    if (!userId) throw new ConvexError("Sign in to react.");
    if (!isSpellReaction(emoji)) throw new ConvexError("Unknown reaction.");

    const round = await ctx.db.get(roundId);
    if (!round?.spells?.[wizardId]) throw new ConvexError("Spell not found.");
    // Only once the round has played out, so a reaction can't hint at a
    // spell before both are revealed.
    if (round.status !== "COMPLETED") {
      throw new ConvexError("You can react once the round resolves.");
    }
    const wizard = await ctx.db.get(wizardId);
    if (wizard?.owner === userId) {
      throw new ConvexError("You can't react to your own spell.");
    }

    const mine = await ctx.db
      .query("spellReactions")
      .withIndex("by_round_and_user", (q) =>
        q.eq("roundId", roundId).eq("userId", userId),
      )
      .take(50);
    const existing = mine.find(
      (r) => r.wizardId === wizardId && r.emoji === emoji,
    );
    if (existing) {
      await ctx.db.delete(existing._id);
      return { reacted: false };
    }

    await ctx.db.insert("spellReactions", {
      duelId: round.duelId,
      roundId,
      wizardId,
      userId,
      emoji,
      createdAt: Date.now(),
    });
    return { reacted: true };
  },
});

/**
 * Reaction counts for every spell in the duel, and which ones the viewer
 * added. Null for signed-out viewers.
 */
export const forDuel = query({
  args: { duelId: v.id("duels") },
  returns: v.union(
    v.null(),
    v.array(
      v.object({
        roundId: v.id("duelRounds"),
        wizardId: v.id("wizards"),
        emoji: v.string(),
        count: v.number(),
        mine: v.boolean(),
      }),
    ),
  ),
  handler: async (ctx, { duelId }) => {
    const userId = await chatViewer(ctx);
    if (!userId) return null;

    const rows = await ctx.db
      .query("spellReactions")
      .withIndex("by_duel", (q) => q.eq("duelId", duelId))
      .take(COUNT_LIMIT);

    const tally = new Map<
      string,
      {
        roundId: (typeof rows)[number]["roundId"];
        wizardId: (typeof rows)[number]["wizardId"];
        emoji: string;
        count: number;
        mine: boolean;
      }
    >();
    for (const r of rows) {
      const key = `${r.roundId}|${r.wizardId}|${r.emoji}`;
      const entry = tally.get(key) ?? {
        roundId: r.roundId,
        wizardId: r.wizardId,
        emoji: r.emoji,
        count: 0,
        mine: false,
      };
      entry.count++;
      entry.mine ||= r.userId === userId;
      tally.set(key, entry);
    }
    return [...tally.values()];
  },
});
