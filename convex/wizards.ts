import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all wizards for a specific user
export const getUserWizards = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("wizards")
      .withIndex("by_owner", (q) => q.eq("owner", userId))
      .collect();
  },
});

// Get a specific wizard by ID
export const getWizard = query({
  args: { wizardId: v.id("wizards") },
  handler: async (ctx, { wizardId }) => {
    return await ctx.db.get(wizardId);
  },
});

// Create a new wizard
export const createWizard = mutation({
  args: {
    owner: v.string(),
    name: v.string(),
    description: v.string(),
    illustrationURL: v.optional(v.string()),
    illustration: v.optional(v.string()),
    isAIPowered: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const wizardId = await ctx.db.insert("wizards", {
      ...args,
      wins: 0,
      losses: 0,
      illustrationVersion: 1,
    });
    return wizardId;
  },
});

// Update wizard stats after a battle
export const updateWizardStats = mutation({
  args: {
    wizardId: v.id("wizards"),
    won: v.boolean(),
  },
  handler: async (ctx, { wizardId, won }) => {
    const wizard = await ctx.db.get(wizardId);
    if (!wizard) {
      throw new Error("Wizard not found");
    }

    const currentWins = wizard.wins || 0;
    const currentLosses = wizard.losses || 0;

    await ctx.db.patch(wizardId, {
      wins: won ? currentWins + 1 : currentWins,
      losses: won ? currentLosses : currentLosses + 1,
    });
  },
});

// Update wizard details
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

// Delete a wizard
export const deleteWizard = mutation({
  args: { wizardId: v.id("wizards") },
  handler: async (ctx, { wizardId }) => {
    await ctx.db.delete(wizardId);
  },
});
