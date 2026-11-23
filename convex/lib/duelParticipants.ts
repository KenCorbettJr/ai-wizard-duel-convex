import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

/**
 * Keep `duelParticipants` in step with one duel: one row per player while
 * the duel is live (waiting or in progress), none once it has ended or been
 * deleted. Call after any write that creates a duel, changes its players, or
 * changes its status. Lets per-player "my live duels" reads use an index
 * instead of scanning every live duel in the game.
 */
export async function syncDuelParticipants(
  ctx: MutationCtx,
  duelId: Id<"duels">,
): Promise<void> {
  const duel = await ctx.db.get(duelId);
  const live =
    !!duel &&
    (duel.status === "WAITING_FOR_PLAYERS" || duel.status === "IN_PROGRESS");
  const wanted = new Set(live ? duel.players : []);

  const rows = await ctx.db
    .query("duelParticipants")
    .withIndex("by_duel", (q) => q.eq("duelId", duelId))
    .collect();
  const have = new Set<string>();
  for (const row of rows) {
    if (wanted.has(row.userId) && !have.has(row.userId)) {
      have.add(row.userId);
    } else {
      await ctx.db.delete(row._id);
    }
  }
  for (const userId of wanted) {
    if (!have.has(userId)) {
      await ctx.db.insert("duelParticipants", { duelId, userId });
    }
  }
}
