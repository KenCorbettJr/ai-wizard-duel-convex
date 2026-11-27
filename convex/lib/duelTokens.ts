import { ConvexError } from "convex/values";
import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

import { DUEL_TOKEN_COST } from "./pricing";
import { sponsoredSeatsFor, takeSponsoredEntry } from "./sponsorship";

export { DUEL_TOKEN_COST };

export const INSUFFICIENT_TOKENS_ERROR =
  "You need at least 1 token to start a duel.";

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
 * covers their opponent's entry. Seats a running sponsorship would cover
 * cost nothing.
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
  const sponsored = await sponsoredSeatsFor(ctx, userId, seats, Date.now());
  const needed = DUEL_TOKEN_COST * (seats - sponsored);
  if (user.imageCredits < needed) {
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
 * the calling mutation rolls back. A running sponsorship pays instead when it
 * covers the player; the entry is still written to the ledger either way.
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

  const now = Date.now();
  // A running sponsorship pays for the entry
  const sponsorship = await takeSponsoredEntry(ctx, userId, now);
  if (sponsorship) {
    await ctx.db.patch(duelId, { sponsorshipId: sponsorship._id });
    await ctx.db.insert("imageCreditTransactions", {
      userId,
      type: "CONSUMED",
      amount: 0,
      source: "DUEL_ENTRY",
      metadata: {
        duelId,
        purpose,
        sponsorshipId: sponsorship._id,
        sponsorName: sponsorship.sponsorName,
        ...(coveredFor ? { coveredFor } : {}),
      },
      createdAt: now,
    });
    return;
  }

  if (user.imageCredits < DUEL_TOKEN_COST) {
    // ConvexError so the message reaches the client in production
    throw new ConvexError(INSUFFICIENT_TOKENS_ERROR);
  }

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

  await ctx.db.insert("imageCreditTransactions", {
    userId,
    type: "CONSUMED",
    amount: DUEL_TOKEN_COST,
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
