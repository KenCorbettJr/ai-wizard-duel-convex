import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type {
  UserSubscription,
  UserUsageStatus,
  CanCreateWizardResult,
  CanStartDuelResult,
  CanGenerateImagesResult,
  CanWatchRewardAdResult,
} from "./types";

// Usage limits for free tier
export const FREE_TIER_LIMITS = {
  WIZARDS_MAX: 3,
  DUELS_PER_DAY: 5, // Will be removed in future task (unlimited duels for all registered users)
  INITIAL_IMAGE_CREDITS: 10,
  AD_REWARD_COOLDOWN: 300000, // 5 minutes in milliseconds
} as const;

/**
 * Check if user can create a wizard
 */
export const canCreateWizard = query({
  args: { clerkId: v.string() },
  returns: v.object({
    canCreate: v.boolean(),
    reason: v.optional(v.string()),
    currentCount: v.number(),
    limit: v.union(v.number(), v.literal("UNLIMITED")),
  }),
  handler: async (ctx, { clerkId }): Promise<CanCreateWizardResult> => {
    // Check subscription status
    const subscription: UserSubscription = await ctx.runQuery(
      internal.userSubscriptionQueries.getUserSubscription,
      {
        clerkId,
      }
    );

    if (!subscription) {
      return {
        canCreate: false,
        reason: "User not found",
        currentCount: 0,
        limit: 0,
      };
    }

    // Premium users have unlimited wizards
    if (
      subscription.subscriptionTier === "PREMIUM" &&
      subscription.subscriptionStatus === "ACTIVE"
    ) {
      const wizardCount = await ctx.db
        .query("wizards")
        .withIndex("by_owner", (q) => q.eq("owner", clerkId))
        .collect()
        .then((wizards) => wizards.length);

      return {
        canCreate: true,
        currentCount: wizardCount,
        limit: "UNLIMITED" as const,
      };
    }

    // Check wizard count for free users
    const wizardCount = await ctx.db
      .query("wizards")
      .withIndex("by_owner", (q) => q.eq("owner", clerkId))
      .collect()
      .then((wizards) => wizards.length);

    if (wizardCount >= FREE_TIER_LIMITS.WIZARDS_MAX) {
      return {
        canCreate: false,
        reason:
          "Free tier wizard limit reached. Upgrade to Premium for unlimited wizards.",
        currentCount: wizardCount,
        limit: FREE_TIER_LIMITS.WIZARDS_MAX,
      };
    }

    return {
      canCreate: true,
      currentCount: wizardCount,
      limit: FREE_TIER_LIMITS.WIZARDS_MAX,
    };
  },
});

/**
 * Check if user can start a duel (requires registration)
 */
export const canStartDuel = query({
  args: { clerkId: v.string() },
  returns: v.object({
    canStart: v.boolean(),
    reason: v.optional(v.string()),
    currentCount: v.number(),
    limit: v.union(v.number(), v.literal("UNLIMITED")),
  }),
  handler: async (ctx, { clerkId }): Promise<CanStartDuelResult> => {
    // Check subscription status
    const subscription: UserSubscription = await ctx.runQuery(
      internal.userSubscriptionQueries.getUserSubscription,
      { clerkId }
    );

    if (!subscription) {
      return {
        canStart: false,
        reason: "Registration required to participate in duels",
        currentCount: 0,
        limit: 0,
      };
    }

    // Premium users have unlimited duels
    if (
      subscription.subscriptionTier === "PREMIUM" &&
      subscription.subscriptionStatus === "ACTIVE"
    ) {
      return {
        canStart: true,
        currentCount: subscription.monthlyUsage.duelsPlayed,
        limit: "UNLIMITED" as const,
      };
    }

    // Check if monthly usage needs to be reset
    const now = Date.now();
    if (now > subscription.monthlyUsage.resetDate) {
      // Usage period has expired, user can start duels
      return {
        canStart: true,
        currentCount: 0, // Will be reset on next increment
        limit: FREE_TIER_LIMITS.DUELS_PER_DAY,
      };
    }

    // Check daily duel limit for free users
    if (
      subscription.monthlyUsage.duelsPlayed >= FREE_TIER_LIMITS.DUELS_PER_DAY
    ) {
      return {
        canStart: false,
        reason:
          "Daily duel limit reached. Upgrade to Premium for unlimited duels.",
        currentCount: subscription.monthlyUsage.duelsPlayed,
        limit: FREE_TIER_LIMITS.DUELS_PER_DAY,
      };
    }

    return {
      canStart: true,
      currentCount: subscription.monthlyUsage.duelsPlayed,
      limit: FREE_TIER_LIMITS.DUELS_PER_DAY,
    };
  },
});

/**
 * Check if user can generate images (has image credits)
 */
export const canGenerateImages = query({
  args: { clerkId: v.string() },
  returns: v.object({
    canGenerate: v.boolean(),
    reason: v.optional(v.string()),
    imageCredits: v.number(),
    isPremium: v.boolean(),
  }),
  handler: async (ctx, { clerkId }): Promise<CanGenerateImagesResult> => {
    // Check subscription status
    const subscription: UserSubscription = await ctx.runQuery(
      internal.userSubscriptionQueries.getUserSubscription,
      {
        clerkId,
      }
    );

    if (!subscription) {
      return {
        canGenerate: false,
        reason: "User not found",
        imageCredits: 0,
        isPremium: false,
      };
    }

    const isPremium =
      subscription.subscriptionTier === "PREMIUM" &&
      subscription.subscriptionStatus === "ACTIVE";

    // Premium users have unlimited image generation
    if (isPremium) {
      return {
        canGenerate: true,
        imageCredits: subscription.imageCredits,
        isPremium: true,
      };
    }

    // Free users need image credits
    if (subscription.imageCredits <= 0) {
      return {
        canGenerate: false,
        reason:
          "Insufficient image credits. Watch ads to earn more credits or upgrade to Premium for unlimited image generation.",
        imageCredits: 0,
        isPremium: false,
      };
    }

    return {
      canGenerate: true,
      imageCredits: subscription.imageCredits,
      isPremium: false,
    };
  },
});

/**
 * Track wizard creation and increment usage
 */
export const trackWizardCreation = mutation({
  args: { clerkId: v.string() },
  returns: v.null(),
  handler: async (ctx, { clerkId }) => {
    await ctx.runMutation(api.subscriptionService.incrementUsage, {
      clerkId,
      action: "WIZARD_CREATED",
    });

    return null;
  },
});

/**
 * Track duel participation and increment usage
 */
export const trackDuelParticipation = mutation({
  args: { clerkId: v.string() },
  returns: v.null(),
  handler: async (ctx, { clerkId }) => {
    await ctx.runMutation(api.subscriptionService.incrementUsage, {
      clerkId,
      action: "DUEL_PLAYED",
    });

    return null;
  },
});

/**
 * Track image generation and increment usage
 */
export const trackImageGeneration = mutation({
  args: { clerkId: v.string() },
  returns: v.null(),
  handler: async (ctx, { clerkId }) => {
    await ctx.runMutation(api.subscriptionService.incrementUsage, {
      clerkId,
      action: "IMAGE_GENERATED",
    });

    return null;
  },
});

/**
 * Track ad watching and increment usage
 */
export const trackAdWatching = mutation({
  args: { clerkId: v.string() },
  returns: v.null(),
  handler: async (ctx, { clerkId }) => {
    await ctx.runMutation(api.subscriptionService.incrementUsage, {
      clerkId,
      action: "AD_WATCHED",
    });

    return null;
  },
});

/**
 * Get comprehensive usage status for user dashboard
 */
export const getUserUsageStatus = query({
  args: { clerkId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      subscriptionTier: v.union(v.literal("FREE"), v.literal("PREMIUM")),
      subscriptionStatus: v.union(
        v.literal("ACTIVE"),
        v.literal("CANCELED"),
        v.literal("PAST_DUE"),
        v.literal("TRIALING")
      ),
      wizards: v.object({
        current: v.number(),
        limit: v.union(v.number(), v.literal("UNLIMITED")),
        canCreate: v.boolean(),
      }),
      duels: v.object({
        current: v.number(),
        limit: v.union(v.number(), v.literal("UNLIMITED")),
        canStart: v.boolean(),
      }),
      imageCredits: v.object({
        current: v.number(),
        canGenerate: v.boolean(),
        isPremium: v.boolean(),
      }),
      monthlyUsage: v.object({
        duelsPlayed: v.number(),
        wizardsCreated: v.number(),
        imageGenerations: v.number(),
        adsWatched: v.number(),
        resetDate: v.number(),
      }),
    })
  ),
  handler: async (ctx, { clerkId }): Promise<UserUsageStatus> => {
    // Get subscription info
    const subscription: UserSubscription = await ctx.runQuery(
      internal.userSubscriptionQueries.getUserSubscription,
      {
        clerkId,
      }
    );
    if (!subscription) {
      return null;
    }

    const isPremium =
      subscription.subscriptionTier === "PREMIUM" &&
      subscription.subscriptionStatus === "ACTIVE";

    // Get wizard creation status inline to avoid circular reference
    const wizardCount = await ctx.db
      .query("wizards")
      .withIndex("by_owner", (q) => q.eq("owner", clerkId))
      .collect()
      .then((wizards) => wizards.length);

    const wizardStatus = {
      current: wizardCount,
      limit: isPremium ? ("UNLIMITED" as const) : FREE_TIER_LIMITS.WIZARDS_MAX,
      canCreate: isPremium || wizardCount < FREE_TIER_LIMITS.WIZARDS_MAX,
    };

    // Get duel participation status inline to avoid circular reference
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();

    const currentDuels = subscription.monthlyUsage.duelsPlayed;
    const now = Date.now();
    const usageExpired = now > subscription.monthlyUsage.resetDate;

    let canStartDuel = !!user;
    if (user && !isPremium) {
      // For free users, check if they've exceeded the daily limit
      if (!usageExpired && currentDuels >= FREE_TIER_LIMITS.DUELS_PER_DAY) {
        canStartDuel = false;
      }
    }

    const duelStatus = {
      current: usageExpired ? 0 : currentDuels,
      limit: isPremium
        ? ("UNLIMITED" as const)
        : FREE_TIER_LIMITS.DUELS_PER_DAY,
      canStart: canStartDuel,
    };

    // Get image generation status inline to avoid circular reference
    const imageStatus = {
      current: subscription.imageCredits,
      canGenerate: isPremium || subscription.imageCredits > 0,
      isPremium,
    };

    return {
      subscriptionTier: subscription.subscriptionTier,
      subscriptionStatus: subscription.subscriptionStatus,
      wizards: wizardStatus,
      duels: duelStatus,
      imageCredits: imageStatus,
      monthlyUsage: subscription.monthlyUsage,
    };
  },
});

/**
 * Check if user can watch ads for rewards (cooldown check)
 */
export const canWatchRewardAd = query({
  args: { clerkId: v.string() },
  returns: v.object({
    canWatch: v.boolean(),
    reason: v.optional(v.string()),
    cooldownEndsAt: v.optional(v.number()),
  }),
  handler: async (ctx, { clerkId }): Promise<CanWatchRewardAdResult> => {
    // Get the user's last ad interaction
    const lastAdInteraction = await ctx.db
      .query("adInteractions")
      .withIndex("by_user", (q) => q.eq("userId", clerkId))
      .filter((q) => q.eq(q.field("adType"), "VIDEO_REWARD"))
      .filter((q) => q.eq(q.field("action"), "COMPLETION"))
      .order("desc")
      .first();

    if (!lastAdInteraction) {
      // No previous ad interactions, can watch
      return { canWatch: true };
    }

    const now = Date.now();
    const cooldownEndsAt =
      lastAdInteraction.createdAt + FREE_TIER_LIMITS.AD_REWARD_COOLDOWN;

    if (now < cooldownEndsAt) {
      return {
        canWatch: false,
        reason:
          "Ad reward cooldown active. Please wait before watching another ad.",
        cooldownEndsAt,
      };
    }

    return { canWatch: true };
  },
});
