import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

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

// Get a specific wizard by ID with string validation
export const getWizardSafe = query({
  args: { wizardId: v.string() },
  handler: async (ctx, { wizardId }) => {
    try {
      // Try to use the string as a Convex ID
      const id = wizardId as any; // Cast to bypass TypeScript validation
      return await ctx.db.get(id);
    } catch (error) {
      // If the ID is invalid, return null instead of throwing
      console.warn("Invalid wizard ID:", wizardId, error);
      return null;
    }
  },
});

// Create a new wizard
export const createWizard = mutation({
  args: {
    owner: v.string(),
    name: v.string(),
    description: v.string(),
  },
  handler: async (ctx, { owner, name, description }) => {
    const wizardId = await ctx.db.insert("wizards", {
      owner,
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
        0,
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
        0,
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

// Manually trigger illustration generation for a wizard
export const regenerateIllustration = mutation({
  args: { wizardId: v.id("wizards") },
  handler: async (ctx, { wizardId }) => {
    const wizard = await ctx.db.get(wizardId);
    if (!wizard) {
      throw new Error("Wizard not found");
    }

    // Schedule wizard illustration generation
    // Skip scheduling in test environment to avoid transaction escape errors
    if (process.env.NODE_ENV !== "test") {
      await ctx.scheduler.runAfter(
        0,
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

// Delete a wizard
export const deleteWizard = mutation({
  args: { wizardId: v.id("wizards") },
  handler: async (ctx, { wizardId }) => {
    const wizard = await ctx.db.get(wizardId);
    if (wizard) {
      await ctx.db.delete(wizardId);
    }
    // Silently succeed if wizard doesn't exist
  },
});
