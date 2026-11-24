import { query, internalQuery } from "./_generated/server";
import { pickSocialIllustration } from "./lib/socialIllustration";
import { v } from "convex/values";

// Get wizard data optimized for metadata generation
export const getWizardForMetadata = query({
  args: { wizardId: v.id("wizards") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("wizards"),
      _creationTime: v.number(),
      name: v.string(),
      description: v.string(),
      illustration: v.optional(v.string()),
      illustrationURL: v.optional(v.string()),
      wins: v.optional(v.number()),
      losses: v.optional(v.number()),
      winRate: v.number(),
      totalDuels: v.number(),
    }),
  ),
  handler: async (ctx, { wizardId }) => {
    const wizard = await ctx.db.get(wizardId);
    if (!wizard) {
      return null;
    }

    // Calculate win rate and total duels
    const wins = wizard.wins || 0;
    const losses = wizard.losses || 0;
    const totalDuels = wins + losses;
    const winRate = totalDuels > 0 ? wins / totalDuels : 0;

    return {
      _id: wizard._id,
      _creationTime: wizard._creationTime,
      name: wizard.name,
      description: wizard.description,
      illustration: wizard.illustration,
      illustrationURL: wizard.illustrationURL,
      wins,
      losses,
      winRate,
      totalDuels,
    };
  },
});

// Get duel data optimized for metadata generation
export const getDuelForMetadata = query({
  args: { duelId: v.id("duels") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("duels"),
      _creationTime: v.number(),
      status: v.union(
        v.literal("WAITING_FOR_PLAYERS"),
        v.literal("IN_PROGRESS"),
        v.literal("COMPLETED"),
        v.literal("CANCELLED"),
      ),
      currentRound: v.number(),
      numberOfRounds: v.union(v.number(), v.literal("TO_THE_DEATH")),
      wizards: v.array(
        v.object({
          _id: v.id("wizards"),
          name: v.string(),
          wins: v.optional(v.number()),
          losses: v.optional(v.number()),
          winRate: v.number(),
        }),
      ),
      winners: v.optional(v.array(v.id("wizards"))),
      losers: v.optional(v.array(v.id("wizards"))),
      featuredIllustration: v.optional(v.string()),
      socialIllustration: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, { duelId }) => {
    const duel = await ctx.db.get(duelId);
    if (!duel) {
      return null;
    }

    // Get wizard information for all participants
    const wizardData = await Promise.all(
      duel.wizards.map(async (wizardId) => {
        const wizard = await ctx.db.get(wizardId);
        if (!wizard) {
          throw new Error(`Wizard ${wizardId} not found`);
        }

        const wins = wizard.wins || 0;
        const losses = wizard.losses || 0;
        const totalDuels = wins + losses;
        const winRate = totalDuels > 0 ? wins / totalDuels : 0;

        return {
          _id: wizard._id,
          name: wizard.name,
          wins,
          losses,
          winRate,
        };
      }),
    );

    // A round illustration for link previews that doesn't spoil the ending
    let socialIllustration: string | undefined;
    if (duel.status === "IN_PROGRESS" || duel.status === "COMPLETED") {
      const rounds = await ctx.db
        .query("duelRounds")
        .withIndex("by_duel", (q) => q.eq("duelId", duelId))
        .collect();
      socialIllustration = pickSocialIllustration(duel.status, rounds);
    }

    return {
      _id: duel._id,
      _creationTime: duel._creationTime,
      status: duel.status,
      currentRound: duel.currentRound,
      numberOfRounds: duel.numberOfRounds,
      wizards: wizardData,
      winners: duel.winners,
      losers: duel.losers,
      // A finished duel's featured image is its final blow: keep it out of
      // link previews.
      featuredIllustration:
        duel.status === "COMPLETED" ? undefined : duel.featuredIllustration,
      socialIllustration,
    };
  },
});

// Internal query for metadata generation (bypasses auth for system use)
export const getWizardForMetadataInternal = internalQuery({
  args: { wizardId: v.id("wizards") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("wizards"),
      _creationTime: v.number(),
      name: v.string(),
      description: v.string(),
      illustration: v.optional(v.string()),
      illustrationURL: v.optional(v.string()),
      wins: v.optional(v.number()),
      losses: v.optional(v.number()),
      winRate: v.number(),
      totalDuels: v.number(),
    }),
  ),
  handler: async (ctx, { wizardId }) => {
    const wizard = await ctx.db.get(wizardId);
    if (!wizard) {
      return null;
    }

    // Calculate win rate and total duels
    const wins = wizard.wins || 0;
    const losses = wizard.losses || 0;
    const totalDuels = wins + losses;
    const winRate = totalDuels > 0 ? wins / totalDuels : 0;

    return {
      _id: wizard._id,
      _creationTime: wizard._creationTime,
      name: wizard.name,
      description: wizard.description,
      illustration: wizard.illustration,
      illustrationURL: wizard.illustrationURL,
      wins,
      losses,
      winRate,
      totalDuels,
    };
  },
});

// Internal query for duel metadata generation (bypasses auth for system use)
export const getDuelForMetadataInternal = internalQuery({
  args: { duelId: v.id("duels") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("duels"),
      _creationTime: v.number(),
      status: v.union(
        v.literal("WAITING_FOR_PLAYERS"),
        v.literal("IN_PROGRESS"),
        v.literal("COMPLETED"),
        v.literal("CANCELLED"),
      ),
      currentRound: v.number(),
      numberOfRounds: v.union(v.number(), v.literal("TO_THE_DEATH")),
      wizards: v.array(
        v.object({
          _id: v.id("wizards"),
          name: v.string(),
          wins: v.optional(v.number()),
          losses: v.optional(v.number()),
          winRate: v.number(),
        }),
      ),
      winners: v.optional(v.array(v.id("wizards"))),
      losers: v.optional(v.array(v.id("wizards"))),
      featuredIllustration: v.optional(v.string()),
      socialIllustration: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, { duelId }) => {
    const duel = await ctx.db.get(duelId);
    if (!duel) {
      return null;
    }

    // Get wizard information for all participants
    const wizardData = await Promise.all(
      duel.wizards.map(async (wizardId) => {
        const wizard = await ctx.db.get(wizardId);
        if (!wizard) {
          throw new Error(`Wizard ${wizardId} not found`);
        }

        const wins = wizard.wins || 0;
        const losses = wizard.losses || 0;
        const totalDuels = wins + losses;
        const winRate = totalDuels > 0 ? wins / totalDuels : 0;

        return {
          _id: wizard._id,
          name: wizard.name,
          wins,
          losses,
          winRate,
        };
      }),
    );

    // A round illustration for link previews that doesn't spoil the ending
    let socialIllustration: string | undefined;
    if (duel.status === "IN_PROGRESS" || duel.status === "COMPLETED") {
      const rounds = await ctx.db
        .query("duelRounds")
        .withIndex("by_duel", (q) => q.eq("duelId", duelId))
        .collect();
      socialIllustration = pickSocialIllustration(duel.status, rounds);
    }

    return {
      _id: duel._id,
      _creationTime: duel._creationTime,
      status: duel.status,
      currentRound: duel.currentRound,
      numberOfRounds: duel.numberOfRounds,
      wizards: wizardData,
      winners: duel.winners,
      losers: duel.losers,
      // A finished duel's featured image is its final blow: keep it out of
      // link previews.
      featuredIllustration:
        duel.status === "COMPLETED" ? undefined : duel.featuredIllustration,
      socialIllustration,
    };
  },
});

// Get optimized image URL from Convex storage
export const getOptimizedImageUrl = query({
  args: { storageId: v.string() },
  returns: v.union(v.null(), v.string()),
  handler: async (ctx, { storageId }) => {
    try {
      return await ctx.storage.getUrl(storageId);
    } catch (error) {
      console.warn("Failed to get image URL for storage ID:", storageId, error);
      return null;
    }
  },
});
