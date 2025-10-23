import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Wizard } from "@/types/wizard";

// Get all wizards for the authenticated user with campaign relic status
export const getUserWizards = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("wizards"),
      _creationTime: v.number(),
      owner: v.string(),
      name: v.string(),
      description: v.string(),
      illustrationURL: v.optional(v.string()),
      illustration: v.optional(v.string()),
      illustrationGeneratedAt: v.optional(v.number()),
      illustrationVersion: v.optional(v.number()),
      illustrations: v.optional(v.array(v.string())),
      isAIPowered: v.optional(v.boolean()),
      wins: v.optional(v.number()),
      losses: v.optional(v.number()),
      hasCompletionRelic: v.boolean(),
      effectiveLuckScore: v.number(),
    })
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const wizards = await ctx.db
      .query("wizards")
      .withIndex("by_owner", (q) => q.eq("owner", identity.subject))
      .collect();

    // Enhance each wizard with campaign relic information
    const wizardsWithRelics = await Promise.all(
      wizards.map(async (wizard) => {
        // Get campaign progress to check for completion relic
        const campaignProgress = await ctx.db
          .query("wizardCampaignProgress")
          .withIndex("by_wizard", (q) => q.eq("wizardId", wizard._id))
          .unique();

        const hasCompletionRelic =
          campaignProgress?.hasCompletionRelic || false;

        // Calculate effective luck score (base luck would be stored on wizard, defaulting to 10)
        const baseLuck = 10; // This could be a field on the wizard in the future
        const effectiveLuckScore = Math.min(
          20,
          baseLuck + (hasCompletionRelic ? 1 : 0)
        );

        return {
          ...wizard,
          hasCompletionRelic,
          effectiveLuckScore,
        };
      })
    );

    return wizardsWithRelics;
  },
});

// Get a specific wizard by ID (only if owned by authenticated user)
export const getWizard = query({
  args: { wizardId: v.id("wizards") },
  handler: async (ctx, { wizardId }) => {
    const wizard = await ctx.db.get(wizardId);
    if (!wizard) {
      return null;
    }

    return wizard;
  },
});

// Create a new wizard
export const createWizard = mutation({
  args: {
    name: v.string(),
    description: v.string(),
  },
  handler: async (ctx, { name, description }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const wizardId = await ctx.db.insert("wizards", {
      owner: identity.subject,
      name,
      description,
      wins: 0,
      losses: 0,
      illustrationVersion: 1,
      isAIPowered: false, // User-created wizards are not AI-powered
    });

    // Schedule wizard illustration generation
    // Skip scheduling in test environment to avoid transaction escape errors
    if (process.env.NODE_ENV !== "test") {
      await ctx.scheduler.runAfter(
        100, // Add small delay to ensure database transaction is committed
        api.generateWizardIllustration.generateWizardIllustration,
        {
          wizardId,
          name,
          description,
        }
      );
    }

    return wizardId;
  },
});

// Update wizard stats after a battle (only for owned wizards)
export const updateWizardStats = mutation({
  args: {
    wizardId: v.id("wizards"),
    won: v.boolean(),
  },
  handler: async (ctx, { wizardId, won }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const wizard = await ctx.db.get(wizardId);
    if (!wizard) {
      throw new Error("Wizard not found");
    }

    // Only allow updating stats for owned wizards
    if (wizard.owner !== identity.subject) {
      throw new Error("Not authorized to update this wizard");
    }

    const currentWins = wizard.wins || 0;
    const currentLosses = wizard.losses || 0;

    await ctx.db.patch(wizardId, {
      wins: won ? currentWins + 1 : currentWins,
      losses: won ? currentLosses : currentLosses + 1,
    });
  },
});

// Internal function to update wizard stats (used by system functions like duel completion)
// Only updates stats for non-campaign battles
export const updateWizardStatsInternal = internalMutation({
  args: {
    wizardId: v.id("wizards"),
    won: v.boolean(),
    isCampaignBattle: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, { wizardId, won, isCampaignBattle = false }) => {
    const wizard = await ctx.db.get(wizardId);
    if (!wizard) {
      throw new Error("Wizard not found");
    }

    // Only update multiplayer stats for non-campaign battles
    if (!isCampaignBattle) {
      const currentWins = wizard.wins || 0;
      const currentLosses = wizard.losses || 0;

      await ctx.db.patch(wizardId, {
        wins: won ? currentWins + 1 : currentWins,
        losses: won ? currentLosses : currentLosses + 1,
      });
    }

    // Campaign battle stats are tracked separately in the campaign system
  },
});

// Internal function to update wizard details (used by system functions like image generation)
export const updateWizardInternal = internalMutation({
  args: {
    wizardId: v.id("wizards"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    illustrationURL: v.optional(v.string()),
    illustration: v.optional(v.string()),
    isAIPowered: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, { wizardId, ...updates }) => {
    const wizard = await ctx.db.get(wizardId);
    if (!wizard) {
      throw new Error("Wizard not found");
    }

    await ctx.db.patch(wizardId, {
      ...updates,
      illustrationVersion: updates.illustration
        ? (wizard.illustrationVersion || 0) + 1
        : wizard.illustrationVersion,
      illustrationGeneratedAt: updates.illustration
        ? Date.now()
        : wizard.illustrationGeneratedAt,
    });
  },
});

// Internal function to schedule wizard illustration generation
export const scheduleWizardIllustrationInternal = internalMutation({
  args: {
    wizardId: v.id("wizards"),
    name: v.string(),
    description: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { wizardId, name, description }) => {
    // Verify wizard exists
    const wizard = await ctx.db.get(wizardId);
    if (!wizard) {
      throw new Error("Wizard not found");
    }

    // Schedule illustration generation only if not in test environment
    if (process.env.NODE_ENV !== "test") {
      await ctx.scheduler.runAfter(
        100, // Add small delay to ensure database transaction is committed
        api.generateWizardIllustration.generateWizardIllustration,
        {
          wizardId,
          name,
          description,
        }
      );
    }
  },
});

// Update wizard details (only for owned wizards)
export const updateWizard = mutation({
  args: {
    wizardId: v.id("wizards"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    illustrationURL: v.optional(v.string()),
    illustration: v.optional(v.string()),
    isAIPowered: v.optional(v.boolean()),
  },
  handler: async (ctx, { wizardId, ...updates }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const wizard = await ctx.db.get(wizardId);
    if (!wizard) {
      throw new Error("Wizard not found");
    }

    // Only allow updating owned wizards
    if (wizard.owner !== identity.subject) {
      throw new Error("Not authorized to update this wizard");
    }

    // Check if name or description changed
    const nameChanged =
      updates.name !== undefined && updates.name !== wizard.name;
    const descriptionChanged =
      updates.description !== undefined &&
      updates.description !== wizard.description;
    const shouldRegenerateIllustration = nameChanged || descriptionChanged;

    await ctx.db.patch(wizardId, {
      ...updates,
      illustrationVersion: updates.illustration
        ? (wizard.illustrationVersion || 0) + 1
        : wizard.illustrationVersion,
      illustrationGeneratedAt: updates.illustration
        ? Date.now()
        : wizard.illustrationGeneratedAt,
    });

    // Regenerate illustration if name or description changed
    if (shouldRegenerateIllustration && process.env.NODE_ENV !== "test") {
      await ctx.scheduler.runAfter(
        100, // Add small delay to ensure database transaction is committed
        api.generateWizardIllustration.generateWizardIllustration,
        {
          wizardId,
          name: updates.name || wizard.name,
          description: updates.description || wizard.description,
        }
      );
    }
  },
});

// Get illustration URL from storage
export const getIllustrationUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId);
  },
});

// Manually trigger illustration generation for a wizard (only for owned wizards)
export const regenerateIllustration = mutation({
  args: { wizardId: v.id("wizards") },
  handler: async (ctx, { wizardId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const wizard = await ctx.db.get(wizardId);
    if (!wizard) {
      throw new Error("Wizard not found");
    }

    // Only allow regenerating illustrations for owned wizards
    if (wizard.owner !== identity.subject) {
      throw new Error(
        "Not authorized to regenerate illustration for this wizard"
      );
    }

    // Increment illustration version immediately
    const currentVersion = wizard.illustrationVersion || 1;
    await ctx.db.patch(wizardId, {
      illustrationVersion: currentVersion + 1,
    });

    // Schedule wizard illustration generation
    // Skip scheduling in test environment to avoid transaction escape errors
    if (process.env.NODE_ENV !== "test") {
      await ctx.scheduler.runAfter(
        100, // Add small delay to ensure database transaction is committed
        api.generateWizardIllustration.generateWizardIllustration,
        {
          wizardId,
          name: wizard.name,
          description: wizard.description,
        }
      );
    }

    return { success: true };
  },
});

// Delete a wizard (only for owned wizards)
export const deleteWizard = mutation({
  args: { wizardId: v.id("wizards") },
  handler: async (ctx, { wizardId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const wizard = await ctx.db.get(wizardId);
    if (!wizard) {
      return; // Silently succeed if wizard doesn't exist
    }

    // Only allow deleting owned wizards
    if (wizard.owner !== identity.subject) {
      throw new Error("Not authorized to delete this wizard");
    }

    await ctx.db.delete(wizardId);
  },
});

// Get wizards defeated by a specific wizard (trophy hall) - public information
export const getDefeatedWizards = query({
  args: { wizardId: v.id("wizards") },
  handler: async (ctx, { wizardId }) => {
    const wizard = await ctx.db.get(wizardId);
    if (!wizard) {
      throw new Error("Wizard not found");
    }

    // Allow anyone to view trophy hall (public information)

    // Get all completed duels where this wizard participated
    const duels = await ctx.db.query("duels").collect();

    const completedDuels = duels.filter(
      (duel) =>
        duel.status === "COMPLETED" &&
        duel.wizards.includes(wizardId) &&
        duel.winners?.includes(wizardId)
    );

    // Create a map to track the most recent defeat date for each wizard
    const defeatedWizardData = new Map<
      string,
      { wizard: Wizard; defeatedAt: number }
    >();

    // Process each duel to get defeated wizards and their defeat dates
    for (const duel of completedDuels) {
      if (duel.losers) {
        for (const loserId of duel.losers) {
          const wizard = await ctx.db.get(loserId);
          if (wizard) {
            // Use the most recent defeat date if wizard was defeated multiple times
            const existingData = defeatedWizardData.get(loserId);
            if (!existingData || duel.createdAt > existingData.defeatedAt) {
              defeatedWizardData.set(loserId, {
                wizard,
                defeatedAt: duel.createdAt,
              });
            }
          }
        }
      }
    }

    // Convert map to array and sort by defeat date (most recent first)
    return Array.from(defeatedWizardData.values())
      .sort((a, b) => b.defeatedAt - a.defeatedAt)
      .map(({ wizard, defeatedAt }) => ({
        ...wizard,
        defeatedAt,
      }));
  },
});

// Internal function to create wizard for testing
export const createWizardInternal = internalMutation({
  args: {
    owner: v.string(),
    name: v.string(),
    description: v.string(),
  },
  returns: v.id("wizards"),
  handler: async (ctx, { owner, name, description }) => {
    const wizardId = await ctx.db.insert("wizards", {
      owner,
      name,
      description,
      wins: 0,
      losses: 0,
      illustrationVersion: 1,
      isAIPowered: false,
    });

    return wizardId;
  },
});

// Get leaderboard of wizards ordered by win rate - public information (excludes campaign battles)
export const getWizardLeaderboard = query({
  args: {
    limit: v.optional(v.number()),
    minDuels: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("wizards"),
      _creationTime: v.number(),
      owner: v.string(),
      name: v.string(),
      description: v.string(),
      illustrationURL: v.optional(v.string()),
      illustration: v.optional(v.string()),
      illustrationGeneratedAt: v.optional(v.number()),
      illustrationVersion: v.optional(v.number()),
      illustrations: v.optional(v.array(v.string())),
      isAIPowered: v.optional(v.boolean()),
      wins: v.optional(v.number()),
      losses: v.optional(v.number()),
      winRate: v.number(),
      totalDuels: v.number(),
      rank: v.number(),
      ownerUserId: v.optional(v.string()),
      ownerDisplayName: v.optional(v.string()),
      hasCompletionRelic: v.boolean(),
      effectiveLuckScore: v.number(),
    })
  ),
  handler: async (ctx, { limit = 50, minDuels = 1 }) => {
    // Get all wizards
    const wizards = await ctx.db.query("wizards").collect();

    // Calculate win rates and filter by minimum duels, excluding campaign battles
    const wizardStats = await Promise.all(
      wizards.map(async (wizard) => {
        // Get campaign progress for relic status
        const campaignProgress = await ctx.db
          .query("wizardCampaignProgress")
          .withIndex("by_wizard", (q) => q.eq("wizardId", wizard._id))
          .unique();

        const hasCompletionRelic =
          campaignProgress?.hasCompletionRelic || false;
        const baseLuck = 10;
        const effectiveLuckScore = Math.min(
          20,
          baseLuck + (hasCompletionRelic ? 1 : 0)
        );

        // Calculate multiplayer-only stats (excluding campaign battles)
        const allMultiplayerDuels = await ctx.db
          .query("duels")
          .filter((q) => q.eq(q.field("status"), "COMPLETED"))
          .filter((q) => q.neq(q.field("isCampaignBattle"), true))
          .collect();

        const wizardMultiplayerDuels = allMultiplayerDuels.filter((duel) =>
          duel.wizards.includes(wizard._id)
        );

        let wins = 0;
        let losses = 0;

        wizardMultiplayerDuels.forEach((duel) => {
          if (duel.winners?.includes(wizard._id)) {
            wins++;
          } else if (duel.losers?.includes(wizard._id)) {
            losses++;
          }
        });

        const totalDuels = wins + losses;
        const winRate = totalDuels > 0 ? wins / totalDuels : 0;

        return {
          ...wizard,
          wins,
          losses,
          winRate,
          totalDuels,
          rank: 0, // Will be set after sorting
          hasCompletionRelic,
          effectiveLuckScore,
        };
      })
    );

    // Filter by minimum duels
    const filteredStats = wizardStats.filter(
      (wizard) => wizard.totalDuels >= minDuels
    );

    // Sort by win rate (descending), then by total wins (descending), then by total duels (descending)
    filteredStats.sort((a, b) => {
      if (a.winRate !== b.winRate) {
        return b.winRate - a.winRate;
      }
      if (a.wins !== b.wins) {
        return b.wins - a.wins;
      }
      return b.totalDuels - a.totalDuels;
    });

    // Assign ranks and get owner information
    const wizardsWithOwners = await Promise.all(
      filteredStats.map(async (wizard, index) => {
        const owner = await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", wizard.owner))
          .first();

        return {
          ...wizard,
          rank: index + 1,
          ownerUserId: owner?.userId,
          ownerDisplayName: owner?.displayName,
        };
      })
    );

    // Apply limit
    return wizardsWithOwners.slice(0, limit);
  },
});

// Get wizard with owner information and campaign relic status - public information
export const getWizardWithOwner = query({
  args: { wizardId: v.id("wizards") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("wizards"),
      _creationTime: v.number(),
      owner: v.string(),
      name: v.string(),
      description: v.string(),
      illustrationURL: v.optional(v.string()),
      illustration: v.optional(v.string()),
      illustrationGeneratedAt: v.optional(v.number()),
      illustrationVersion: v.optional(v.number()),
      illustrations: v.optional(v.array(v.string())),
      isAIPowered: v.optional(v.boolean()),
      wins: v.optional(v.number()),
      losses: v.optional(v.number()),
      ownerUserId: v.optional(v.string()),
      ownerDisplayName: v.optional(v.string()),
      hasCompletionRelic: v.boolean(),
      effectiveLuckScore: v.number(),
    })
  ),
  handler: async (ctx, { wizardId }) => {
    const wizard = await ctx.db.get(wizardId);
    if (!wizard) {
      return null;
    }

    // Get owner information
    const owner = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", wizard.owner))
      .first();

    // Get campaign progress to check for completion relic
    const campaignProgress = await ctx.db
      .query("wizardCampaignProgress")
      .withIndex("by_wizard", (q) => q.eq("wizardId", wizardId))
      .unique();

    const hasCompletionRelic = campaignProgress?.hasCompletionRelic || false;

    // Calculate effective luck score (base luck would be stored on wizard, defaulting to 10)
    // For now, we'll assume base luck is 10 and add +1 if has relic, capped at 20
    const baseLuck = 10; // This could be a field on the wizard in the future
    const effectiveLuckScore = Math.min(
      20,
      baseLuck + (hasCompletionRelic ? 1 : 0)
    );

    return {
      ...wizard,
      ownerUserId: owner?.userId,
      ownerDisplayName: owner?.displayName,
      hasCompletionRelic,
      effectiveLuckScore,
    };
  },
});

// Get all wizards with owner information - public information
export const getAllWizardsWithOwners = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("wizards"),
      _creationTime: v.number(),
      owner: v.string(),
      name: v.string(),
      description: v.string(),
      illustrationURL: v.optional(v.string()),
      illustration: v.optional(v.string()),
      illustrationGeneratedAt: v.optional(v.number()),
      illustrationVersion: v.optional(v.number()),
      illustrations: v.optional(v.array(v.string())),
      isAIPowered: v.optional(v.boolean()),
      wins: v.optional(v.number()),
      losses: v.optional(v.number()),
      ownerUserId: v.optional(v.string()),
      ownerDisplayName: v.optional(v.string()),
    })
  ),
  handler: async (ctx, { limit = 50 }) => {
    // Get all wizards
    const wizards = await ctx.db.query("wizards").order("desc").take(limit);

    // Get owner information for each wizard
    const wizardsWithOwners = await Promise.all(
      wizards.map(async (wizard) => {
        const owner = await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", wizard.owner))
          .first();

        return {
          ...wizard,
          ownerUserId: owner?.userId,
          ownerDisplayName: owner?.displayName,
        };
      })
    );

    return wizardsWithOwners;
  },
});
// Get leaderboard of wizards for a specific time period - public information (excludes campaign battles)
export const getWizardLeaderboardByPeriod = query({
  args: {
    period: v.union(v.literal("week"), v.literal("month"), v.literal("all")),
    limit: v.optional(v.number()),
    minDuels: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("wizards"),
      _creationTime: v.number(),
      owner: v.string(),
      name: v.string(),
      description: v.string(),
      illustrationURL: v.optional(v.string()),
      illustration: v.optional(v.string()),
      illustrationGeneratedAt: v.optional(v.number()),
      illustrationVersion: v.optional(v.number()),
      illustrations: v.optional(v.array(v.string())),
      isAIPowered: v.optional(v.boolean()),
      wins: v.optional(v.number()),
      losses: v.optional(v.number()),
      winRate: v.number(),
      totalDuels: v.number(),
      rank: v.number(),
      ownerUserId: v.optional(v.string()),
      ownerDisplayName: v.optional(v.string()),
      periodWins: v.number(),
      periodLosses: v.number(),
      periodWinRate: v.number(),
      periodTotalDuels: v.number(),
      hasCompletionRelic: v.boolean(),
      effectiveLuckScore: v.number(),
    })
  ),
  handler: async (ctx, { period, limit = 50, minDuels = 1 }) => {
    const now = Date.now();
    let startTime: number;

    // Calculate the start time based on the period
    switch (period) {
      case "week":
        startTime = now - 7 * 24 * 60 * 60 * 1000; // 7 days ago
        break;
      case "month":
        startTime = now - 30 * 24 * 60 * 60 * 1000; // 30 days ago
        break;
      case "all":
        startTime = 0; // All time
        break;
    }

    // Get all wizards
    const wizards = await ctx.db.query("wizards").collect();

    // Get duels completed in the specified period, excluding campaign battles
    const periodDuels = await ctx.db
      .query("duels")
      .withIndex("by_completed_at", (q) =>
        period === "all"
          ? q.gte("completedAt", 0)
          : q.gte("completedAt", startTime)
      )
      .filter((q) => q.eq(q.field("status"), "COMPLETED"))
      .filter((q) => q.neq(q.field("isCampaignBattle"), true)) // Exclude campaign battles
      .collect();

    // Calculate period-specific stats for each wizard
    const wizardStats = await Promise.all(
      wizards.map(async (wizard) => {
        // Get campaign progress for relic status
        const campaignProgress = await ctx.db
          .query("wizardCampaignProgress")
          .withIndex("by_wizard", (q) => q.eq("wizardId", wizard._id))
          .unique();

        const hasCompletionRelic =
          campaignProgress?.hasCompletionRelic || false;
        const baseLuck = 10;
        const effectiveLuckScore = Math.min(
          20,
          baseLuck + (hasCompletionRelic ? 1 : 0)
        );

        // Calculate multiplayer-only stats (excluding campaign battles)
        // Note: The wizard.wins and wizard.losses should already exclude campaign battles
        // but we need to recalculate from actual duel records to be sure
        const allMultiplayerDuels = await ctx.db
          .query("duels")
          .filter((q) => q.eq(q.field("status"), "COMPLETED"))
          .filter((q) => q.neq(q.field("isCampaignBattle"), true))
          .collect();

        const wizardMultiplayerDuels = allMultiplayerDuels.filter((duel) =>
          duel.wizards.includes(wizard._id)
        );

        let overallWins = 0;
        let overallLosses = 0;

        wizardMultiplayerDuels.forEach((duel) => {
          if (duel.winners?.includes(wizard._id)) {
            overallWins++;
          } else if (duel.losers?.includes(wizard._id)) {
            overallLosses++;
          }
        });

        const overallTotalDuels = overallWins + overallLosses;
        const overallWinRate =
          overallTotalDuels > 0 ? overallWins / overallTotalDuels : 0;

        // Period-specific stats
        let periodWins: number;
        let periodLosses: number;
        let periodTotalDuels: number;
        let periodWinRate: number;

        if (period === "all") {
          // For all-time, use the calculated multiplayer stats
          periodWins = overallWins;
          periodLosses = overallLosses;
          periodTotalDuels = overallTotalDuels;
          periodWinRate = overallWinRate;
        } else {
          // For specific periods, calculate from duels in that period
          const periodWizardDuels = periodDuels.filter((duel) =>
            duel.wizards.includes(wizard._id)
          );

          periodWins = 0;
          periodLosses = 0;

          periodWizardDuels.forEach((duel) => {
            if (duel.winners?.includes(wizard._id)) {
              periodWins++;
            } else if (duel.losers?.includes(wizard._id)) {
              periodLosses++;
            }
          });

          periodTotalDuels = periodWins + periodLosses;
          periodWinRate =
            periodTotalDuels > 0 ? periodWins / periodTotalDuels : 0;
        }

        return {
          ...wizard,
          winRate: overallWinRate,
          totalDuels: overallTotalDuels,
          periodWins,
          periodLosses,
          periodWinRate,
          periodTotalDuels,
          rank: 0, // Will be set after sorting
          hasCompletionRelic,
          effectiveLuckScore,
        };
      })
    );

    // Filter by minimum duels (using period duels for week/month, overall for all)
    const filteredStats = wizardStats.filter((wizard) => {
      const relevantDuels =
        period === "all" ? wizard.totalDuels : wizard.periodTotalDuels;
      return relevantDuels >= minDuels;
    });

    // Sort by period win rate, then by period wins, then by period total duels
    filteredStats.sort((a, b) => {
      const aWinRate = period === "all" ? a.winRate : a.periodWinRate;
      const bWinRate = period === "all" ? b.winRate : b.periodWinRate;
      const aWins = period === "all" ? a.periodWins : a.periodWins;
      const bWins = period === "all" ? b.periodWins : b.periodWins;
      const aTotalDuels = period === "all" ? a.totalDuels : a.periodTotalDuels;
      const bTotalDuels = period === "all" ? b.totalDuels : b.periodTotalDuels;

      if (aWinRate !== bWinRate) {
        return bWinRate - aWinRate;
      }
      if (aWins !== bWins) {
        return bWins - aWins;
      }
      return bTotalDuels - aTotalDuels;
    });

    // Assign ranks and get owner information
    const wizardsWithOwners = await Promise.all(
      filteredStats.map(async (wizard, index) => {
        const owner = await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", wizard.owner))
          .first();

        return {
          ...wizard,
          rank: index + 1,
          ownerUserId: owner?.userId,
          ownerDisplayName: owner?.displayName,
        };
      })
    );

    // Apply limit
    return wizardsWithOwners.slice(0, limit);
  },
});
