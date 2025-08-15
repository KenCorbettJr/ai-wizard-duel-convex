import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Get all wizards for the authenticated user
export const getUserWizards = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    return await ctx.db
      .query("wizards")
      .withIndex("by_owner", (q) => q.eq("owner", identity.subject))
      .collect();
  },
});

// Get a specific wizard by ID (only if owned by authenticated user)
export const getWizard = query({
  args: { wizardId: v.id("wizards") },
  handler: async (ctx, { wizardId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const wizard = await ctx.db.get(wizardId);
    if (!wizard) {
      return null;
    }

    // Only return wizard if user owns it
    if (wizard.owner !== identity.subject) {
      throw new Error("Not authorized to access this wizard");
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
export const updateWizardStatsInternal = mutation({
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

// Get wizards defeated by a specific wizard (trophy hall) - only for owned wizards
export const getDefeatedWizards = query({
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

    // Only allow viewing trophy hall for owned wizards
    if (wizard.owner !== identity.subject) {
      throw new Error("Not authorized to view this wizard's trophy hall");
    }

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
      { wizard: any; defeatedAt: number }
    >();

    // Process each duel to get defeated wizards and their defeat dates
    for (const duel of completedDuels) {
      if (duel.losers) {
        for (const loserId of duel.losers) {
          const wizard = await ctx.db.get(loserId as unknown);
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
