import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

/** Win rate as stored in `wizardStats`. Shared so every writer rounds identically. */
export function computeWinRate(wins: number, totalDuels: number): number {
  return totalDuels > 0 ? wins / totalDuels : 0;
}

/**
 * Record one completed multiplayer duel result for a wizard. Call exactly once
 * per wizard per completed non-campaign duel.
 */
export async function recordWizardResult(
  ctx: MutationCtx,
  wizardId: Id<"wizards">,
  won: boolean,
): Promise<void> {
  const existing = await ctx.db
    .query("wizardStats")
    .withIndex("by_wizard", (q) => q.eq("wizardId", wizardId))
    .unique();

  const wins = (existing?.wins ?? 0) + (won ? 1 : 0);
  const losses = (existing?.losses ?? 0) + (won ? 0 : 1);
  const totalDuels = wins + losses;
  const fields = {
    wins,
    losses,
    totalDuels,
    winRate: computeWinRate(wins, totalDuels),
  };

  if (existing) {
    await ctx.db.patch(existing._id, fields);
  } else {
    await ctx.db.insert("wizardStats", { wizardId, ...fields });
  }
}
