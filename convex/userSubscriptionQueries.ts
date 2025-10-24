import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get user subscription and usage information
 * This is in a separate file to avoid circular dependencies with usageLimiterService
 */
export const getUserSubscription = internalQuery({
  args: { clerkId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("users"),
      subscriptionTier: v.union(v.literal("FREE"), v.literal("PREMIUM")),
      subscriptionStatus: v.union(
        v.literal("ACTIVE"),
        v.literal("CANCELED"),
        v.literal("PAST_DUE"),
        v.literal("TRIALING")
      ),
      stripeCustomerId: v.optional(v.string()),
      stripeSubscriptionId: v.optional(v.string()),
      subscriptionEndsAt: v.optional(v.number()),
      imageCredits: v.number(),
      monthlyUsage: v.object({
        duelsPlayed: v.number(),
        wizardsCreated: v.number(),
        imageGenerations: v.number(),
        adsWatched: v.number(),
        resetDate: v.number(),
      }),
    })
  ),
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    if (!user) {
      return null;
    }

    return {
      _id: user._id,
      subscriptionTier: user.subscriptionTier,
      subscriptionStatus: user.subscriptionStatus,
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: user.stripeSubscriptionId,
      subscriptionEndsAt: user.subscriptionEndsAt,
      imageCredits: user.imageCredits,
      monthlyUsage: user.monthlyUsage,
    };
  },
});
