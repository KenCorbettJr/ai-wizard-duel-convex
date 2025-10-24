import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Types for subscription management
export type SubscriptionTier = "FREE" | "PREMIUM";
export type SubscriptionStatus =
  | "ACTIVE"
  | "CANCELED"
  | "PAST_DUE"
  | "TRIALING";
export type UsageAction =
  | "DUEL_PLAYED"
  | "WIZARD_CREATED"
  | "IMAGE_GENERATED"
  | "AD_WATCHED";
export type PremiumFeature =
  | "UNLIMITED_WIZARDS"
  | "UNLIMITED_DUELS"
  | "PREMIUM_AI"
  | "ADVANCED_CUSTOMIZATION";
export type AIModelTier = "STANDARD" | "PREMIUM";

// Usage limits for free tier
const FREE_TIER_LIMITS = {
  WIZARDS_MAX: 3,
  DUELS_PER_DAY: 5, // Will be removed in future task
  INITIAL_IMAGE_CREDITS: 10,
} as const;

/**
 * Check if user has access to a specific premium feature
 */
export const hasFeatureAccess = query({
  args: {
    clerkId: v.string(),
    feature: v.union(
      v.literal("UNLIMITED_WIZARDS"),
      v.literal("UNLIMITED_DUELS"),
      v.literal("PREMIUM_AI"),
      v.literal("ADVANCED_CUSTOMIZATION")
    ),
  },
  returns: v.boolean(),
  handler: async (ctx, { clerkId, feature }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    if (!user) {
      return false;
    }

    // Premium users have access to all features
    if (
      user.subscriptionTier === "PREMIUM" &&
      user.subscriptionStatus === "ACTIVE"
    ) {
      return true;
    }

    // Free users have no premium features
    return false;
  },
});

/**
 * Get AI model tier for user
 */
export const getAIModelTier = query({
  args: { clerkId: v.string() },
  returns: v.union(v.literal("STANDARD"), v.literal("PREMIUM")),
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    if (!user) {
      return "STANDARD";
    }

    // Premium users get premium AI models
    if (
      user.subscriptionTier === "PREMIUM" &&
      user.subscriptionStatus === "ACTIVE"
    ) {
      return "PREMIUM";
    }

    return "STANDARD";
  },
});

/**
 * Check if user can perform a specific action based on usage limits
 */
export const checkUsageLimit = query({
  args: {
    clerkId: v.string(),
    action: v.union(
      v.literal("DUEL_PLAYED"),
      v.literal("WIZARD_CREATED"),
      v.literal("IMAGE_GENERATED"),
      v.literal("AD_WATCHED")
    ),
  },
  returns: v.object({
    canPerform: v.boolean(),
    reason: v.optional(v.string()),
    currentUsage: v.optional(v.number()),
    limit: v.optional(v.number()),
  }),
  handler: async (ctx, { clerkId, action }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    if (!user) {
      return { canPerform: false, reason: "User not found" };
    }

    // Premium users have unlimited access (except image credits)
    if (
      user.subscriptionTier === "PREMIUM" &&
      user.subscriptionStatus === "ACTIVE"
    ) {
      if (action === "IMAGE_GENERATED") {
        // Premium users still need image credits, but they get unlimited credits
        return { canPerform: true };
      }
      return { canPerform: true };
    }

    // Check if monthly usage needs to be reset
    const now = Date.now();
    if (now > user.monthlyUsage.resetDate) {
      // Usage period has expired, reset will happen on next increment
      return { canPerform: true };
    }

    // Check specific limits for free users
    switch (action) {
      case "WIZARD_CREATED":
        const wizardCount = await ctx.db
          .query("wizards")
          .withIndex("by_owner", (q) => q.eq("owner", clerkId))
          .collect()
          .then((wizards) => wizards.length);

        if (wizardCount >= FREE_TIER_LIMITS.WIZARDS_MAX) {
          return {
            canPerform: false,
            reason: "Free tier wizard limit reached",
            currentUsage: wizardCount,
            limit: FREE_TIER_LIMITS.WIZARDS_MAX,
          };
        }
        return {
          canPerform: true,
          currentUsage: wizardCount,
          limit: FREE_TIER_LIMITS.WIZARDS_MAX,
        };

      case "DUEL_PLAYED":
        // Note: This will be removed in future task (unlimited duels for all registered users)
        if (user.monthlyUsage.duelsPlayed >= FREE_TIER_LIMITS.DUELS_PER_DAY) {
          return {
            canPerform: false,
            reason: "Daily duel limit reached",
            currentUsage: user.monthlyUsage.duelsPlayed,
            limit: FREE_TIER_LIMITS.DUELS_PER_DAY,
          };
        }
        return {
          canPerform: true,
          currentUsage: user.monthlyUsage.duelsPlayed,
          limit: FREE_TIER_LIMITS.DUELS_PER_DAY,
        };

      case "IMAGE_GENERATED":
        if (user.imageCredits <= 0) {
          return {
            canPerform: false,
            reason: "Insufficient image credits",
            currentUsage: user.imageCredits,
            limit: 0,
          };
        }
        return { canPerform: true, currentUsage: user.imageCredits };

      case "AD_WATCHED":
        // No limits on ad watching
        return { canPerform: true };

      default:
        return { canPerform: false, reason: "Unknown action" };
    }
  },
});

/**
 * Increment usage for a specific action
 */
export const incrementUsage = mutation({
  args: {
    clerkId: v.string(),
    action: v.union(
      v.literal("DUEL_PLAYED"),
      v.literal("WIZARD_CREATED"),
      v.literal("IMAGE_GENERATED"),
      v.literal("AD_WATCHED")
    ),
  },
  returns: v.null(),
  handler: async (ctx, { clerkId, action }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const now = Date.now();
    let monthlyUsage = user.monthlyUsage;

    // Reset monthly usage if period has expired
    if (now > user.monthlyUsage.resetDate) {
      monthlyUsage = {
        duelsPlayed: 0,
        wizardsCreated: 0,
        imageGenerations: 0,
        adsWatched: 0,
        resetDate: now + 30 * 24 * 60 * 60 * 1000, // 30 days from now
      };
    }

    // Increment the specific usage counter
    switch (action) {
      case "DUEL_PLAYED":
        monthlyUsage.duelsPlayed += 1;
        break;
      case "WIZARD_CREATED":
        monthlyUsage.wizardsCreated += 1;
        break;
      case "IMAGE_GENERATED":
        monthlyUsage.imageGenerations += 1;
        break;
      case "AD_WATCHED":
        monthlyUsage.adsWatched += 1;
        break;
    }

    await ctx.db.patch(user._id, {
      monthlyUsage,
      updatedAt: now,
    });

    return null;
  },
});

/**
 * Update user subscription (for Stripe webhooks)
 */
export const updateSubscription = mutation({
  args: {
    clerkId: v.string(),
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
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      subscriptionTier: args.subscriptionTier,
      subscriptionStatus: args.subscriptionStatus,
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      subscriptionEndsAt: args.subscriptionEndsAt,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Reset monthly usage for a user (internal function)
 */
export const resetMonthlyUsage = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    const now = Date.now();
    await ctx.db.patch(userId, {
      monthlyUsage: {
        duelsPlayed: 0,
        wizardsCreated: 0,
        imageGenerations: 0,
        adsWatched: 0,
        resetDate: now + 30 * 24 * 60 * 60 * 1000, // 30 days from now
      },
      updatedAt: now,
    });

    return null;
  },
});

/**
 * Get subscription statistics (admin function)
 */
export const getSubscriptionStats = query({
  args: {},
  returns: v.object({
    totalUsers: v.number(),
    freeUsers: v.number(),
    premiumUsers: v.number(),
    activeSubscriptions: v.number(),
    canceledSubscriptions: v.number(),
    trialingSubscriptions: v.number(),
    pastDueSubscriptions: v.number(),
  }),
  handler: async (ctx) => {
    // Check if current user is admin
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (
      !currentUser ||
      (currentUser.role !== "admin" && currentUser.role !== "super_admin")
    ) {
      throw new Error("Access denied: Admin privileges required");
    }

    const allUsers = await ctx.db.query("users").collect();

    const stats = {
      totalUsers: allUsers.length,
      freeUsers: 0,
      premiumUsers: 0,
      activeSubscriptions: 0,
      canceledSubscriptions: 0,
      trialingSubscriptions: 0,
      pastDueSubscriptions: 0,
    };

    for (const user of allUsers) {
      if (user.subscriptionTier === "FREE") {
        stats.freeUsers += 1;
      } else {
        stats.premiumUsers += 1;
      }

      switch (user.subscriptionStatus) {
        case "ACTIVE":
          stats.activeSubscriptions += 1;
          break;
        case "CANCELED":
          stats.canceledSubscriptions += 1;
          break;
        case "TRIALING":
          stats.trialingSubscriptions += 1;
          break;
        case "PAST_DUE":
          stats.pastDueSubscriptions += 1;
          break;
      }
    }

    return stats;
  },
});

/**
 * Get user's current usage limits and status
 */
export const getUserUsageLimits = query({
  args: { clerkId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      subscriptionTier: v.union(v.literal("FREE"), v.literal("PREMIUM")),
      wizardLimit: v.union(v.number(), v.literal("UNLIMITED")),
      currentWizards: v.number(),
      duelLimit: v.union(v.number(), v.literal("UNLIMITED")),
      currentDuels: v.number(),
      imageCredits: v.number(),
      monthlyUsage: v.object({
        duelsPlayed: v.number(),
        wizardsCreated: v.number(),
        imageGenerations: v.number(),
        adsWatched: v.number(),
        resetDate: v.number(),
      }),
      resetDate: v.number(),
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

    // Count current wizards
    const wizardCount = await ctx.db
      .query("wizards")
      .withIndex("by_owner", (q) => q.eq("owner", clerkId))
      .collect()
      .then((wizards) => wizards.length);

    const isPremium =
      user.subscriptionTier === "PREMIUM" &&
      user.subscriptionStatus === "ACTIVE";

    return {
      subscriptionTier: user.subscriptionTier,
      wizardLimit: isPremium
        ? ("UNLIMITED" as const)
        : FREE_TIER_LIMITS.WIZARDS_MAX,
      currentWizards: wizardCount,
      duelLimit: isPremium
        ? ("UNLIMITED" as const)
        : FREE_TIER_LIMITS.DUELS_PER_DAY,
      currentDuels: user.monthlyUsage.duelsPlayed,
      imageCredits: user.imageCredits,
      monthlyUsage: user.monthlyUsage,
      resetDate: user.monthlyUsage.resetDate,
    };
  },
});
