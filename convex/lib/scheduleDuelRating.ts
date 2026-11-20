import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";

/**
 * Schedules an AI rating for a completed duel. No-op in tests, the emulator,
 * when DUEL_RATING_ENABLED is "false", or without a Google API key.
 */
export async function scheduleDuelRating(
  ctx: MutationCtx,
  duelId: Id<"duels">,
  delayMs = 0,
): Promise<void> {
  if (
    process.env.NODE_ENV === "test" ||
    process.env.ENV === "emulate" ||
    process.env.DUEL_RATING_ENABLED === "false" ||
    !process.env.GOOGLE_API_KEY
  ) {
    return;
  }
  await ctx.scheduler.runAfter(delayMs, internal.duelRatings.rateDuel, {
    duelId,
  });
}
