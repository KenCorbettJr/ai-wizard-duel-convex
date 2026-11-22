import { internalMutation, mutation, MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { scheduleRoundNarration } from "./lib/scheduleNarration";
import { shouldUseReferenceImageProvider as referenceImageProviderEnabled } from "./lib/imageProvider";

/**
 * Loads a round and its duel, and checks the caller is one of the duelists.
 * Only duelists can retry, so spectators can't run up generation costs.
 */
async function loadRoundForPlayer(
  ctx: MutationCtx,
  roundId: Id<"duelRounds">,
): Promise<{ round: Doc<"duelRounds">; duel: Doc<"duels"> }> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const round = await ctx.db.get(roundId);
  if (!round) throw new Error("Round not found");
  const duel = await ctx.db.get(round.duelId);
  if (!duel) throw new Error("Duel not found");
  if (!duel.players.includes(identity.subject)) {
    throw new Error("Only the duelists can retry this round");
  }
  return { round, duel };
}

/** Re-queues a round's announcer narration after it failed. */
export const retryRoundNarration = mutation({
  args: { roundId: v.id("duelRounds") },
  returns: v.null(),
  handler: async (ctx, { roundId }) => {
    const { round } = await loadRoundForPlayer(ctx, roundId);
    if (round.narration?.status !== "FAILED") {
      throw new Error("This narration hasn't failed");
    }
    if (!round.outcome?.narrative) throw new Error("Nothing to narrate");
    await scheduleRoundNarration(ctx, roundId);
    return null;
  },
});

/** Re-queues a round's illustration after it failed. */
export const retryRoundIllustration = mutation({
  args: { roundId: v.id("duelRounds") },
  returns: v.null(),
  handler: async (ctx, { roundId }) => {
    const { round, duel } = await loadRoundForPlayer(ctx, roundId);
    if (round.illustrationStatus !== "FAILED") {
      throw new Error("This illustration hasn't failed");
    }
    const illustrationPrompt = round.outcome?.illustrationPrompt;
    if (!illustrationPrompt || duel.textOnlyMode) {
      throw new Error("This round has no illustration to generate");
    }
    await ctx.db.patch(roundId, { illustrationStatus: "PENDING" });
    if (process.env.NODE_ENV !== "test") {
      await ctx.scheduler.runAfter(
        0,
        internal.generateRoundIllustration.generateRoundIllustration,
        {
          illustrationPrompt,
          duelId: duel._id,
          roundNumber: round.roundNumber.toString(),
          useGemini: referenceImageProviderEnabled(),
          userId: duel.players[0],
        },
      );
    }
    return null;
  },
});

/** Records illustration progress for a round. `null` clears it (image stored). */
export const setRoundIllustrationStatus = internalMutation({
  args: {
    duelId: v.id("duels"),
    roundNumber: v.number(),
    status: v.union(v.literal("PENDING"), v.literal("FAILED"), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, { duelId, roundNumber, status }) => {
    const rounds = await ctx.db
      .query("duelRounds")
      .withIndex("by_duel", (q) => q.eq("duelId", duelId))
      .collect();
    const round = rounds.find((r) => r.roundNumber === roundNumber);
    if (round) {
      await ctx.db.patch(round._id, {
        illustrationStatus: status ?? undefined,
      });
    }
    return null;
  },
});
