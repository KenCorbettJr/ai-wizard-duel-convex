import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Context for spell ideas: the caller's wizard, their opponent, and how the
 * duel has gone so far. Null unless the caller is a duelist in a live duel.
 */
export const getSpellIdeaContext = internalQuery({
  args: { duelId: v.id("duels"), userId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      roundNumber: v.number(),
      wizard: v.object({ name: v.string(), description: v.string() }),
      opponent: v.object({ name: v.string(), description: v.string() }),
      health: v.number(),
      opponentHealth: v.number(),
      lastNarrative: v.optional(v.string()),
      pastSpells: v.array(v.string()),
    }),
  ),
  handler: async (ctx, { duelId, userId }) => {
    const duel = await ctx.db.get(duelId);
    if (!duel || duel.status !== "IN_PROGRESS") return null;
    if (!duel.players.includes(userId)) return null;

    const wizards = await Promise.all(duel.wizards.map((id) => ctx.db.get(id)));
    const mine = wizards.find((w) => w?.owner === userId);
    const theirs = wizards.find((w) => w && w._id !== mine?._id);
    if (!mine || !theirs) return null;

    const rounds = await ctx.db
      .query("duelRounds")
      .withIndex("by_duel", (q) => q.eq("duelId", duelId))
      .collect();
    const completed = rounds
      .filter((r) => r.roundNumber > 0 && r.status === "COMPLETED")
      .sort((a, b) => a.roundNumber - b.roundNumber);

    return {
      roundNumber: duel.currentRound,
      wizard: { name: mine.name, description: mine.description },
      opponent: { name: theirs.name, description: theirs.description },
      health: duel.hitPoints[mine._id] ?? 100,
      opponentHealth: duel.hitPoints[theirs._id] ?? 100,
      lastNarrative: completed.at(-1)?.outcome?.narrative,
      // So the ideas don't repeat what this wizard already did.
      pastSpells: completed
        .map((r) => r.spells?.[mine._id]?.description)
        .filter((s): s is string => !!s),
    };
  },
});
