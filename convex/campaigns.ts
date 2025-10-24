import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { CAMPAIGN_OPPONENTS_DATA } from "./campaignOpponents";
import { api } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";

/**
 * Seed the campaign opponents as wizards with campaign-specific fields
 * This should be run once during deployment to populate the campaign opponents
 */
export const seedCampaignOpponents = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Check if opponents are already seeded
    const existingOpponents = await ctx.db
      .query("wizards")
      .withIndex("by_campaign_opponent", (q) =>
        q.eq("isCampaignOpponent", true)
      )
      .collect();

    if (existingOpponents.length > 0) {
      console.log("Campaign opponents already seeded");
      return null;
    }

    // Insert all 10 campaign opponents as wizards
    for (const opponent of CAMPAIGN_OPPONENTS_DATA) {
      await ctx.db.insert("wizards", {
        owner: "campaign", // Special owner for campaign opponents
        name: opponent.name,
        description: opponent.description,
        isAIPowered: true,
        wins: 0,
        losses: 0,
        illustrationVersion: 1,
        // Campaign-specific fields
        isCampaignOpponent: true,
        opponentNumber: opponent.opponentNumber,
        personalityTraits: opponent.personalityTraits,
        spellStyle: opponent.spellStyle,
        difficulty: opponent.difficulty,
        luckModifier: opponent.luckModifier,
        illustrationPrompt: opponent.illustrationPrompt,
      });
    }

    console.log(
      `Seeded ${CAMPAIGN_OPPONENTS_DATA.length} campaign opponents as wizards`
    );
    return null;
  },
});

/**
 * Get all campaign opponents in order (1-10)
 */
export const getCampaignOpponents = query({
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
      isCampaignOpponent: v.optional(v.boolean()),
      opponentNumber: v.optional(v.number()),
      personalityTraits: v.optional(v.array(v.string())),
      spellStyle: v.optional(v.string()),
      difficulty: v.optional(
        v.union(
          v.literal("BEGINNER"),
          v.literal("INTERMEDIATE"),
          v.literal("ADVANCED")
        )
      ),
      luckModifier: v.optional(v.number()),
      illustrationPrompt: v.optional(v.string()),
    })
  ),
  handler: async (ctx) => {
    const opponents = await ctx.db
      .query("wizards")
      .withIndex("by_campaign_opponent", (q) =>
        q.eq("isCampaignOpponent", true)
      )
      .collect();

    // Sort by opponent number to ensure correct order
    return opponents
      .filter((opponent) => opponent.opponentNumber !== undefined)
      .sort((a, b) => (a.opponentNumber || 0) - (b.opponentNumber || 0));
  },
});

/**
 * Public mutation to seed campaign opponents (for development/admin use)
 */
export const seedCampaignOpponentsPublic = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    count: v.number(),
  }),
  handler: async (ctx) => {
    // Check admin access
    const adminAccess = await ctx.runQuery(api.duels.checkAdminAccess);
    if (!adminAccess.hasAccess) {
      throw new Error("Access denied: Super admin privileges required");
    }

    // Check if opponents are already seeded
    const existingOpponents = await ctx.db
      .query("wizards")
      .withIndex("by_campaign_opponent", (q) =>
        q.eq("isCampaignOpponent", true)
      )
      .collect();

    if (existingOpponents.length > 0) {
      return {
        success: false,
        message: "Campaign opponents already exist",
        count: existingOpponents.length,
      };
    }

    // Insert all 10 campaign opponents as wizards
    let insertedCount = 0;
    for (const opponent of CAMPAIGN_OPPONENTS_DATA) {
      await ctx.db.insert("wizards", {
        owner: "campaign", // Special owner for campaign opponents
        name: opponent.name,
        description: opponent.description,
        isAIPowered: true,
        wins: 0,
        losses: 0,
        illustrationVersion: 1,
        // Campaign-specific fields
        isCampaignOpponent: true,
        opponentNumber: opponent.opponentNumber,
        personalityTraits: opponent.personalityTraits,
        spellStyle: opponent.spellStyle,
        difficulty: opponent.difficulty,
        luckModifier: opponent.luckModifier,
        illustrationPrompt: opponent.illustrationPrompt,
      });
      insertedCount++;
    }

    return {
      success: true,
      message: `Successfully seeded ${insertedCount} campaign opponents`,
      count: insertedCount,
    };
  },
});

/**
 * Delete all campaign opponents (super admin only)
 */
export const deleteCampaignOpponents = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    count: v.number(),
  }),
  handler: async (ctx) => {
    // Check admin access
    const adminAccess = await ctx.runQuery(api.duels.checkAdminAccess);
    if (!adminAccess.hasAccess) {
      throw new Error("Access denied: Super admin privileges required");
    }

    const opponents = await ctx.db
      .query("wizards")
      .withIndex("by_campaign_opponent", (q) =>
        q.eq("isCampaignOpponent", true)
      )
      .collect();

    let deletedCount = 0;
    for (const opponent of opponents) {
      await ctx.db.delete(opponent._id);
      deletedCount++;
    }

    return {
      success: true,
      message: `Successfully deleted ${deletedCount} campaign opponents`,
      count: deletedCount,
    };
  },
});

/**
 * Update a campaign opponent (super admin only)
 */
export const updateCampaignOpponent = mutation({
  args: {
    opponentId: v.id("wizards"),
    updates: v.object({
      name: v.optional(v.string()),
      description: v.optional(v.string()),
      difficulty: v.optional(
        v.union(
          v.literal("BEGINNER"),
          v.literal("INTERMEDIATE"),
          v.literal("ADVANCED")
        )
      ),
      luckModifier: v.optional(v.number()),
      spellStyle: v.optional(v.string()),
      personalityTraits: v.optional(v.array(v.string())),
      illustrationPrompt: v.optional(v.string()),
    }),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    // Check admin access
    const adminAccess = await ctx.runQuery(api.duels.checkAdminAccess);
    if (!adminAccess.hasAccess) {
      throw new Error("Access denied: Super admin privileges required");
    }

    // Verify the opponent exists and is a campaign opponent
    const opponent = await ctx.db.get(args.opponentId);
    if (!opponent || !opponent.isCampaignOpponent) {
      throw new Error("Campaign opponent not found");
    }

    // Update the opponent
    await ctx.db.patch(args.opponentId, args.updates);

    return {
      success: true,
      message: `Successfully updated ${opponent.name}`,
    };
  },
});

/**
 * Create a new campaign opponent (super admin only)
 */
export const createCampaignOpponent = mutation({
  args: {
    opponentNumber: v.number(),
    name: v.string(),
    description: v.string(),
    difficulty: v.union(
      v.literal("BEGINNER"),
      v.literal("INTERMEDIATE"),
      v.literal("ADVANCED")
    ),
    luckModifier: v.number(),
    spellStyle: v.string(),
    personalityTraits: v.array(v.string()),
    illustrationPrompt: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    opponentId: v.id("wizards"),
  }),
  handler: async (ctx, args) => {
    // Check admin access
    const adminAccess = await ctx.runQuery(api.duels.checkAdminAccess);
    if (!adminAccess.hasAccess) {
      throw new Error("Access denied: Super admin privileges required");
    }

    // Check if opponent number is already taken
    const existingOpponent = await ctx.db
      .query("wizards")
      .withIndex("by_campaign_opponent", (q) =>
        q
          .eq("isCampaignOpponent", true)
          .eq("opponentNumber", args.opponentNumber)
      )
      .unique();

    if (existingOpponent) {
      throw new Error(
        `Opponent number ${args.opponentNumber} is already taken`
      );
    }

    // Create the new opponent
    const opponentId = await ctx.db.insert("wizards", {
      owner: "campaign",
      name: args.name,
      description: args.description,
      isAIPowered: true,
      wins: 0,
      losses: 0,
      illustrationVersion: 1,
      // Campaign-specific fields
      isCampaignOpponent: true,
      opponentNumber: args.opponentNumber,
      personalityTraits: args.personalityTraits,
      spellStyle: args.spellStyle,
      difficulty: args.difficulty,
      luckModifier: args.luckModifier,
      illustrationPrompt: args.illustrationPrompt,
    });

    return {
      success: true,
      message: `Successfully created campaign opponent: ${args.name}`,
      opponentId,
    };
  },
});

/**
 * Get a specific campaign opponent by number
 */
export const getCampaignOpponent = query({
  args: { opponentNumber: v.number() },
  returns: v.union(
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
      isCampaignOpponent: v.optional(v.boolean()),
      opponentNumber: v.optional(v.number()),
      personalityTraits: v.optional(v.array(v.string())),
      spellStyle: v.optional(v.string()),
      difficulty: v.optional(
        v.union(
          v.literal("BEGINNER"),
          v.literal("INTERMEDIATE"),
          v.literal("ADVANCED")
        )
      ),
      luckModifier: v.optional(v.number()),
      illustrationPrompt: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, { opponentNumber }) => {
    const opponent = await ctx.db
      .query("wizards")
      .withIndex("by_campaign_opponent", (q) =>
        q.eq("isCampaignOpponent", true).eq("opponentNumber", opponentNumber)
      )
      .unique();

    return opponent || null;
  },
});

/**
 * Get wizard's campaign progress
 */
export const getWizardCampaignProgress = query({
  args: { wizardId: v.id("wizards") },
  returns: v.union(
    v.object({
      _id: v.id("wizardCampaignProgress"),
      _creationTime: v.number(),
      wizardId: v.id("wizards"),
      userId: v.string(),
      currentOpponent: v.number(),
      defeatedOpponents: v.array(v.number()),
      hasCompletionRelic: v.boolean(),
      createdAt: v.number(),
      lastBattleAt: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, { wizardId }) => {
    const progress = await ctx.db
      .query("wizardCampaignProgress")
      .withIndex("by_wizard", (q) => q.eq("wizardId", wizardId))
      .unique();

    return progress || null;
  },
});

/**
 * Get all campaign progress for a user's wizards
 */
export const getUserCampaignProgress = query({
  args: { userId: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("wizardCampaignProgress"),
      _creationTime: v.number(),
      wizardId: v.id("wizards"),
      userId: v.string(),
      currentOpponent: v.number(),
      defeatedOpponents: v.array(v.number()),
      hasCompletionRelic: v.boolean(),
      createdAt: v.number(),
      lastBattleAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, { userId }) => {
    const progressList = await ctx.db
      .query("wizardCampaignProgress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return progressList;
  },
});

/**
 * Initialize campaign progress for a wizard
 */
export const initializeWizardCampaignProgress = mutation({
  args: {
    wizardId: v.id("wizards"),
    userId: v.string(),
  },
  returns: v.id("wizardCampaignProgress"),
  handler: async (ctx, { wizardId, userId }) => {
    // Check if progress already exists
    const existingProgress = await ctx.db
      .query("wizardCampaignProgress")
      .withIndex("by_wizard", (q) => q.eq("wizardId", wizardId))
      .unique();

    if (existingProgress) {
      return existingProgress._id;
    }

    // Create new campaign progress
    const progressId = await ctx.db.insert("wizardCampaignProgress", {
      wizardId,
      userId,
      currentOpponent: 1, // Start with first opponent
      defeatedOpponents: [],
      hasCompletionRelic: false,
      createdAt: Date.now(),
    });

    return progressId;
  },
});

/**
 * Mark an opponent as defeated and advance wizard progress
 */
export const defeatOpponent = mutation({
  args: {
    wizardId: v.id("wizards"),
    opponentNumber: v.number(),
    userId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { wizardId, opponentNumber, userId }) => {
    // Get current progress
    const progress = await ctx.db
      .query("wizardCampaignProgress")
      .withIndex("by_wizard", (q) => q.eq("wizardId", wizardId))
      .unique();

    if (!progress) {
      throw new Error("No campaign progress found for this wizard");
    }

    // Verify user ownership if userId provided
    if (userId && progress.userId !== userId) {
      throw new Error("Unauthorized: wizard belongs to different user");
    }

    // Validate opponent number is in valid range
    if (opponentNumber < 1 || opponentNumber > 10) {
      throw new Error("Invalid opponent number: must be between 1 and 10");
    }

    // Check if opponent can be defeated (must be current opponent)
    if (opponentNumber !== progress.currentOpponent) {
      throw new Error(
        `Cannot defeat opponent ${opponentNumber}. Must defeat opponent ${progress.currentOpponent} first.`
      );
    }

    // Check if opponent already defeated
    if (progress.defeatedOpponents.includes(opponentNumber)) {
      throw new Error(`Opponent ${opponentNumber} already defeated`);
    }

    // Update progress
    const newDefeatedOpponents = [
      ...progress.defeatedOpponents,
      opponentNumber,
    ];
    const newCurrentOpponent = opponentNumber === 10 ? 11 : opponentNumber + 1;
    const hasCompletionRelic = opponentNumber === 10;

    await ctx.db.patch(progress._id, {
      currentOpponent: newCurrentOpponent,
      defeatedOpponents: newDefeatedOpponents,
      hasCompletionRelic,
      lastBattleAt: Date.now(),
    });

    return null;
  },
});

/**
 * Create a campaign battle record
 */
export const createCampaignBattle = mutation({
  args: {
    wizardId: v.id("wizards"),
    userId: v.string(),
    opponentNumber: v.number(),
    duelId: v.id("duels"),
  },
  returns: v.id("campaignBattles"),
  handler: async (ctx, { wizardId, userId, opponentNumber, duelId }) => {
    // Check for existing battle with same wizard-opponent combination
    const existingBattle = await ctx.db
      .query("campaignBattles")
      .withIndex("by_wizard", (q) => q.eq("wizardId", wizardId))
      .filter((q) => q.eq(q.field("opponentNumber"), opponentNumber))
      .filter((q) => q.neq(q.field("status"), "LOST")) // Allow retries after losses
      .first();

    if (existingBattle) {
      throw new Error(
        `Battle already exists for wizard against opponent ${opponentNumber}`
      );
    }

    // Create battle record
    const battleId = await ctx.db.insert("campaignBattles", {
      wizardId,
      userId,
      opponentNumber,
      duelId,
      status: "IN_PROGRESS",
      createdAt: Date.now(),
    });

    return battleId;
  },
});

/**
 * Complete a campaign battle
 */
export const completeCampaignBattle = mutation({
  args: {
    battleId: v.id("campaignBattles"),
    won: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, { battleId, won }) => {
    const battle = await ctx.db.get(battleId);
    if (!battle) {
      throw new Error("Campaign battle not found");
    }

    // Update battle status
    await ctx.db.patch(battleId, {
      status: won ? "WON" : "LOST",
      completedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Get a specific campaign battle
 */
export const getCampaignBattle = query({
  args: { battleId: v.id("campaignBattles") },
  returns: v.union(
    v.object({
      _id: v.id("campaignBattles"),
      _creationTime: v.number(),
      wizardId: v.id("wizards"),
      userId: v.string(),
      opponentNumber: v.number(),
      duelId: v.id("duels"),
      status: v.union(
        v.literal("IN_PROGRESS"),
        v.literal("WON"),
        v.literal("LOST")
      ),
      completedAt: v.optional(v.number()),
      createdAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, { battleId }) => {
    return await ctx.db.get(battleId);
  },
});

/**
 * Get all campaign battles for a wizard
 */
export const getWizardCampaignBattles = query({
  args: { wizardId: v.id("wizards") },
  returns: v.array(
    v.object({
      _id: v.id("campaignBattles"),
      _creationTime: v.number(),
      wizardId: v.id("wizards"),
      userId: v.string(),
      opponentNumber: v.number(),
      duelId: v.id("duels"),
      status: v.union(
        v.literal("IN_PROGRESS"),
        v.literal("WON"),
        v.literal("LOST")
      ),
      completedAt: v.optional(v.number()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, { wizardId }) => {
    return await ctx.db
      .query("campaignBattles")
      .withIndex("by_wizard", (q) => q.eq("wizardId", wizardId))
      .collect();
  },
});

/**
 * Get campaign battles for a user against a specific opponent
 */
export const getUserOpponentBattles = query({
  args: {
    userId: v.string(),
    opponentNumber: v.number(),
  },
  returns: v.array(
    v.object({
      _id: v.id("campaignBattles"),
      _creationTime: v.number(),
      wizardId: v.id("wizards"),
      userId: v.string(),
      opponentNumber: v.number(),
      duelId: v.id("duels"),
      status: v.union(
        v.literal("IN_PROGRESS"),
        v.literal("WON"),
        v.literal("LOST")
      ),
      completedAt: v.optional(v.number()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, { userId, opponentNumber }) => {
    return await ctx.db
      .query("campaignBattles")
      .withIndex("by_user_opponent", (q) =>
        q.eq("userId", userId).eq("opponentNumber", opponentNumber)
      )
      .collect();
  },
});

/**
 * Get the campaign opponent wizard for a battle
 */
export const getCampaignOpponentWizard = query({
  args: { opponentNumber: v.number() },
  returns: v.union(v.id("wizards"), v.null()),
  handler: async (ctx, { opponentNumber }) => {
    // Get the campaign opponent wizard
    const opponent = await ctx.db
      .query("wizards")
      .withIndex("by_campaign_opponent", (q) =>
        q.eq("isCampaignOpponent", true).eq("opponentNumber", opponentNumber)
      )
      .unique();

    return opponent?._id || null;
  },
});

/**
 * Apply luck modifiers based on opponent difficulty level
 */
export const calculateCampaignLuck = query({
  args: {
    opponentNumber: v.number(),
    baseLuck: v.number(),
  },
  returns: v.number(),
  handler: async (ctx, { opponentNumber, baseLuck }) => {
    // Get the campaign opponent wizard
    const opponent = await ctx.db
      .query("wizards")
      .withIndex("by_campaign_opponent", (q) =>
        q.eq("isCampaignOpponent", true).eq("opponentNumber", opponentNumber)
      )
      .unique();

    if (!opponent || !opponent.luckModifier) {
      throw new Error(`Campaign opponent ${opponentNumber} not found`);
    }

    // Apply luck modifier and ensure it stays within valid range (1-20)
    const modifiedLuck = Math.max(
      1,
      Math.min(20, baseLuck + opponent.luckModifier)
    );

    return modifiedLuck;
  },
});
/**
 * Start a campaign battle between a player wizard and an AI opponent
 */
export const startCampaignBattle = mutation({
  args: {
    wizardId: v.id("wizards"),
    opponentNumber: v.number(),
  },
  returns: v.object({
    duelId: v.id("duels"),
    campaignBattleId: v.id("campaignBattles"),
    aiWizardId: v.id("wizards"),
  }),
  handler: async (
    ctx,
    { wizardId, opponentNumber }
  ): Promise<{
    duelId: Doc<"duels">["_id"];
    campaignBattleId: Doc<"campaignBattles">["_id"];
    aiWizardId: Doc<"wizards">["_id"];
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify the wizard exists and belongs to the user
    const wizard = await ctx.db.get(wizardId);
    if (!wizard) {
      throw new Error("Wizard not found");
    }
    if (wizard.owner !== identity.subject) {
      throw new Error("Unauthorized: wizard belongs to different user");
    }

    // Verify opponent number is valid
    if (opponentNumber < 1 || opponentNumber > 10) {
      throw new Error("Invalid opponent number: must be between 1 and 10");
    }

    // Get or create wizard campaign progress
    let progress = await ctx.db
      .query("wizardCampaignProgress")
      .withIndex("by_wizard", (q) => q.eq("wizardId", wizardId))
      .unique();

    if (!progress) {
      // Initialize progress if it doesn't exist
      const progressId = await ctx.db.insert("wizardCampaignProgress", {
        wizardId,
        userId: identity.subject,
        currentOpponent: 1,
        defeatedOpponents: [],
        hasCompletionRelic: false,
        createdAt: Date.now(),
      });
      progress = await ctx.db.get(progressId);
    }

    if (!progress) {
      throw new Error("Failed to create campaign progress");
    }

    // Verify this is the correct opponent to face
    if (opponentNumber !== progress.currentOpponent) {
      throw new Error(
        `Cannot battle opponent ${opponentNumber}. Must battle opponent ${progress.currentOpponent} first.`
      );
    }

    // Check if opponent already defeated
    if (progress.defeatedOpponents.includes(opponentNumber)) {
      throw new Error(`Opponent ${opponentNumber} already defeated`);
    }

    // Get the campaign opponent wizard
    const aiWizardId = await ctx.runQuery(
      api.campaigns.getCampaignOpponentWizard,
      { opponentNumber }
    );

    if (!aiWizardId) {
      throw new Error(`Campaign opponent ${opponentNumber} wizard not found`);
    }

    // Create the duel with campaign flag
    const duelId: Doc<"duels">["_id"] = await ctx.db.insert("duels", {
      numberOfRounds: 5, // Standard campaign battle length
      wizards: [wizardId, aiWizardId],
      players: [identity.subject, "campaign"], // Campaign opponent uses "campaign" as player ID
      status: "WAITING_FOR_PLAYERS",
      currentRound: 0,
      createdAt: Date.now(),
      points: {},
      hitPoints: {},
      needActionsFrom: [],
      isCampaignBattle: true, // Mark as campaign battle
    });

    // Create campaign battle record
    const campaignBattleId = await ctx.db.insert("campaignBattles", {
      wizardId,
      userId: identity.subject,
      opponentNumber,
      duelId,
      status: "IN_PROGRESS",
      createdAt: Date.now(),
    });

    return {
      duelId,
      campaignBattleId,
      aiWizardId,
    };
  },
});

/**
 * Complete a campaign battle and process results
 */
export const completeCampaignBattleWithResult = mutation({
  args: {
    campaignBattleId: v.id("campaignBattles"),
    won: v.boolean(),
  },
  returns: v.object({
    relicAwarded: v.boolean(),
    campaignCompleted: v.boolean(),
  }),
  handler: async (ctx, { campaignBattleId, won }) => {
    const battle = await ctx.db.get(campaignBattleId);
    if (!battle) {
      throw new Error("Campaign battle not found");
    }

    // Update battle status
    await ctx.db.patch(campaignBattleId, {
      status: won ? "WON" : "LOST",
      completedAt: Date.now(),
    });

    let relicAwarded = false;
    let campaignCompleted = false;

    // If won, update campaign progress
    if (won) {
      // Get current progress
      const progress = await ctx.db
        .query("wizardCampaignProgress")
        .withIndex("by_wizard", (q) => q.eq("wizardId", battle.wizardId))
        .unique();

      if (progress) {
        // Update progress
        const newDefeatedOpponents = [
          ...progress.defeatedOpponents,
          battle.opponentNumber,
        ];
        const newCurrentOpponent =
          battle.opponentNumber === 10 ? 11 : battle.opponentNumber + 1;
        const hasCompletionRelic = battle.opponentNumber === 10;

        await ctx.db.patch(progress._id, {
          currentOpponent: newCurrentOpponent,
          defeatedOpponents: newDefeatedOpponents,
          hasCompletionRelic,
          lastBattleAt: Date.now(),
        });

        if (hasCompletionRelic) {
          relicAwarded = true;
          campaignCompleted = true;

          // Award the relic by updating wizard's luck (handled in checkCampaignCompletion)
          await ctx.runMutation(api.campaigns.checkCampaignCompletion, {
            wizardId: battle.wizardId,
          });
        }
      }
    }

    return {
      relicAwarded,
      campaignCompleted,
    };
  },
});

/**
 * Check if wizard completed campaign and award relic
 */
export const checkCampaignCompletion = mutation({
  args: { wizardId: v.id("wizards") },
  returns: v.object({
    completed: v.boolean(),
    relicAwarded: v.boolean(),
  }),
  handler: async (ctx, { wizardId }) => {
    // Get campaign progress
    const progress = await ctx.db
      .query("wizardCampaignProgress")
      .withIndex("by_wizard", (q) => q.eq("wizardId", wizardId))
      .unique();

    if (!progress) {
      return { completed: false, relicAwarded: false };
    }

    // Check if all 10 opponents defeated
    const allOpponentsDefeated =
      progress.defeatedOpponents.length === 10 &&
      progress.defeatedOpponents.includes(10);

    if (allOpponentsDefeated && !progress.hasCompletionRelic) {
      // Award the relic
      await ctx.db.patch(progress._id, {
        hasCompletionRelic: true,
      });

      // Note: The actual luck boost will be applied in the wizard's effective luck calculation
      // This is handled in the frontend/query logic rather than modifying the base wizard stats

      return { completed: true, relicAwarded: true };
    }

    return {
      completed: allOpponentsDefeated,
      relicAwarded: progress.hasCompletionRelic,
    };
  },
});

/**
 * Get effective luck score for a wizard (includes relic bonus)
 */
export const getWizardEffectiveLuck = query({
  args: { wizardId: v.id("wizards") },
  returns: v.number(),
  handler: async (ctx, { wizardId }) => {
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

    return effectiveLuckScore;
  },
});

/**
 * Apply luck boost to all future battles for relic-holding wizards
 * This function can be called during battle calculations to get the correct luck value
 */
export const calculateBattleLuck = query({
  args: {
    wizardId: v.id("wizards"),
    baseLuck: v.optional(v.number()),
  },
  returns: v.number(),
  handler: async (ctx, { wizardId, baseLuck = 10 }) => {
    // Get campaign progress to check for completion relic
    const campaignProgress = await ctx.db
      .query("wizardCampaignProgress")
      .withIndex("by_wizard", (q) => q.eq("wizardId", wizardId))
      .unique();

    const hasCompletionRelic = campaignProgress?.hasCompletionRelic || false;

    // Apply relic bonus and ensure it stays within valid range (1-20)
    const effectiveLuck = Math.max(
      1,
      Math.min(20, baseLuck + (hasCompletionRelic ? 1 : 0))
    );

    return effectiveLuck;
  },
});

/**
 * Get comprehensive campaign statistics for a user
 */
export const getCampaignStatistics = query({
  args: { userId: v.string() },
  returns: v.object({
    totalWizards: v.number(),
    completedCampaigns: v.number(),
    activeCampaigns: v.number(),
    totalBattlesWon: v.number(),
    totalBattlesLost: v.number(),
    averageProgress: v.number(),
    completionPercentage: v.number(),
    relicsEarned: v.number(),
    mostRecentBattle: v.optional(
      v.object({
        wizardId: v.id("wizards"),
        opponentNumber: v.number(),
        status: v.union(
          v.literal("WON"),
          v.literal("LOST"),
          v.literal("IN_PROGRESS")
        ),
        completedAt: v.optional(v.number()),
        lastBattleAt: v.number(),
      })
    ),
    milestones: v.array(
      v.object({
        name: v.string(),
        threshold: v.number(),
        achieved: v.boolean(),
        progress: v.number(),
      })
    ),
  }),
  handler: async (ctx, { userId }) => {
    // Get user's wizards
    const userWizards = await ctx.db
      .query("wizards")
      .filter((q) => q.eq(q.field("owner"), userId))
      .collect();

    // Get campaign progress for all wizards
    const campaignProgress = await ctx.db
      .query("wizardCampaignProgress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Get all campaign battles for the user
    const allBattles = await ctx.db
      .query("campaignBattles")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();

    // Calculate basic statistics
    const totalWizards = userWizards.length;
    const completedCampaigns = campaignProgress.filter(
      (p) => p.hasCompletionRelic
    ).length;
    const activeCampaigns = campaignProgress.filter(
      (p) => !p.hasCompletionRelic && p.currentOpponent <= 10
    ).length;
    const totalBattlesWon = campaignProgress.reduce(
      (sum, p) => sum + p.defeatedOpponents.length,
      0
    );
    const totalBattlesLost = allBattles.filter(
      (b) => b.status === "LOST"
    ).length;
    const averageProgress =
      totalWizards > 0
        ? campaignProgress.reduce(
            (sum, p) => sum + Math.min(p.currentOpponent - 1, 10),
            0
          ) / totalWizards
        : 0;

    const totalPossibleBattles = totalWizards * 10;
    const completionPercentage =
      totalPossibleBattles > 0
        ? (totalBattlesWon / totalPossibleBattles) * 100
        : 0;

    const relicsEarned = campaignProgress.filter(
      (p) => p.hasCompletionRelic
    ).length;

    // Get most recent battle
    const mostRecentBattle = campaignProgress
      .filter((p) => p.lastBattleAt)
      .sort((a, b) => (b.lastBattleAt || 0) - (a.lastBattleAt || 0))[0];

    // Calculate milestones
    const milestones = [
      { name: "First Victory", threshold: 1 },
      { name: "Apprentice", threshold: 5 },
      { name: "Journeyman", threshold: 15 },
      { name: "Expert", threshold: 30 },
      { name: "Master", threshold: 50 },
      { name: "Grandmaster", threshold: 100 },
    ].map((milestone) => ({
      ...milestone,
      achieved: totalBattlesWon >= milestone.threshold,
      progress: Math.min(totalBattlesWon / milestone.threshold, 1),
    }));

    return {
      totalWizards,
      completedCampaigns,
      activeCampaigns,
      totalBattlesWon,
      totalBattlesLost,
      averageProgress,
      completionPercentage,
      relicsEarned,
      mostRecentBattle: mostRecentBattle
        ? {
            wizardId: mostRecentBattle.wizardId,
            opponentNumber: mostRecentBattle.currentOpponent - 1, // Last defeated opponent
            status: "WON" as const, // If it's in lastBattleAt, it was won
            completedAt: mostRecentBattle.lastBattleAt,
            lastBattleAt: mostRecentBattle.lastBattleAt!,
          }
        : undefined,
      milestones,
    };
  },
});

/**
 * Get recent campaign battles across all user's wizards
 */
export const getRecentCampaignBattles = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("campaignBattles"),
      _creationTime: v.number(),
      wizardId: v.id("wizards"),
      wizardName: v.string(),
      userId: v.string(),
      opponentNumber: v.number(),
      opponentName: v.string(),
      duelId: v.id("duels"),
      status: v.union(
        v.literal("IN_PROGRESS"),
        v.literal("WON"),
        v.literal("LOST")
      ),
      completedAt: v.optional(v.number()),
      createdAt: v.number(),
      duration: v.optional(v.number()),
    })
  ),
  handler: async (ctx, { userId, limit = 20 }) => {
    // Get recent battles
    const battles = await ctx.db
      .query("campaignBattles")
      .filter((q) => q.eq(q.field("userId"), userId))
      .order("desc")
      .take(limit);

    // Get campaign opponent wizards for names
    const opponents = await ctx.db
      .query("wizards")
      .withIndex("by_campaign_opponent", (q) =>
        q.eq("isCampaignOpponent", true)
      )
      .collect();
    const opponentMap = new Map(
      opponents.map((o) => [o.opponentNumber, o.name])
    );

    // Get wizards for names
    const wizardIds = [...new Set(battles.map((b) => b.wizardId))];
    const wizards = await Promise.all(wizardIds.map((id) => ctx.db.get(id)));
    const wizardMap = new Map(
      wizards.filter(Boolean).map((w) => [w!._id, w!.name])
    );

    // Enrich battles with additional data
    return battles.map((battle) => ({
      ...battle,
      wizardName: wizardMap.get(battle.wizardId) || "Unknown Wizard",
      opponentName:
        opponentMap.get(battle.opponentNumber) ||
        `Opponent #${battle.opponentNumber}`,
      duration: battle.completedAt
        ? battle.completedAt - battle.createdAt
        : undefined,
    }));
  },
});

/**
 * Get campaign leaderboard statistics
 */
export const getCampaignLeaderboard = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      userId: v.string(),
      totalBattlesWon: v.number(),
      completedCampaigns: v.number(),
      relicsEarned: v.number(),
      averageProgress: v.number(),
      rank: v.number(),
    })
  ),
  handler: async (ctx, { limit = 10 }) => {
    // Get all campaign progress
    const allProgress = await ctx.db.query("wizardCampaignProgress").collect();

    // Group by user and calculate statistics
    const userStats = new Map<
      string,
      {
        totalBattlesWon: number;
        completedCampaigns: number;
        relicsEarned: number;
        totalWizards: number;
        totalProgress: number;
      }
    >();

    for (const progress of allProgress) {
      const existing = userStats.get(progress.userId) || {
        totalBattlesWon: 0,
        completedCampaigns: 0,
        relicsEarned: 0,
        totalWizards: 0,
        totalProgress: 0,
      };

      existing.totalBattlesWon += progress.defeatedOpponents.length;
      existing.totalWizards += 1;
      existing.totalProgress += Math.min(progress.currentOpponent - 1, 10);

      if (progress.hasCompletionRelic) {
        existing.completedCampaigns += 1;
        existing.relicsEarned += 1;
      }

      userStats.set(progress.userId, existing);
    }

    // Convert to array and calculate averages
    const leaderboard = Array.from(userStats.entries()).map(
      ([userId, stats]) => ({
        userId,
        totalBattlesWon: stats.totalBattlesWon,
        completedCampaigns: stats.completedCampaigns,
        relicsEarned: stats.relicsEarned,
        averageProgress:
          stats.totalWizards > 0 ? stats.totalProgress / stats.totalWizards : 0,
      })
    );

    // Sort by total battles won (primary) and completed campaigns (secondary)
    leaderboard.sort((a, b) => {
      if (b.totalBattlesWon !== a.totalBattlesWon) {
        return b.totalBattlesWon - a.totalBattlesWon;
      }
      return b.completedCampaigns - a.completedCampaigns;
    });

    // Add ranks and limit results
    return leaderboard.slice(0, limit).map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
  },
});
