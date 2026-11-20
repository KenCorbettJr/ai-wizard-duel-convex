import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

/**
 * Token pack purchases. Stripe calls live in stripe.ts (Node runtime); this
 * file holds the database side so it can run in the default runtime.
 *
 * Flow: createTokenCheckout (action) records a PENDING purchase and returns
 * the Stripe Checkout URL. When the payment succeeds, Stripe calls our
 * webhook, which runs completePurchase. Tokens are granted exactly once per
 * Checkout session, using the token count stored here, never one sent by
 * the client.
 */

export const recordPendingPurchase = internalMutation({
  args: {
    userId: v.string(),
    packId: v.string(),
    tokens: v.number(),
    amountCents: v.number(),
    currency: v.string(),
    stripeSessionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("tokenPurchases", {
      ...args,
      status: "PENDING",
      createdAt: Date.now(),
    });
    return null;
  },
});

export const completePurchase = internalMutation({
  args: {
    stripeSessionId: v.string(),
    stripePaymentIntentId: v.optional(v.string()),
    amountPaidCents: v.number(),
    currency: v.string(),
  },
  returns: v.union(
    v.literal("granted"),
    v.literal("already_completed"),
    v.literal("unknown_session"),
    v.literal("amount_mismatch"),
  ),
  handler: async (ctx, args) => {
    const purchase = await ctx.db
      .query("tokenPurchases")
      .withIndex("by_session", (q) =>
        q.eq("stripeSessionId", args.stripeSessionId),
      )
      .first();

    if (!purchase) {
      console.error(
        `Stripe session ${args.stripeSessionId} has no matching purchase`,
      );
      return "unknown_session";
    }

    // Stripe retries webhooks, so this must be safe to run more than once
    if (purchase.status === "COMPLETED") {
      return "already_completed";
    }

    if (
      args.amountPaidCents !== purchase.amountCents ||
      args.currency.toLowerCase() !== purchase.currency.toLowerCase()
    ) {
      console.error(
        `Stripe session ${args.stripeSessionId} paid ${args.amountPaidCents} ${args.currency}, expected ${purchase.amountCents} ${purchase.currency}`,
      );
      return "amount_mismatch";
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", purchase.userId))
      .first();
    if (!user) {
      // Throw so Stripe retries; the user record should exist by now
      throw new Error(`User ${purchase.userId} not found for purchase`);
    }

    const now = Date.now();
    await ctx.db.patch(user._id, {
      imageCredits: user.imageCredits + purchase.tokens,
      updatedAt: now,
    });
    await ctx.db.patch(purchase._id, {
      status: "COMPLETED",
      completedAt: now,
      stripePaymentIntentId: args.stripePaymentIntentId,
    });
    await ctx.db.insert("imageCreditTransactions", {
      userId: purchase.userId,
      type: "EARNED",
      amount: purchase.tokens,
      source: "PURCHASE",
      metadata: {
        packId: purchase.packId,
        amountCents: String(purchase.amountCents),
        stripeSessionId: purchase.stripeSessionId,
      },
      createdAt: now,
    });

    return "granted";
  },
});

/**
 * Status of one of the signed-in player's purchases, used by the tokens page
 * to confirm a purchase after returning from Stripe (the webhook can arrive a
 * moment after the redirect).
 */
export const getMyPurchaseStatus = query({
  args: { stripeSessionId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      status: v.union(v.literal("PENDING"), v.literal("COMPLETED")),
      tokens: v.number(),
      packId: v.string(),
    }),
  ),
  handler: async (ctx, { stripeSessionId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const purchase = await ctx.db
      .query("tokenPurchases")
      .withIndex("by_session", (q) => q.eq("stripeSessionId", stripeSessionId))
      .first();
    if (!purchase || purchase.userId !== identity.subject) return null;

    return {
      status: purchase.status,
      tokens: purchase.tokens,
      packId: purchase.packId,
    };
  },
});
