import { ConvexError } from "convex/values";
import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

/** Tokens a player pays to redo a wizard's illustration. */
export const WIZARD_IMAGE_TOKEN_COST = 1;

export const INSUFFICIENT_WIZARD_TOKENS_ERROR =
  "You need at least 1 token to regenerate this wizard's illustration.";

/**
 * Charge one token for regenerating an existing wizard illustration. Throws
 * if the player has none, so the calling mutation rolls back. Active Premium
 * subscribers are not charged, same as duels. Returns whether a token was
 * actually taken, so the caller knows whether a failure should refund it.
 */
export async function chargeWizardImageToken(
  ctx: MutationCtx,
  userId: string,
  wizardId: Id<"wizards">,
): Promise<boolean> {
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", userId))
    .first();
  if (!user) {
    throw new Error("User not found");
  }

  const premium =
    user.subscriptionTier === "PREMIUM" && user.subscriptionStatus === "ACTIVE";
  if (!premium && user.imageCredits < WIZARD_IMAGE_TOKEN_COST) {
    throw new ConvexError(INSUFFICIENT_WIZARD_TOKENS_ERROR);
  }

  const now = Date.now();
  if (!premium) {
    await ctx.db.patch(user._id, {
      imageCredits: user.imageCredits - WIZARD_IMAGE_TOKEN_COST,
      updatedAt: now,
    });
  }
  await ctx.db.insert("imageCreditTransactions", {
    userId,
    type: "CONSUMED",
    amount: premium ? 0 : WIZARD_IMAGE_TOKEN_COST,
    source: "WIZARD_IMAGE",
    metadata: { wizardId, purpose: "wizard_illustration" },
    createdAt: now,
  });
  return !premium;
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
