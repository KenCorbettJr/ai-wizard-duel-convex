import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Generate a unique session ID for anonymous users
 * This is called from the client to create a session
 */
export const createAnonymousSession = mutation({
  args: {
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    referrer: v.optional(v.string()),
  },
  returns: v.string(),
  handler: async () => {
    // Generate a unique session ID
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const sessionId = `anon_${timestamp}_${random}`;

    // Store session metadata if needed for analytics
    // For now, we'll just return the session ID
    // In the future, we could store session data in a sessions table

    return sessionId;
  },
});

/**
 * Validate if a session ID is valid format
 */
export const validateSessionId = query({
  args: {
    sessionId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    // Check if session ID follows expected format
    const sessionIdPattern = /^anon_\d+_[a-z0-9]+$/;
    return sessionIdPattern.test(args.sessionId);
  },
});

/**
 * Get session analytics data
 */
export const getSessionAnalytics = query({
  args: {
    sessionId: v.string(),
  },
  returns: v.object({
    sessionId: v.string(),
    adInteractions: v.number(),
    totalRevenue: v.number(),
    firstSeen: v.optional(v.number()),
    lastSeen: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    // Get all ad interactions for this session
    const interactions = await ctx.db
      .query("adInteractions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    const totalRevenue = interactions.reduce((sum, interaction) => {
      return sum + (interaction.revenue || 0);
    }, 0);

    let firstSeen: number | undefined;
    let lastSeen: number | undefined;

    if (interactions.length > 0) {
      const timestamps = interactions
        .map((i) => i.createdAt)
        .sort((a, b) => a - b);
      firstSeen = timestamps[0];
      lastSeen = timestamps[timestamps.length - 1];
    }

    return {
      sessionId: args.sessionId,
      adInteractions: interactions.length,
      totalRevenue,
      firstSeen,
      lastSeen,
    };
  },
});
