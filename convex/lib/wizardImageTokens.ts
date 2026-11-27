import { ConvexError } from "convex/values";
import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

import { WIZARD_IMAGE_TOKEN_COST } from "./pricing";

export { WIZARD_IMAGE_TOKEN_COST };

export const INSUFFICIENT_WIZARD_TOKENS_ERROR =
  "You need at least 1 token to regenerate this wizard's illustration.";

/**
 * Charge one token for regenerating an existing wizard illustration. Throws
 * if the player has none, so the calling mutation rolls back.
 */
export async function chargeWizardImageToken(
  ctx: MutationCtx,
  userId: string,
  wizardId: Id<"wizards">,
): Promise<void> {
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", userId))
    .first();
  if (!user) {
    throw new Error("User not found");
  }

  if (user.imageCredits < WIZARD_IMAGE_TOKEN_COST) {
    throw new ConvexError(INSUFFICIENT_WIZARD_TOKENS_ERROR);
  }

  const now = Date.now();
  await ctx.db.patch(user._id, {
    imageCredits: user.imageCredits - WIZARD_IMAGE_TOKEN_COST,
    updatedAt: now,
  });
  await ctx.db.insert("imageCreditTransactions", {
    userId,
    type: "CONSUMED",
    amount: WIZARD_IMAGE_TOKEN_COST,
    source: "WIZARD_IMAGE",
    metadata: { wizardId, purpose: "wizard_illustration" },
    createdAt: now,
  });
}

/** Give back a wizard image token after the generation failed. */
export async function refundWizardImageToken(
  ctx: MutationCtx,
  userId: string,
  wizardId: Id<"wizards">,
): Promise<void> {
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", userId))
    .first();
  if (!user) return;

  const now = Date.now();
  await ctx.db.patch(user._id, {
    imageCredits: user.imageCredits + WIZARD_IMAGE_TOKEN_COST,
    updatedAt: now,
  });
  await ctx.db.insert("imageCreditTransactions", {
    userId,
    type: "EARNED",
    amount: WIZARD_IMAGE_TOKEN_COST,
    source: "WIZARD_IMAGE_REFUND",
    metadata: { wizardId, reason: "generation_failed" },
    createdAt: now,
  });
}
