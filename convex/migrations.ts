import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { checkSuperAdminAccess } from "./auth.utils";

/**
 * Migration: Add seasonId to existing campaign progress
 * This should be run once after deploying the season system
 */
export const migrateExistingCampaignProgress = internalMutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    migratedCount: v.number(),
  }),
  handler: async (ctx) => {
    // First, ensure there's a default season
    let defaultSeason = await ctx.db
      .query("campaignSeasons")
      .withIndex("by_default", (q) => q.eq("isDefault", true))
      .first();

    if (!defaultSeason) {
      // Create a default season
      const seasonId = await ctx.db.insert("campaignSeasons", {
        name: "Classic Campaign",
        description:
          "The original wizard campaign with classic opponents and the legendary Arcane Mastery relic.",
        startDate: Date.now() - 30 * 24 * 60 * 60 * 1000, // Started 30 days ago
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
        createdBy: "system",
      });

      defaultSeason = await ctx.db.get(seasonId);
    }

    if (!defaultSeason) {
      throw new Error("Failed to create or find default season");
    }

    // Find all campaign progress without seasonId
    const progressWithoutSeason = await ctx.db
      .query("wizardCampaignProgress")
      .filter((q) => q.eq(q.field("seasonId"), undefined))
      .collect();

    let migratedCount = 0;
    for (const progress of progressWithoutSeason) {
      await ctx.db.patch(progress._id, {
        seasonId: defaultSeason._id,
      });
      migratedCount++;
    }

    // Also migrate campaign battles without seasonId
    const battlesWithoutSeason = await ctx.db
      .query("campaignBattles")
      .filter((q) => q.eq(q.field("seasonId"), undefined))
      .collect();

    for (const battle of battlesWithoutSeason) {
      await ctx.db.patch(battle._id, {
        seasonId: defaultSeason._id,
      });
    }

    return {
      success: true,
      message: `Successfully migrated ${migratedCount} campaign progress records and ${battlesWithoutSeason.length} battle records to default season`,
      migratedCount: migratedCount + battlesWithoutSeason.length,
    };
  },
});
