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
    startDate: v.number(),
    endDate: v.number(),
    completionRelic: v.object({
      name: v.string(),
      description: v.string(),
      luckBonus: v.number(),
      iconUrl: v.optional(v.string()),
    }),
    opponentSet: v.string(),
    maxParticipants: v.optional(v.number()),
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

    // Validate dates
    if (args.startDate >= args.endDate) {
      throw new Error("Start date must be before end date");
    }

    if (args.endDate <= Date.now()) {
      throw new Error("End date must be in the future");
    }

    // Determine status based on dates
    const now = Date.now();
    let status: "UPCOMING" | "ACTIVE" = "UPCOMING";
    if (args.startDate <= now && args.endDate > now) {
      status = "ACTIVE";
    }

    // Create the season
    const seasonId = await ctx.db.insert("campaignSeasons", {
      name: args.name,
      description: args.description,
      startDate: args.startDate,
      endDate: args.endDate,
      status,
      completionRelic: args.completionRelic,
      opponentSet: args.opponentSet,
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
      startDate: v.number(),
      endDate: v.number(),
      status: v.union(
        v.literal("UPCOMING"),
        v.literal("ACTIVE"),
        v.literal("COMPLETED"),
        v.literal("ARCHIVED")
      ),
      completionRelic: v.object({
        name: v.string(),
        description: v.string(),
        luckBonus: v.number(),
        iconUrl: v.optional(v.string()),
      }),
      opponentSet: v.string(),
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
      startDate: v.number(),
      endDate: v.number(),
      status: v.union(
        v.literal("UPCOMING"),
        v.literal("ACTIVE"),
        v.literal("COMPLETED"),
        v.literal("ARCHIVED")
      ),
      completionRelic: v.object({
        name: v.string(),
        description: v.string(),
        luckBonus: v.number(),
        iconUrl: v.optional(v.string()),
      }),
      opponentSet: v.string(),
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
      startDate: v.number(),
      endDate: v.number(),
      status: v.union(
        v.literal("UPCOMING"),
        v.literal("ACTIVE"),
        v.literal("COMPLETED"),
        v.literal("ARCHIVED")
      ),
      completionRelic: v.object({
        name: v.string(),
        description: v.string(),
        luckBonus: v.number(),
        iconUrl: v.optional(v.string()),
      }),
      opponentSet: v.string(),
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
 * Update season status (internal function for scheduled updates)
 */
export const updateSeasonStatuses = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();

    // Get all seasons that might need status updates
    const seasons = await ctx.db
      .query("campaignSeasons")
      .filter((q) => q.neq(q.field("status"), "ARCHIVED"))
      .collect();

    for (const season of seasons) {
      let newStatus = season.status;

      // Update status based on current time
      if (
        season.status === "UPCOMING" &&
        season.startDate <= now &&
        season.endDate > now
      ) {
        newStatus = "ACTIVE";
      } else if (season.status === "ACTIVE" && season.endDate <= now) {
        newStatus = "COMPLETED";
      }

      // Update if status changed
      if (newStatus !== season.status) {
        await ctx.db.patch(season._id, { status: newStatus });
      }
    }

    return null;
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
      startDate: v.optional(v.number()),
      endDate: v.optional(v.number()),
      status: v.optional(
        v.union(
          v.literal("UPCOMING"),
          v.literal("ACTIVE"),
          v.literal("COMPLETED"),
          v.literal("ARCHIVED")
        )
      ),
      completionRelic: v.optional(
        v.object({
          name: v.string(),
          description: v.string(),
          luckBonus: v.number(),
          iconUrl: v.optional(v.string()),
        })
      ),
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

    // Validate date updates if provided
    if (args.updates.startDate || args.updates.endDate) {
      const startDate = args.updates.startDate || season.startDate;
      const endDate = args.updates.endDate || season.endDate;

      if (startDate >= endDate) {
        throw new Error("Start date must be before end date");
      }
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
 * Archive a completed season (super admin only)
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

    if (season.status !== "COMPLETED") {
      throw new Error("Can only archive completed seasons");
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
        startDate: v.number(),
        endDate: v.number(),
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
      timeRemaining: v.number(),
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

    const timeRemaining = Math.max(0, activeSeason.endDate - Date.now());

    return {
      season: {
        _id: activeSeason._id,
        name: activeSeason.name,
        description: activeSeason.description,
        startDate: activeSeason.startDate,
        endDate: activeSeason.endDate,
        completionRelic: activeSeason.completionRelic,
      },
      progress,
      timeRemaining,
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
        startDate: v.number(),
        endDate: v.number(),
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
    // Get all completed seasons
    const completedSeasons = await ctx.db
      .query("campaignSeasons")
      .filter((q) => q.eq(q.field("status"), "COMPLETED"))
      .order("desc")
      .collect();

    const history = await Promise.all(
      completedSeasons.map(async (season) => {
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
            startDate: season.startDate,
            endDate: season.endDate,
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

    // Create a permanent default season
    const seasonId = await ctx.db.insert("campaignSeasons", {
      name: "Classic Campaign",
      description:
        "The original wizard campaign with classic opponents and the legendary Arcane Mastery relic.",
      startDate: Date.now() - 86400000, // Started yesterday
      endDate: Date.now() + 365 * 24 * 60 * 60 * 1000, // Ends in 1 year
      status: "ACTIVE",
      completionRelic: {
        name: "Arcane Mastery",
        description:
          "A mystical relic that enhances your magical prowess, granting +1 luck in all future battles.",
        luckBonus: 1,
      },
      opponentSet: "classic",
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

    // Create a permanent default season
    const seasonId = await ctx.db.insert("campaignSeasons", {
      name: "Classic Campaign",
      description:
        "The original wizard campaign with classic opponents and the legendary Arcane Mastery relic.",
      startDate: Date.now() - 86400000, // Started yesterday
      endDate: Date.now() + 365 * 24 * 60 * 60 * 1000, // Ends in 1 year
      status: "ACTIVE",
      completionRelic: {
        name: "Arcane Mastery",
        description:
          "A mystical relic that enhances your magical prowess, granting +1 luck in all future battles.",
        luckBonus: 1,
      },
      opponentSet: "classic",
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
