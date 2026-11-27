import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
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
 * Entries this player has already promised: their duels still waiting for an
 * opponent, which charge them (1 seat, or 2 when they cover their opponent)
 * the moment someone joins. A new duel is only affordable on top of these,
 * so every open duel can actually start, and "Free" is only shown while the
 * sponsor's entries aren't already spoken for.
 */
export async function seatsPromised(
  ctx: QueryCtx,
  userId: string,
): Promise<number> {
  const rows = await ctx.db
    .query("duelParticipants")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  let seats = 0;
  for (const { duelId } of rows) {
    const d = await ctx.db.get(duelId);
    if (
      d?.status === "WAITING_FOR_PLAYERS" &&
      d.players.length === 1 &&
      d.players[0] === userId
    ) {
      seats += d.creatorCoversEntry ? 2 : 1;
    }
  }
  return seats;
}

/**
 * Whether the player could open one more duel needing `seats` entries,
 * counting what their waiting duels have already promised. Sponsored entries
 * are used first, as they are when duels start.
 */
export async function canAffordNewDuel(
  ctx: QueryCtx,
  userId: string,
  credits: number,
  seats = 1,
  now = Date.now(),
): Promise<{ ok: boolean; needed: number }> {
  const total = (await seatsPromised(ctx, userId)) + seats;
  const sponsored = await sponsoredSeatsFor(ctx, userId, total, now);
  const needed = DUEL_TOKEN_COST * (total - sponsored);
  return { ok: credits >= needed, needed };
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
  if (who === "you") {
    // Creating a duel: it must be affordable on top of the duels this
    // player already has waiting.
    const promised = await seatsPromised(ctx, userId);
    const { ok, needed } = await canAffordNewDuel(
      ctx,
      userId,
      user.imageCredits,
      seats,
    );
    if (!ok) {
      throw new ConvexError(
        promised > 0
          ? "Your open duels already use your tokens and free entries. Get more tokens, or wait for one to start."
          : seats > 1
            ? `You need ${needed} tokens to cover your opponent's entry as well as your own.`
            : INSUFFICIENT_TOKENS_ERROR,
      );
    }
    return;
  }
  const sponsored = await sponsoredSeatsFor(ctx, userId, seats, Date.now());
  const needed = DUEL_TOKEN_COST * (seats - sponsored);
  // The creator again, as their duel starts
  if (user.imageCredits < needed) {
    throw new ConvexError(
      seats > 1
        ? "The duel's creator no longer has enough tokens to cover your entry, so this duel can't start."
        : "The duel's creator no longer has a token, so this duel can't start.",
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
