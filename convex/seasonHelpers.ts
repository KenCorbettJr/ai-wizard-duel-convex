import { GenericQueryCtx, GenericMutationCtx } from "convex/server";
import { DataModel, Id } from "./_generated/dataModel";

/**
 * Helper function to get the active campaign season without circular dependencies
 */
export async function getActiveCampaignSeasonHelper(
  ctx: GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>
): Promise<{
  _id: Id<"campaignSeasons">;
  _creationTime: number;
  name: string;
  description: string;
  status: "ACTIVE" | "ARCHIVED";
  completionRelic: {
    name: string;
    description: string;
    luckBonus: number;
    iconUrl?: string;
  };
  opponents: Id<"wizards">[];
  maxParticipants?: number;
  isDefault?: boolean;
  createdAt: number;
  createdBy: string;
} | null> {
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
}
