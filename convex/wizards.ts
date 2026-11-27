import {
  query,
  mutation,
  internalMutation,
  internalQuery,
  type QueryCtx,
  type MutationCtx,
} from "./_generated/server";
import { ConvexError, v, type Infer } from "convex/values";
import { activePortraitStage, portraitRedrawValidator } from "./lib/portrait";
import { api } from "./_generated/api";
import {
  chargeWizardImageToken,
  hasWizardImageToken,
} from "./lib/wizardImageTokens";
import { Wizard } from "@/types/wizard";
import { computeWinRate, recordWizardResult } from "./lib/wizardStats";
import { DEPARTED_OWNER } from "./lib/departed";
import { labelDuplicateNames, normalizeWizardName } from "./lib/wizardNames";
import type { Doc, Id } from "./_generated/dataModel";

/**
 * The owner's other wizard already using this name, if any. Names only need
 * to be unique within one player's roster; different players may share them.
 */
async function findOwnWizardNamed(
  ctx: QueryCtx,
  owner: string,
  name: string,
  exceptId?: Id<"wizards">,
) {
  const wanted = normalizeWizardName(name);
  const mine = await ctx.db
    .query("wizards")
    .withIndex("by_owner", (q) => q.eq("owner", owner))
    .collect();
  return mine.find(
    (w) => w._id !== exceptId && normalizeWizardName(w.name) === wanted,
  );
}

async function assertWizardNameFree(
  ctx: QueryCtx,
  owner: string,
  name: string,
  exceptId?: Id<"wizards">,
) {
  const clash = await findOwnWizardNamed(ctx, owner, name, exceptId);
  if (clash) {
    throw new ConvexError(
      `You already have a wizard named "${clash.name}". Pick a different name.`,
    );
  }
}

/**
 * Lets the Watcher reject a duplicate name before paying for AI moderation.
 * The create/update mutations check again, since they're authoritative.
 */
export const assertNameFreeForOwner = internalQuery({
  args: {
    owner: v.string(),
    name: v.string(),
    exceptId: v.optional(v.id("wizards")),
  },
  returns: v.null(),
  handler: async (ctx, { owner, name, exceptId }) => {
    // Keeping a wizard's current name is never a clash (see updateWizard).
    const current = exceptId ? await ctx.db.get(exceptId) : null;
    if (
      current &&
      normalizeWizardName(current.name) === normalizeWizardName(name)
    ) {
      return null;
    }
    await assertWizardNameFree(ctx, owner, name, exceptId);
    return null;
  },
});

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
      plainIllustration: v.optional(v.string()), // Convex storage ID: wizard on a plain background (reference for scene generation)
      illustrationVersion: v.optional(v.number()),
      illustrationStatus: v.optional(
        v.union(
          v.literal("sketching"),
          v.literal("painting"),
          v.literal("failed"),
        ),
      ),
      illustrationRequestedAt: v.optional(v.number()),
      illustrations: v.optional(v.array(v.string())),
      isAIPowered: v.optional(v.boolean()),
      wins: v.optional(v.number()),
      losses: v.optional(v.number()),
      hasCompletionRelic: v.boolean(),
      effectiveLuckScore: v.number(),
      // Campaign opponent fields
      isCampaignOpponent: v.optional(v.boolean()),
      opponentNumber: v.optional(v.number()),
      personalityTraits: v.optional(v.array(v.string())),
      spellStyle: v.optional(v.string()),
      difficulty: v.optional(v.string()),
      luckModifier: v.optional(v.number()),
      illustrationPrompt: v.optional(v.string()),
    }),
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
          baseLuck + (hasCompletionRelic ? 1 : 0),
        );

        return {
          ...wizard,
          hasCompletionRelic,
          effectiveLuckScore,
        };
      }),
    );

    return wizardsWithRelics;
  },
});

// Get a specific wizard by ID (only if owned by authenticated user)
export const getWizard = query({
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
      plainIllustration: v.optional(v.string()), // Convex storage ID: wizard on a plain background (reference for scene generation)
      illustrationVersion: v.optional(v.number()),
      illustrationStatus: v.optional(
        v.union(
          v.literal("sketching"),
          v.literal("painting"),
          v.literal("failed"),
        ),
      ),
      illustrationRequestedAt: v.optional(v.number()),
      illustrations: v.optional(v.array(v.string())),
      isAIPowered: v.optional(v.boolean()),
      wins: v.optional(v.number()),
      losses: v.optional(v.number()),
      hasCompletionRelic: v.boolean(),
      effectiveLuckScore: v.number(),
      // Campaign opponent fields
      isCampaignOpponent: v.optional(v.boolean()),
      opponentNumber: v.optional(v.number()),
      personalityTraits: v.optional(v.array(v.string())),
      spellStyle: v.optional(v.string()),
      difficulty: v.optional(v.string()),
      luckModifier: v.optional(v.number()),
      illustrationPrompt: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, { wizardId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const wizard = await ctx.db.get(wizardId);
    if (!wizard) {
      return null;
    }

    // Only return wizard if owned by authenticated user
    if (wizard.owner !== identity.subject) {
      return null;
    }

    // Get campaign progress to check for completion relic
    const campaignProgress = await ctx.db
      .query("wizardCampaignProgress")
      .withIndex("by_wizard", (q) => q.eq("wizardId", wizard._id))
      .unique();

    const hasCompletionRelic = campaignProgress?.hasCompletionRelic || false;

    // Calculate effective luck score (base luck would be stored on wizard, defaulting to 10)
    const baseLuck = 10; // This could be a field on the wizard in the future
    const effectiveLuckScore = Math.min(
      20,
      baseLuck + (hasCompletionRelic ? 1 : 0),
    );

    return {
      ...wizard,
      hasCompletionRelic,
      effectiveLuckScore,
    };
  },
});

// Create a new wizard. Called by watcher.createWizard after the Watcher approves.
export const createWizard = internalMutation({
  args: {
    name: v.string(),
    description: v.string(),
  },
  handler: async (ctx, { name, description }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    await assertWizardNameFree(ctx, identity.subject, name);

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
          // First illustration is free. userId is only for cost tracking.
          userId: identity.subject,
        },
      );
      await ctx.db.patch(wizardId, {
        illustrationStatus: "sketching",
        illustrationRequestedAt: Date.now(),
      });
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
      await recordWizardResult(ctx, wizardId, won);
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
    plainIllustration: v.optional(v.string()),
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
      // A stored illustration means the portrait job is done.
      ...(updates.illustration ? { illustrationStatus: undefined } : {}),
    });
  },
});

// Progress reports from the portrait job (generateWizardIllustration).
export const setIllustrationStatus = internalMutation({
  args: {
    wizardId: v.id("wizards"),
    status: v.union(v.literal("painting"), v.literal("failed")),
  },
  returns: v.null(),
  handler: async (ctx, { wizardId, status }) => {
    const wizard = await ctx.db.get(wizardId);
    if (!wizard) return null;
    await ctx.db.patch(wizardId, { illustrationStatus: status });
    return null;
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
        },
      );
      await ctx.db.patch(wizardId, {
        illustrationStatus: "sketching",
        illustrationRequestedAt: Date.now(),
      });
    }
  },
});

// Update wizard details (only for owned wizards). Called by watcher.updateWizard
// after the Watcher approves. Changing the name or description always repaints
// the portrait so it matches (1 token once the wizard has one).
export const updateWizard = internalMutation({
  args: {
    wizardId: v.id("wizards"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    illustrationURL: v.optional(v.string()),
    illustration: v.optional(v.string()),
    isAIPowered: v.optional(v.boolean()),
  },
  returns: portraitRedrawValidator,
  handler: async (
    ctx,
    { wizardId, ...updates },
  ): Promise<Infer<typeof portraitRedrawValidator>> => {
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
    // Only check real renames, so wizards that already share a name (from
    // before names were unique per player) can still be edited.
    if (
      updates.name !== undefined &&
      normalizeWizardName(updates.name) !== normalizeWizardName(wizard.name)
    ) {
      await assertWizardNameFree(ctx, wizard.owner, updates.name, wizardId);
    }

    // The portrait always matches the details, so a change to the name or
    // description must repaint it. Refuse the whole save (rather than leave a
    // stale portrait) when that can't happen.
    const detailsChanged =
      !updates.illustration &&
      ((updates.name !== undefined && updates.name !== wizard.name) ||
        (updates.description !== undefined &&
          updates.description !== wizard.description));
    if (detailsChanged) {
      if (activePortraitStage(wizard, Date.now())) {
        throw new ConvexError(
          "This wizard's portrait is still being generated. Save your changes once it's done.",
        );
      }
      if (
        wizard.illustration &&
        !(await hasWizardImageToken(ctx, identity.subject))
      ) {
        throw new ConvexError(
          "Changing your wizard generates a new portrait, which costs 1 token. You're out of tokens.",
        );
      }
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

    if (!detailsChanged) return "unchanged";
    const updated = (await ctx.db.get(wizardId))!;
    await startIllustrationRedraw(ctx, updated, identity.subject);
    return "redrawing";
  },
});

// Get illustration URL from storage
export const getIllustrationUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId);
  },
});

/**
 * Charge for (when the wizard already has a portrait) and schedule a new
 * illustration from the wizard's current name and description. The first
 * illustration is free; redoing one costs a token, and this throws (rolling
 * back the caller) if the player has none.
 */
async function startIllustrationRedraw(
  ctx: MutationCtx,
  wizard: Doc<"wizards">,
  userId: string,
): Promise<void> {
  const tokenCharged = !!wizard.illustration;
  if (tokenCharged) {
    await chargeWizardImageToken(ctx, userId, wizard._id);
  }

  // Increment illustration version immediately
  await ctx.db.patch(wizard._id, {
    illustrationVersion: (wizard.illustrationVersion || 1) + 1,
  });

  // Skip scheduling in test environment to avoid transaction escape errors
  if (process.env.NODE_ENV !== "test") {
    await ctx.scheduler.runAfter(
      100, // Add small delay to ensure database transaction is committed
      api.generateWizardIllustration.generateWizardIllustration,
      {
        wizardId: wizard._id,
        name: wizard.name,
        description: wizard.description,
        userId,
        refundTokenOnFailure: tokenCharged,
      },
    );
    await ctx.db.patch(wizard._id, {
      illustrationStatus: "sketching",
      illustrationRequestedAt: Date.now(),
    });
  }
}

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
        "Not authorized to regenerate illustration for this wizard",
      );
    }

    // Don't start (or charge for) a second job while one is still painting.
    if (activePortraitStage(wizard, Date.now())) {
      throw new ConvexError(
        "This wizard's portrait is still being generated. Give it a moment.",
      );
    }

    await startIllustrationRedraw(ctx, wizard, identity.subject);

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

    const stats = await ctx.db
      .query("wizardStats")
      .withIndex("by_wizard", (q) => q.eq("wizardId", wizardId))
      .unique();
    if (stats) {
      await ctx.db.delete(stats._id);
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
        duel.winners?.includes(wizardId),
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
      plainIllustration: v.optional(v.string()), // Convex storage ID: wizard on a plain background (reference for scene generation)
      illustrationVersion: v.optional(v.number()),
      illustrationStatus: v.optional(
        v.union(
          v.literal("sketching"),
          v.literal("painting"),
          v.literal("failed"),
        ),
      ),
      illustrationRequestedAt: v.optional(v.number()),
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
      // Campaign opponent fields
      isCampaignOpponent: v.optional(v.boolean()),
      opponentNumber: v.optional(v.number()),
      personalityTraits: v.optional(v.array(v.string())),
      spellStyle: v.optional(v.string()),
      difficulty: v.optional(v.string()),
      luckModifier: v.optional(v.number()),
      illustrationPrompt: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, { limit = 50, minDuels = 1 }) => {
    // Read the materialized `wizardStats` index, best first: win rate, then
    // wins, then total duels. Only the wizards that make the cut are loaded.
    // Wizards with no completed duel have no stats row, so the effective
    // minimum is 1.
    const minimum = Math.max(1, minDuels);
    const results = [];

    for await (const stats of ctx.db
      .query("wizardStats")
      .withIndex("by_win_rate_and_wins_and_total_duels")
      .order("desc")) {
      if (results.length >= limit) break;
      if (stats.totalDuels < minimum) continue;

      const wizard = await ctx.db.get(stats.wizardId);
      // Departed wizards' players deleted their accounts.
      if (!wizard || wizard.owner === DEPARTED_OWNER) continue;

      const campaignProgress = await ctx.db
        .query("wizardCampaignProgress")
        .withIndex("by_wizard", (q) => q.eq("wizardId", wizard._id))
        .unique();
      const hasCompletionRelic = campaignProgress?.hasCompletionRelic || false;
      const effectiveLuckScore = Math.min(
        20,
        10 + (hasCompletionRelic ? 1 : 0),
      );

      const owner = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", wizard.owner))
        .first();

      results.push({
        ...wizard,
        wins: stats.wins,
        losses: stats.losses,
        winRate: stats.winRate,
        totalDuels: stats.totalDuels,
        rank: results.length + 1,
        ownerUserId: owner?.userId,
        ownerDisplayName: owner?.displayName,
        hasCompletionRelic,
        effectiveLuckScore,
      });
    }

    return results;
  },
});

/**
 * Rebuild `wizardStats` from the duel history. Idempotent. Run once after
 * deploy, and again any time the table is suspected to have drifted:
 *   npx convex run wizards:backfillWizardStats
 */
export const backfillWizardStats = internalMutation({
  args: {},
  returns: v.object({ wizardsWithStats: v.number(), rowsRemoved: v.number() }),
  handler: async (ctx) => {
    const tally = new Map<Id<"wizards">, { wins: number; losses: number }>();
    const bump = (id: Id<"wizards">, won: boolean) => {
      const entry = tally.get(id) ?? { wins: 0, losses: 0 };
      if (won) entry.wins++;
      else entry.losses++;
      tally.set(id, entry);
    };

    for await (const duel of ctx.db
      .query("duels")
      .withIndex("by_status", (q) => q.eq("status", "COMPLETED"))) {
      if (duel.isCampaignBattle) continue;
      for (const id of duel.wizards) {
        if (duel.winners?.includes(id)) bump(id, true);
        else if (duel.losers?.includes(id)) bump(id, false);
      }
    }

    let rowsRemoved = 0;
    for await (const row of ctx.db.query("wizardStats")) {
      if (!tally.has(row.wizardId)) {
        await ctx.db.delete(row._id);
        rowsRemoved++;
      }
    }

    for (const [wizardId, { wins, losses }] of tally) {
      const wizard = await ctx.db.get(wizardId);
      if (!wizard || wizard.owner === DEPARTED_OWNER) continue; // deleted, or its player left
      const totalDuels = wins + losses;
      const fields = {
        wins,
        losses,
        totalDuels,
        winRate: computeWinRate(wins, totalDuels),
      };
      const existing = await ctx.db
        .query("wizardStats")
        .withIndex("by_wizard", (q) => q.eq("wizardId", wizardId))
        .unique();
      if (existing) await ctx.db.patch(existing._id, fields);
      else await ctx.db.insert("wizardStats", { wizardId, ...fields });
    }

    return { wizardsWithStats: tally.size, rowsRemoved };
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
      plainIllustration: v.optional(v.string()), // Convex storage ID: wizard on a plain background (reference for scene generation)
      illustrationVersion: v.optional(v.number()),
      illustrationStatus: v.optional(
        v.union(
          v.literal("sketching"),
          v.literal("painting"),
          v.literal("failed"),
        ),
      ),
      illustrationRequestedAt: v.optional(v.number()),
      illustrations: v.optional(v.array(v.string())),
      isAIPowered: v.optional(v.boolean()),
      wins: v.optional(v.number()),
      losses: v.optional(v.number()),
      ownerUserId: v.optional(v.string()),
      ownerDisplayName: v.optional(v.string()),
      hasCompletionRelic: v.boolean(),
      effectiveLuckScore: v.number(),
      // Campaign opponent fields
      isCampaignOpponent: v.optional(v.boolean()),
      opponentNumber: v.optional(v.number()),
      personalityTraits: v.optional(v.array(v.string())),
      spellStyle: v.optional(v.string()),
      difficulty: v.optional(v.string()),
      luckModifier: v.optional(v.number()),
      illustrationPrompt: v.optional(v.string()),
    }),
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
      baseLuck + (hasCompletionRelic ? 1 : 0),
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
      plainIllustration: v.optional(v.string()), // Convex storage ID: wizard on a plain background (reference for scene generation)
      illustrationVersion: v.optional(v.number()),
      illustrationStatus: v.optional(
        v.union(
          v.literal("sketching"),
          v.literal("painting"),
          v.literal("failed"),
        ),
      ),
      illustrationRequestedAt: v.optional(v.number()),
      illustrations: v.optional(v.array(v.string())),
      isAIPowered: v.optional(v.boolean()),
      wins: v.optional(v.number()),
      losses: v.optional(v.number()),
      ownerUserId: v.optional(v.string()),
      ownerDisplayName: v.optional(v.string()),
      // Campaign opponent fields
      isCampaignOpponent: v.optional(v.boolean()),
      opponentNumber: v.optional(v.number()),
      personalityTraits: v.optional(v.array(v.string())),
      spellStyle: v.optional(v.string()),
      difficulty: v.optional(v.string()),
      luckModifier: v.optional(v.number()),
      illustrationPrompt: v.optional(v.string()),
    }),
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
      }),
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
      plainIllustration: v.optional(v.string()), // Convex storage ID: wizard on a plain background (reference for scene generation)
      illustrationVersion: v.optional(v.number()),
      illustrationStatus: v.optional(
        v.union(
          v.literal("sketching"),
          v.literal("painting"),
          v.literal("failed"),
        ),
      ),
      illustrationRequestedAt: v.optional(v.number()),
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
      // Campaign opponent fields
      isCampaignOpponent: v.optional(v.boolean()),
      opponentNumber: v.optional(v.number()),
      personalityTraits: v.optional(v.array(v.string())),
      spellStyle: v.optional(v.string()),
      difficulty: v.optional(v.string()),
      luckModifier: v.optional(v.number()),
      illustrationPrompt: v.optional(v.string()),
    }),
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

    // Get all wizards, except departed ones (their players deleted their accounts)
    const wizards = (await ctx.db.query("wizards").collect()).filter(
      (wizard) => wizard.owner !== DEPARTED_OWNER,
    );

    // Get duels completed in the specified period, excluding campaign battles
    const periodDuels = await ctx.db
      .query("duels")
      .withIndex("by_completed_at", (q) =>
        period === "all"
          ? q.gte("completedAt", 0)
          : q.gte("completedAt", startTime),
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
          baseLuck + (hasCompletionRelic ? 1 : 0),
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
          duel.wizards.includes(wizard._id),
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
            duel.wizards.includes(wizard._id),
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
      }),
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
      }),
    );

    // Apply limit
    return wizardsWithOwners.slice(0, limit);
  },
});
// Internal function to get wizard data without access control (for system operations)
// This can handle both regular wizards and campaign opponents
export const getWizardInternal = internalQuery({
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
      plainIllustration: v.optional(v.string()), // Convex storage ID: wizard on a plain background (reference for scene generation)
      illustrationVersion: v.optional(v.number()),
      illustrationStatus: v.optional(
        v.union(
          v.literal("sketching"),
          v.literal("painting"),
          v.literal("failed"),
        ),
      ),
      illustrationRequestedAt: v.optional(v.number()),
      illustrations: v.optional(v.array(v.string())),
      isAIPowered: v.optional(v.boolean()),
      wins: v.optional(v.number()),
      losses: v.optional(v.number()),
      hasCompletionRelic: v.boolean(),
      effectiveLuckScore: v.number(),
      // Campaign opponent fields
      isCampaignOpponent: v.optional(v.boolean()),
      opponentNumber: v.optional(v.number()),
      personalityTraits: v.optional(v.array(v.string())),
      spellStyle: v.optional(v.string()),
      difficulty: v.optional(v.string()),
      luckModifier: v.optional(v.number()),
      illustrationPrompt: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, { wizardId }) => {
    const wizard = await ctx.db.get(wizardId);
    if (!wizard) {
      return null;
    }

    // For campaign opponents, we don't need to check ownership or campaign progress
    if (wizard.isCampaignOpponent) {
      return {
        ...wizard,
        hasCompletionRelic: false, // Campaign opponents don't have relics
        effectiveLuckScore: wizard.luckModifier || 10, // Use their luck modifier or default
      };
    }

    // For regular wizards, get campaign progress to check for completion relic
    const campaignProgress = await ctx.db
      .query("wizardCampaignProgress")
      .withIndex("by_wizard", (q) => q.eq("wizardId", wizard._id))
      .unique();

    const hasCompletionRelic = campaignProgress?.hasCompletionRelic || false;

    // Calculate effective luck score (base luck would be stored on wizard, defaulting to 10)
    const baseLuck = 10; // This could be a field on the wizard in the future
    const effectiveLuckScore = Math.min(
      20,
      baseLuck + (hasCompletionRelic ? 1 : 0),
    );

    return {
      ...wizard,
      hasCompletionRelic,
      effectiveLuckScore,
    };
  },
});

/**
 * Display names for the wizards in a duel, in order. Same-named wizards get
 * their owner added ("Frostfire (Ken)") so the narration and illustrations
 * can tell them apart.
 */
export const getDuelWizardNames = internalQuery({
  args: { wizardIds: v.array(v.id("wizards")) },
  returns: v.array(v.string()),
  handler: async (ctx, { wizardIds }) => {
    const entries = await Promise.all(
      wizardIds.map(async (id) => {
        const wizard = await ctx.db.get(id);
        if (!wizard) return null;
        const owner = await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", wizard.owner))
          .first();
        const ownerLabel =
          wizard.owner === "campaign"
            ? "Campaign"
            : (owner?.displayName ?? owner?.userId);
        return { name: wizard.name, ownerLabel };
      }),
    );
    return labelDuplicateNames(entries, (e) => e.ownerLabel).map(
      (e, i) => e?.name ?? `Wizard ${i + 1}`,
    );
  },
});
