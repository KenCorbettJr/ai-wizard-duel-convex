import {
  query,
  mutation,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { v } from "convex/values";
import { getActiveCampaignSeasonHelper } from "./seasonHelpers";
import { checkSuperAdminAccess } from "./auth.utils";

/**
 * Create a new campaign season (super admin only)
 */
export const createCampaignSeason = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    completionRelic: v.object({
      name: v.string(),
      description: v.string(),
      luckBonus: v.number(),
      iconUrl: v.optional(v.string()),
    }),
    opponents: v.array(v.id("wizards")), // Array of opponent wizard IDs in order
    maxParticipants: v.optional(v.number()),
    status: v.optional(v.union(v.literal("ACTIVE"), v.literal("ARCHIVED"))),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    seasonId: v.id("campaignSeasons"),
  }),
  handler: async (ctx, args) => {
    // Check admin access
    const adminAccess = await checkSuperAdminAccess(ctx);
    if (!adminAccess.hasAccess) {
      throw new Error("Access denied: Super admin privileges required");
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Validate opponents array
    if (args.opponents.length === 0) {
      throw new Error("At least one opponent must be selected");
    }

    if (args.opponents.length > 10) {
      throw new Error("Maximum of 10 opponents allowed per season");
    }

    // Verify all opponents exist and are campaign opponents
    for (const opponentId of args.opponents) {
      const opponent = await ctx.db.get(opponentId);
      if (!opponent || !opponent.isCampaignOpponent) {
        throw new Error(`Invalid opponent: ${opponentId}`);
      }
    }

    // Default to ACTIVE status if not specified
    const status = args.status || "ACTIVE";

    // Create the season
    const seasonId = await ctx.db.insert("campaignSeasons", {
      name: args.name,
      description: args.description,
      status,
      completionRelic: args.completionRelic,
      opponents: args.opponents,
      maxParticipants: args.maxParticipants,
      createdAt: Date.now(),
      createdBy: identity.subject,
    });

    return {
      success: true,
      message: `Successfully created season: ${args.name}`,
      seasonId,
    };
  },
});

/**
 * Get the currently active campaign season
 */
export const getActiveCampaignSeason = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("campaignSeasons"),
      _creationTime: v.number(),
      name: v.string(),
      description: v.string(),
      status: v.union(v.literal("ACTIVE"), v.literal("ARCHIVED")),
      completionRelic: v.object({
        name: v.string(),
        description: v.string(),
        luckBonus: v.number(),
        iconUrl: v.optional(v.string()),
      }),
      opponents: v.array(v.id("wizards")),
      maxParticipants: v.optional(v.number()),
      isDefault: v.optional(v.boolean()),
      createdAt: v.number(),
      createdBy: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    // First try to find an active season
    const activeSeason = await ctx.db
      .query("campaignSeasons")
      .withIndex("by_status", (q) => q.eq("status", "ACTIVE"))
      .first();

    if (activeSeason) {
      return activeSeason;
    }

    // If no active season, look for default season
    const defaultSeason = await ctx.db
      .query("campaignSeasons")
      .withIndex("by_default", (q) => q.eq("isDefault", true))
      .first();

    return defaultSeason || null;
  },
});

/**
 * Internal helper to get the active campaign season (to avoid circular dependencies)
 */
export const getActiveCampaignSeasonInternal = internalQuery({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("campaignSeasons"),
      _creationTime: v.number(),
      name: v.string(),
      description: v.string(),
      status: v.union(v.literal("ACTIVE"), v.literal("ARCHIVED")),
      completionRelic: v.object({
        name: v.string(),
        description: v.string(),
        luckBonus: v.number(),
        iconUrl: v.optional(v.string()),
      }),
      opponents: v.array(v.id("wizards")),
      maxParticipants: v.optional(v.number()),
      isDefault: v.optional(v.boolean()),
      createdAt: v.number(),
      createdBy: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    // First try to find an active season
    const activeSeason = await ctx.db
      .query("campaignSeasons")
      .withIndex("by_status", (q) => q.eq("status", "ACTIVE"))
      .first();

    if (activeSeason) {
      return activeSeason;
    }

    // If no active season, look for default season
    const defaultSeason = await ctx.db
      .query("campaignSeasons")
      .withIndex("by_default", (q) => q.eq("isDefault", true))
      .first();

    return defaultSeason || null;
  },
});

/**
 * Get all campaign seasons (admin only)
 */
export const getAllCampaignSeasons = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("campaignSeasons"),
      _creationTime: v.number(),
      name: v.string(),
      description: v.string(),
      status: v.union(v.literal("ACTIVE"), v.literal("ARCHIVED")),
      completionRelic: v.object({
        name: v.string(),
        description: v.string(),
        luckBonus: v.number(),
        iconUrl: v.optional(v.string()),
      }),
      opponents: v.array(v.id("wizards")),
      maxParticipants: v.optional(v.number()),
      isDefault: v.optional(v.boolean()),
      createdAt: v.number(),
      createdBy: v.string(),
      participantCount: v.number(),
    })
  ),
  handler: async (ctx) => {
    // Check admin access
    const adminAccess = await checkSuperAdminAccess(ctx);
    if (!adminAccess.hasAccess) {
      throw new Error("Access denied: Admin privileges required");
    }

    const seasons = await ctx.db
      .query("campaignSeasons")
      .order("desc")
      .collect();

    // Get participant counts for each season
    const seasonsWithCounts = await Promise.all(
      seasons.map(async (season) => {
        const participantCount = await ctx.db
          .query("wizardCampaignProgress")
          .withIndex("by_season", (q) => q.eq("seasonId", season._id))
          .collect()
          .then((progress) => new Set(progress.map((p) => p.userId)).size);

        return {
          ...season,
          participantCount,
        };
      })
    );

    return seasonsWithCounts;
  },
});

/**
 * Manually update a season (super admin only)
 */
export const updateCampaignSeason = mutation({
  args: {
    seasonId: v.id("campaignSeasons"),
    updates: v.object({
      name: v.optional(v.string()),
      description: v.optional(v.string()),
      status: v.optional(v.union(v.literal("ACTIVE"), v.literal("ARCHIVED"))),
      completionRelic: v.optional(
        v.object({
          name: v.string(),
          description: v.string(),
          luckBonus: v.number(),
          iconUrl: v.optional(v.string()),
        })
      ),
      opponents: v.optional(v.array(v.id("wizards"))),
      maxParticipants: v.optional(v.number()),
      isDefault: v.optional(v.boolean()),
    }),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    // Check admin access
    const adminAccess = await checkSuperAdminAccess(ctx);
    if (!adminAccess.hasAccess) {
      throw new Error("Access denied: Super admin privileges required");
    }

    const season = await ctx.db.get(args.seasonId);
    if (!season) {
      throw new Error("Season not found");
    }

    // If setting as default, remove default from other seasons
    if (args.updates.isDefault === true) {
      const currentDefault = await ctx.db
        .query("campaignSeasons")
        .withIndex("by_default", (q) => q.eq("isDefault", true))
        .first();

      if (currentDefault && currentDefault._id !== args.seasonId) {
        await ctx.db.patch(currentDefault._id, { isDefault: false });
      }
    }

    await ctx.db.patch(args.seasonId, args.updates);

    return {
      success: true,
      message: `Successfully updated season: ${season.name}`,
    };
  },
});

/**
 * Archive a season (super admin only)
 */
export const archiveCampaignSeason = mutation({
  args: {
    seasonId: v.id("campaignSeasons"),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    // Check admin access
    const adminAccess = await checkSuperAdminAccess(ctx);
    if (!adminAccess.hasAccess) {
      throw new Error("Access denied: Super admin privileges required");
    }

    const season = await ctx.db.get(args.seasonId);
    if (!season) {
      throw new Error("Season not found");
    }

    await ctx.db.patch(args.seasonId, { status: "ARCHIVED" });

    return {
      success: true,
      message: `Successfully archived season: ${season.name}`,
    };
  },
});

/**
 * Get user's progress in the current season
 */
export const getUserCurrentSeasonProgress = query({
  args: { userId: v.string() },
  returns: v.union(
    v.object({
      season: v.object({
        _id: v.id("campaignSeasons"),
        name: v.string(),
        description: v.string(),
        completionRelic: v.object({
          name: v.string(),
          description: v.string(),
          luckBonus: v.number(),
          iconUrl: v.optional(v.string()),
        }),
      }),
      progress: v.array(
        v.object({
          _id: v.id("wizardCampaignProgress"),
          wizardId: v.id("wizards"),
          currentOpponent: v.number(),
          defeatedOpponents: v.array(v.number()),
          hasCompletionRelic: v.boolean(),
          createdAt: v.number(),
          lastBattleAt: v.optional(v.number()),
        })
      ),
    }),
    v.null()
  ),
  handler: async (ctx, { userId }) => {
    const activeSeason = await getActiveCampaignSeasonHelper(ctx);
    if (!activeSeason) {
      return null;
    }

    const progress = await ctx.db
      .query("wizardCampaignProgress")
      .withIndex("by_season", (q) => q.eq("seasonId", activeSeason._id))
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();

    return {
      season: {
        _id: activeSeason._id,
        name: activeSeason.name,
        description: activeSeason.description,
        completionRelic: activeSeason.completionRelic,
      },
      progress,
    };
  },
});

/**
 * Get user's historical season progress
 */
export const getUserSeasonHistory = query({
  args: { userId: v.string() },
  returns: v.array(
    v.object({
      season: v.object({
        _id: v.id("campaignSeasons"),
        name: v.string(),
        description: v.string(),
        completionRelic: v.object({
          name: v.string(),
          description: v.string(),
          luckBonus: v.number(),
          iconUrl: v.optional(v.string()),
        }),
      }),
      completedWizards: v.number(),
      totalWizards: v.number(),
      relicsEarned: v.number(),
      totalBattlesWon: v.number(),
    })
  ),
  handler: async (ctx, { userId }) => {
    // Get all archived seasons
    const archivedSeasons = await ctx.db
      .query("campaignSeasons")
      .withIndex("by_status", (q) => q.eq("status", "ARCHIVED"))
      .order("desc")
      .collect();

    const history = await Promise.all(
      archivedSeasons.map(async (season) => {
        const progress = await ctx.db
          .query("wizardCampaignProgress")
          .withIndex("by_season", (q) => q.eq("seasonId", season._id))
          .filter((q) => q.eq(q.field("userId"), userId))
          .collect();

        const completedWizards = progress.filter(
          (p) => p.hasCompletionRelic
        ).length;
        const totalWizards = progress.length;
        const relicsEarned = completedWizards;
        const totalBattlesWon = progress.reduce(
          (sum, p) => sum + p.defeatedOpponents.length,
          0
        );

        return {
          season: {
            _id: season._id,
            name: season.name,
            description: season.description,
            completionRelic: season.completionRelic,
          },
          completedWizards,
          totalWizards,
          relicsEarned,
          totalBattlesWon,
        };
      })
    );

    return history.filter((h) => h.totalWizards > 0); // Only return seasons user participated in
  },
});

/**
 * Create a default season (for initial setup)
 */
export const createDefaultSeason = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    seasonId: v.id("campaignSeasons"),
  }),
  handler: async (ctx) => {
    // Check admin access
    const adminAccess = await checkSuperAdminAccess(ctx);
    if (!adminAccess.hasAccess) {
      throw new Error("Access denied: Super admin privileges required");
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Check if default season already exists
    const existingDefault = await ctx.db
      .query("campaignSeasons")
      .withIndex("by_default", (q) => q.eq("isDefault", true))
      .first();

    if (existingDefault) {
      throw new Error("Default season already exists");
    }

    // Get all campaign opponents to use as default
    const campaignOpponents = await ctx.db
      .query("wizards")
      .withIndex("by_campaign_opponent", (q) =>
        q.eq("isCampaignOpponent", true)
      )
      .collect();

    // Sort by opponent number and get their IDs
    const sortedOpponents = campaignOpponents
      .filter((opponent) => opponent.opponentNumber !== undefined)
      .sort((a, b) => (a.opponentNumber || 0) - (b.opponentNumber || 0))
      .map((opponent) => opponent._id);

    if (sortedOpponents.length === 0) {
      throw new Error(
        "No campaign opponents found. Please create campaign opponents first."
      );
    }

    // Create a permanent default season
    const seasonId = await ctx.db.insert("campaignSeasons", {
      name: "Classic Campaign",
      description:
        "The original wizard campaign with classic opponents and the legendary Arcane Mastery relic.",
      status: "ACTIVE",
      completionRelic: {
        name: "Arcane Mastery",
        description:
          "A mystical relic that enhances your magical prowess, granting +1 luck in all future battles.",
        luckBonus: 1,
      },
      opponents: sortedOpponents,
      isDefault: true,
      createdAt: Date.now(),
      createdBy: identity.subject,
    });

    return {
      success: true,
      message: "Successfully created default season",
      seasonId,
    };
  },
});

/**
 * Internal function to create a default season for tests
 */
export const createDefaultSeasonInternal = internalMutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    seasonId: v.id("campaignSeasons"),
  }),
  handler: async (ctx) => {
    // Check if default season already exists
    const existingDefault = await ctx.db
      .query("campaignSeasons")
      .withIndex("by_default", (q) => q.eq("isDefault", true))
      .first();

    if (existingDefault) {
      return {
        success: true,
        message: "Default season already exists",
        seasonId: existingDefault._id,
      };
    }

    // Get all campaign opponents to use as default
    const campaignOpponents = await ctx.db
      .query("wizards")
      .withIndex("by_campaign_opponent", (q) =>
        q.eq("isCampaignOpponent", true)
      )
      .collect();

    // Sort by opponent number and get their IDs
    const sortedOpponents = campaignOpponents
      .filter((opponent) => opponent.opponentNumber !== undefined)
      .sort((a, b) => (a.opponentNumber || 0) - (b.opponentNumber || 0))
      .map((opponent) => opponent._id);

    if (sortedOpponents.length === 0) {
      // Return success but indicate no opponents available
      return {
        success: true,
        message: "Default season created but no opponents available",
        seasonId: "" as any, // This will be handled by the caller
      };
    }

    // Create a permanent default season
    const seasonId = await ctx.db.insert("campaignSeasons", {
      name: "Classic Campaign",
      description:
        "The original wizard campaign with classic opponents and the legendary Arcane Mastery relic.",
      status: "ACTIVE",
      completionRelic: {
        name: "Arcane Mastery",
        description:
          "A mystical relic that enhances your magical prowess, granting +1 luck in all future battles.",
        luckBonus: 1,
      },
      opponents: sortedOpponents,
      isDefault: true,
      createdAt: Date.now(),
      createdBy: "test-system",
    });

    return {
      success: true,
      message: "Successfully created default season",
      seasonId,
    };
  },
});
