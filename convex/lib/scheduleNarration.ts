import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";

/**
 * Marks a round's narration as pending and schedules audio generation.
 * No-op in tests, the emulator, when disabled, or without a Google API key.
 */
export async function scheduleRoundNarration(
  ctx: MutationCtx,
  roundId: Id<"duelRounds">,
): Promise<void> {
  if (
    process.env.NODE_ENV === "test" ||
    process.env.ENV === "emulate" ||
    process.env.NARRATION_ENABLED === "false" ||
    !process.env.GOOGLE_API_KEY
  ) {
    return;
  }
  await ctx.db.patch(roundId, { narration: { status: "PENDING" as const } });
  await ctx.scheduler.runAfter(0, internal.narration.generateRoundNarration, {
    roundId,
  });
}
