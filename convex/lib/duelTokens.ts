import { ConvexError } from "convex/values";
import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

import { DUEL_TOKEN_COST } from "./pricing";

export { DUEL_TOKEN_COST };

export const INSUFFICIENT_TOKENS_ERROR =
  "You need at least 1 token to start a duel.";

function isActivePremium(user: {
  subscriptionTier: string;
  subscriptionStatus: string;
}): boolean {
  return (
    user.subscriptionTier === "PREMIUM" && user.subscriptionStatus === "ACTIVE"
  );
}

async function getUserByClerkId(ctx: MutationCtx, userId: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", userId))
    .first();
}

/**
 * Throw unless the player could pay for a duel right now, without charging.
 * Used when a duel is created. The token is only taken when the duel starts,
 * so a waiting duel never holds one. `seats` is 2 when the creator also
 * covers their opponent's entry.
 */
export async function assertCanAffordDuelToken(
  ctx: MutationCtx,
  userId: string,
  who: "you" | "creator" = "you",
  seats = 1,
): Promise<void> {
  const user = await getUserByClerkId(ctx, userId);
  if (!user) {
    throw new Error("User not found");
  }
  const needed = DUEL_TOKEN_COST * seats;
  if (!isActivePremium(user) && user.imageCredits < needed) {
    if (who === "creator") {
      throw new ConvexError(
        seats > 1
          ? "The duel's creator no longer has enough tokens to cover your entry, so this duel can't start."
          : "The duel's creator no longer has a token, so this duel can't start.",
      );
    }
    throw new ConvexError(
      seats > 1
        ? `You need ${needed} tokens to cover your opponent's entry as well as your own.`
        : INSUFFICIENT_TOKENS_ERROR,
    );
  }
}

/**
 * Take one token from a player for a duel. Throws if the player has none, so
 * the calling mutation rolls back. Active Premium subscribers are not charged
 * (same as before tokens), but the entry is still written to the ledger.
 * The charge is recorded on the duel so it can be refunded exactly once.
 * `coveredFor` is set when this token pays for another player's entry.
 */
export async function chargeDuelToken(
  ctx: MutationCtx,
  userId: string,
  duelId: Id<"duels">,
  purpose: "pvp_duel" | "campaign_battle",
  coveredFor?: string,
): Promise<void> {
  const user = await getUserByClerkId(ctx, userId);
  if (!user) {
    throw new Error("User not found");
  }

  const premium = isActivePremium(user);
  if (!premium && user.imageCredits < DUEL_TOKEN_COST) {
    // ConvexError so the message reaches the client in production
    throw new ConvexError(INSUFFICIENT_TOKENS_ERROR);
  }

  const now = Date.now();
  if (!premium) {
    await ctx.db.patch(user._id, {
      imageCredits: user.imageCredits - DUEL_TOKEN_COST,
      updatedAt: now,
    });
    const duel = await ctx.db.get(duelId);
    if (!duel) {
      throw new Error("Duel not found");
    }
    await ctx.db.patch(duelId, {
      tokensCharged: [...(duel.tokensCharged ?? []), userId],
    });
  }

  await ctx.db.insert("imageCreditTransactions", {
    userId,
    type: "CONSUMED",
    amount: premium ? 0 : DUEL_TOKEN_COST,
    source: "DUEL_ENTRY",
    metadata: coveredFor
      ? { duelId, purpose, coveredFor }
      : { duelId, purpose },
    createdAt: now,
  });
}

/**
 * Give back every token charged for a duel (used when an admin cancels a
 * duel that already started). Safe to call more than once: a duel is only
 * refunded the first time.
 */
export async function refundDuelTokens(
  ctx: MutationCtx,
  duelId: Id<"duels">,
  reason: string,
): Promise<void> {
  const duel = await ctx.db.get(duelId);
  if (!duel || duel.tokensRefunded) return;

  const now = Date.now();
  for (const userId of duel.tokensCharged ?? []) {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", userId))
      .first();
    if (!user) continue;
    await ctx.db.patch(user._id, {
      imageCredits: user.imageCredits + DUEL_TOKEN_COST,
      updatedAt: now,
    });
    await ctx.db.insert("imageCreditTransactions", {
      userId,
      type: "EARNED",
      amount: DUEL_TOKEN_COST,
      source: "DUEL_REFUND",
      metadata: { duelId, reason },
      createdAt: now,
    });
  }
  await ctx.db.patch(duelId, { tokensRefunded: true });
}
