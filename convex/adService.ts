import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Ad configuration types
const AdPlacement = v.union(
  v.literal("WIZARD_PAGE"),
  v.literal("DUEL_PAGE"),
  v.literal("CREDIT_REWARD")
);

const AdType = v.union(
  v.literal("DISPLAY_BANNER"),
  v.literal("VIDEO_REWARD"),
  v.literal("INTERSTITIAL")
);

const AdAction = v.union(
  v.literal("IMPRESSION"),
  v.literal("CLICK"),
  v.literal("COMPLETION")
);

/**
 * Check if ads should be shown for a user
 * Anonymous users see ads, logged-in users don't
 */
export const shouldShowAds = query({
  args: {
    userId: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    // Show ads only for anonymous users (no userId provided)
    return !args.userId;
  },
});

/**
 * Get ad configuration for a specific placement
 */
export const getAdConfiguration = query({
  args: {
    placement: AdPlacement,
    userId: v.optional(v.string()),
  },
  returns: v.object({
    shouldShow: v.boolean(),
    adType: v.optional(AdType),
    adNetworkId: v.optional(v.string()),
    placement: AdPlacement,
  }),
  handler: async (ctx, args) => {
    const shouldShow = !args.userId; // Only show to anonymous users

    if (!shouldShow) {
      return {
        shouldShow: false,
        placement: args.placement,
      };
    }

    // Configure ad type based on placement
    let adType: "DISPLAY_BANNER" | "VIDEO_REWARD" | "INTERSTITIAL";
    switch (args.placement) {
      case "WIZARD_PAGE":
        adType = "DISPLAY_BANNER";
        break;
      case "DUEL_PAGE":
        adType = "DISPLAY_BANNER";
        break;
      case "CREDIT_REWARD":
        adType = "VIDEO_REWARD";
        break;
      default:
        adType = "DISPLAY_BANNER";
    }

    return {
      shouldShow: true,
      adType,
      adNetworkId: "google-adsense", // Default ad network
      placement: args.placement,
    };
  },
});

/**
 * Track ad interaction (impression, click, completion)
 */
export const trackAdInteraction = mutation({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.string(),
    adType: AdType,
    placement: AdPlacement,
    action: AdAction,
    adNetworkId: v.string(),
    revenue: v.optional(v.number()),
    metadata: v.optional(v.record(v.string(), v.string())),
  },
  returns: v.id("adInteractions"),
  handler: async (ctx, args) => {
    const interactionId = await ctx.db.insert("adInteractions", {
      userId: args.userId,
      sessionId: args.sessionId,
      adType: args.adType,
      placement: args.placement,
      action: args.action,
      revenue: args.revenue,
      adNetworkId: args.adNetworkId,
      metadata: args.metadata,
      createdAt: Date.now(),
    });

    return interactionId;
  },
});

/**
 * Get ad performance metrics for a specific placement
 */
export const getAdPerformanceMetrics = query({
  args: {
    placement: AdPlacement,
    timeframe: v.optional(v.number()), // Days to look back, defaults to 7
  },
  returns: v.object({
    impressions: v.number(),
    clicks: v.number(),
    completions: v.number(),
    revenue: v.number(),
    ctr: v.number(), // Click-through rate
    completionRate: v.number(),
  }),
  handler: async (ctx, args) => {
    const timeframe = args.timeframe || 7;
    const cutoffTime = Date.now() - timeframe * 24 * 60 * 60 * 1000;

    const interactions = await ctx.db
      .query("adInteractions")
      .withIndex("by_placement", (q) => q.eq("placement", args.placement))
      .filter((q) => q.gte(q.field("createdAt"), cutoffTime))
      .collect();

    let impressions = 0;
    let clicks = 0;
    let completions = 0;
    let revenue = 0;

    for (const interaction of interactions) {
      switch (interaction.action) {
        case "IMPRESSION":
          impressions++;
          break;
        case "CLICK":
          clicks++;
          break;
        case "COMPLETION":
          completions++;
          break;
      }
      revenue += interaction.revenue || 0;
    }

    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const completionRate =
      impressions > 0 ? (completions / impressions) * 100 : 0;

    return {
      impressions,
      clicks,
      completions,
      revenue,
      ctr,
      completionRate,
    };
  },
});

/**
 * Calculate total ad revenue for a user or session
 */
export const calculateAdRevenue = query({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    timeframe: v.optional(v.number()), // Days to look back
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    if (!args.userId && !args.sessionId) {
      throw new Error("Either userId or sessionId must be provided");
    }

    const timeframe = args.timeframe || 30;
    const cutoffTime = Date.now() - timeframe * 24 * 60 * 60 * 1000;

    let interactions;
    if (args.userId) {
      interactions = await ctx.db
        .query("adInteractions")
        .withIndex("by_user", (q) => q.eq("userId", args.userId!))
        .filter((q) => q.gte(q.field("createdAt"), cutoffTime))
        .collect();
    } else if (args.sessionId) {
      interactions = await ctx.db
        .query("adInteractions")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId!))
        .filter((q) => q.gte(q.field("createdAt"), cutoffTime))
        .collect();
    } else {
      throw new Error("Either userId or sessionId must be provided");
    }

    return interactions.reduce((total, interaction) => {
      return total + (interaction.revenue || 0);
    }, 0);
  },
});

/**
 * Get ad interaction history for analytics
 */
export const getAdInteractionHistory = query({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("adInteractions"),
      adType: AdType,
      placement: AdPlacement,
      action: AdAction,
      revenue: v.optional(v.number()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    let interactions;
    if (args.userId) {
      interactions = await ctx.db
        .query("adInteractions")
        .withIndex("by_user", (q) => q.eq("userId", args.userId!))
        .order("desc")
        .take(limit);
    } else if (args.sessionId) {
      interactions = await ctx.db
        .query("adInteractions")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId!))
        .order("desc")
        .take(limit);
    } else {
      throw new Error("Either userId or sessionId must be provided");
    }

    return interactions.map((interaction) => ({
      _id: interaction._id,
      adType: interaction.adType,
      placement: interaction.placement,
      action: interaction.action,
      revenue: interaction.revenue,
      createdAt: interaction.createdAt,
    }));
  },
});
