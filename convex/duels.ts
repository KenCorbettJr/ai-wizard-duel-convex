import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

import { api } from "./_generated/api";

// Types for better type safety
export type DuelStatus =
  | "WAITING_FOR_PLAYERS"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";
export type DuelRoundStatus = "WAITING_FOR_SPELLS" | "PROCESSING" | "COMPLETED";
export type DuelRoundType =
  | "SPELL_CASTING"
  | "COUNTER_SPELL"
  | "FINAL_ROUND"
  | "CONCLUSION";
export type DuelLengthOption = "TO_THE_DEATH";

// Get all duels for a specific player
export const getPlayerDuels = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const duels = await ctx.db.query("duels").collect();

    // Filter duels that include this player
    return duels.filter((duel) => duel.players.includes(userId));
  },
});

// Get a specific duel by ID
export const getDuel = query({
  args: { duelId: v.id("duels") },
  handler: async (ctx, { duelId }) => {
    const duel = await ctx.db.get(duelId);
    if (!duel) return null;

    // Get all rounds for this duel
    const rounds = await ctx.db
      .query("duelRounds")
      .withIndex("by_duel", (q) => q.eq("duelId", duelId))
      .order("asc")
      .collect();

    return {
      ...duel,
      rounds,
    };
  },
});

// Get a duel by shortcode
export const getDuelByShortcode = query({
  args: { shortcode: v.string() },
  handler: async (ctx, { shortcode }) => {
    const duel = await ctx.db
      .query("duels")
      .withIndex("by_shortcode", (q) =>
        q.eq("shortcode", shortcode.toUpperCase())
      )
      .first();

    if (!duel) return null;

    // Get all rounds for this duel
    const rounds = await ctx.db
      .query("duelRounds")
      .withIndex("by_duel", (q) => q.eq("duelId", duel._id))
      .order("asc")
      .collect();

    return {
      ...duel,
      rounds,
    };
  },
});

// Get duel rounds for a specific duel
export const getDuelRounds = query({
  args: { duelId: v.id("duels") },
  handler: async (ctx, { duelId }) => {
    return await ctx.db
      .query("duelRounds")
      .withIndex("by_duel", (q) => q.eq("duelId", duelId))
      .order("asc")
      .collect();
  },
});

// Get the introduction round (round 0) for a duel
export const getIntroductionRound = query({
  args: { duelId: v.id("duels") },
  handler: async (ctx, { duelId }) => {
    return await ctx.db
      .query("duelRounds")
      .withIndex("by_duel", (q) => q.eq("duelId", duelId))
      .filter((q) => q.eq(q.field("roundNumber"), 0))
      .first();
  },
});

// Helper function to generate a unique shortcode
function generateShortcode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Create a new duel
export const createDuel = mutation({
  args: {
    numberOfRounds: v.union(v.number(), v.literal("TO_THE_DEATH")),
    wizards: v.array(v.id("wizards")),
    players: v.array(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, { numberOfRounds, wizards, players, sessionId }) => {
    // Initialize points and hit points for all wizards
    const initialPoints: Record<string, number> = {};
    const initialHitPoints: Record<string, number> = {};

    wizards.forEach((wizardId) => {
      initialPoints[wizardId] = 0;
      initialHitPoints[wizardId] = 100; // Starting hit points
    });

    // Generate a unique shortcode
    let shortcode: string;
    let isUnique = false;
    do {
      shortcode = generateShortcode();
      const existing = await ctx.db
        .query("duels")
        .withIndex("by_shortcode", (q) => q.eq("shortcode", shortcode))
        .first();
      isUnique = !existing;
    } while (!isUnique);

    const duelId = await ctx.db.insert("duels", {
      numberOfRounds,
      wizards,
      players,
      status: "WAITING_FOR_PLAYERS" as DuelStatus,
      currentRound: 1,
      createdAt: Date.now(),
      points: initialPoints,
      hitPoints: initialHitPoints,
      needActionsFrom: wizards, // All wizards need to act initially
      sessionId,
      shortcode,
    });

    return duelId;
  },
});

// Join a duel
export const joinDuel = mutation({
  args: {
    duelId: v.id("duels"),
    userId: v.string(),
    wizards: v.array(v.id("wizards")),
  },
  handler: async (ctx, { duelId, userId, wizards }) => {
    const duel = await ctx.db.get(duelId);
    if (!duel) {
      throw new Error("Duel not found");
    }

    if (duel.status !== "WAITING_FOR_PLAYERS") {
      throw new Error("Duel is not accepting new players");
    }

    if (duel.players.includes(userId)) {
      throw new Error("User is already in this duel");
    }

    // Add player and their wizards to the duel
    const updatedPlayers = [...duel.players, userId];
    const updatedWizards = [...duel.wizards, ...wizards];

    // Initialize points and hit points for new wizards
    const updatedPoints = { ...duel.points };
    const updatedHitPoints = { ...duel.hitPoints };
    const updatedNeedActionsFrom = [...duel.needActionsFrom];

    wizards.forEach((wizardId) => {
      updatedPoints[wizardId] = 0;
      updatedHitPoints[wizardId] = 100;
      updatedNeedActionsFrom.push(wizardId);
    });

    await ctx.db.patch(duelId, {
      players: updatedPlayers,
      wizards: updatedWizards,
      points: updatedPoints,
      hitPoints: updatedHitPoints,
      needActionsFrom: updatedNeedActionsFrom,
    });

    return duelId;
  },
});

// Start a duel (change status from waiting to in progress)
export const startDuel = mutation({
  args: { duelId: v.id("duels") },
  handler: async (ctx, { duelId }) => {
    const duel = await ctx.db.get(duelId);
    if (!duel) {
      throw new Error("Duel not found");
    }

    if (duel.status !== "WAITING_FOR_PLAYERS") {
      throw new Error("Duel cannot be started");
    }

    // Schedule the introduction generation
    ctx.scheduler.runAfter(0, api.duelIntroduction.generateDuelIntroduction, {
      duelId,
    });

    return duelId;
  },
});

// Cast a spell in the current round
export const castSpell = mutation({
  args: {
    duelId: v.id("duels"),
    wizardId: v.id("wizards"),
    spellDescription: v.string(),
  },
  handler: async (ctx, { duelId, wizardId, spellDescription }) => {
    const duel = await ctx.db.get(duelId);
    if (!duel) {
      throw new Error("Duel not found");
    }

    if (duel.status !== "IN_PROGRESS") {
      throw new Error("Duel is not in progress");
    }

    // Get the current round
    const currentRound = await ctx.db
      .query("duelRounds")
      .withIndex("by_duel", (q) => q.eq("duelId", duelId))
      .filter((q) => q.eq(q.field("roundNumber"), duel.currentRound))
      .first();

    if (!currentRound) {
      throw new Error("Current round not found");
    }

    if (currentRound.status !== "WAITING_FOR_SPELLS") {
      throw new Error("Round is not accepting spells");
    }

    // Add the spell to the round
    const currentSpells = currentRound.spells || {};
    const updatedSpells = {
      ...currentSpells,
      [wizardId]: {
        description: spellDescription,
        castBy: wizardId,
        timestamp: Date.now(),
      },
    };

    await ctx.db.patch(currentRound._id, {
      spells: updatedSpells,
    });

    // Remove wizard from needActionsFrom
    const updatedNeedActions = duel.needActionsFrom.filter(
      (id) => id !== wizardId
    );
    await ctx.db.patch(duelId, {
      needActionsFrom: updatedNeedActions,
    });

    // If all wizards have cast spells, mark round as ready for processing and trigger processing
    if (updatedNeedActions.length === 0) {
      await ctx.db.patch(currentRound._id, {
        status: "PROCESSING" as DuelRoundStatus,
      });

      // Schedule round processing
      ctx.scheduler.runAfter(0, api.processDuelRound.processDuelRound, {
        duelId,
        roundId: currentRound._id,
      });
    }

    return currentRound._id;
  },
});
// Complete a round with outcome
export const completeRound = mutation({
  args: {
    roundId: v.id("duelRounds"),
    outcome: v.object({
      narrative: v.string(),
      result: v.optional(v.string()),
      illustration: v.optional(v.string()),
      illustrationPrompt: v.optional(v.string()),
      pointsAwarded: v.optional(v.record(v.string(), v.number())),
      healthChange: v.optional(v.record(v.string(), v.number())),
    }),
  },
  handler: async (ctx, { roundId, outcome }) => {
    const round = await ctx.db.get(roundId);
    if (!round) {
      throw new Error("Round not found");
    }

    const duel = await ctx.db.get(round.duelId);
    if (!duel) {
      throw new Error("Duel not found");
    }

    // Update round with outcome
    await ctx.db.patch(roundId, {
      outcome,
      status: "COMPLETED" as DuelRoundStatus,
    });

    // Update duel points and hit points
    const updatedPoints: Record<string, number> = { ...duel.points };
    const updatedHitPoints: Record<string, number> = { ...duel.hitPoints };

    if (outcome.pointsAwarded) {
      Object.entries(outcome.pointsAwarded).forEach(([wizardId, points]) => {
        updatedPoints[wizardId] =
          (updatedPoints[wizardId] || 0) + (points as number);
      });
    }

    if (outcome.healthChange) {
      Object.entries(outcome.healthChange).forEach(
        ([wizardId, healthChange]) => {
          updatedHitPoints[wizardId] = Math.max(
            0,
            (updatedHitPoints[wizardId] || 100) + (healthChange as number)
          );
        }
      );
    }

    // Check if duel should end
    const shouldEndDuel = checkDuelEndConditions(duel, updatedHitPoints);

    if (shouldEndDuel.shouldEnd) {
      await ctx.db.patch(duel._id, {
        status: "COMPLETED" as DuelStatus,
        points: updatedPoints,
        hitPoints: updatedHitPoints,
        winners: shouldEndDuel.winners,
        losers: shouldEndDuel.losers,
      });

      // Update wizard stats
      if (shouldEndDuel.winners && shouldEndDuel.losers) {
        for (const winnerId of shouldEndDuel.winners) {
          await ctx.runMutation(api.wizards.updateWizardStats, {
            wizardId: winnerId,
            won: true,
          });
        }
        for (const loserId of shouldEndDuel.losers) {
          await ctx.runMutation(api.wizards.updateWizardStats, {
            wizardId: loserId,
            won: false,
          });
        }
      }
    } else {
      // Start next round
      const nextRoundNumber = duel.currentRound + 1;

      await ctx.db.insert("duelRounds", {
        duelId: duel._id,
        roundNumber: nextRoundNumber,
        type: "SPELL_CASTING" as DuelRoundType,
        status: "WAITING_FOR_SPELLS" as DuelRoundStatus,
      });

      await ctx.db.patch(duel._id, {
        currentRound: nextRoundNumber,
        points: updatedPoints,
        hitPoints: updatedHitPoints,
        needActionsFrom: duel.wizards, // All wizards need to act again
      });
    }

    return roundId;
  },
});

// Helper function to check if duel should end
function checkDuelEndConditions(
  duel: {
    wizards: Id<"wizards">[];
    numberOfRounds: number | "TO_THE_DEATH";
    currentRound: number;
    points: Record<string, number>;
  },
  hitPoints: Record<string, number>
): {
  shouldEnd: boolean;
  winners?: Id<"wizards">[];
  losers?: Id<"wizards">[];
} {
  // Check if any wizard has 0 hit points (death condition)
  const aliveWizards = duel.wizards.filter(
    (wizardId: Id<"wizards">) => (hitPoints[wizardId] || 0) > 0
  );

  if (aliveWizards.length <= 1) {
    return {
      shouldEnd: true,
      winners: aliveWizards,
      losers: duel.wizards.filter(
        (wizardId: Id<"wizards">) => !aliveWizards.includes(wizardId)
      ),
    };
  }

  // Check if we've reached the maximum number of rounds (if not "TO_THE_DEATH")
  if (
    typeof duel.numberOfRounds === "number" &&
    duel.currentRound >= duel.numberOfRounds
  ) {
    // Determine winner by points, then by hit points
    const wizardScores = duel.wizards.map((wizardId: Id<"wizards">) => ({
      wizardId,
      points: duel.points[wizardId] || 0,
      hitPoints: hitPoints[wizardId] || 0,
    }));

    wizardScores.sort(
      (
        a: { points: number; hitPoints: number },
        b: { points: number; hitPoints: number }
      ) => {
        if (a.points !== b.points) return b.points - a.points;
        return b.hitPoints - a.hitPoints;
      }
    );

    const highestScore = wizardScores[0];
    const winners = wizardScores
      .filter(
        (w: { points: number; hitPoints: number; wizardId: Id<"wizards"> }) =>
          w.points === highestScore.points &&
          w.hitPoints === highestScore.hitPoints
      )
      .map((w: { wizardId: Id<"wizards"> }) => w.wizardId);

    const losers = wizardScores
      .filter(
        (w: { points: number; hitPoints: number; wizardId: Id<"wizards"> }) =>
          !(
            w.points === highestScore.points &&
            w.hitPoints === highestScore.hitPoints
          )
      )
      .map((w: { wizardId: Id<"wizards"> }) => w.wizardId);

    return {
      shouldEnd: true,
      winners,
      losers,
    };
  }

  return { shouldEnd: false };
}

// Cancel a duel
export const cancelDuel = mutation({
  args: { duelId: v.id("duels") },
  handler: async (ctx, { duelId }) => {
    const duel = await ctx.db.get(duelId);
    if (!duel) {
      throw new Error("Duel not found");
    }

    if (duel.status === "COMPLETED") {
      throw new Error("Cannot cancel a completed duel");
    }

    await ctx.db.patch(duelId, {
      status: "CANCELLED" as DuelStatus,
    });

    return duelId;
  },
});

// Get active duels (in progress or waiting for players)
export const getActiveDuels = query({
  args: {},
  handler: async (ctx) => {
    const inProgressDuels = await ctx.db
      .query("duels")
      .withIndex("by_status", (q) => q.eq("status", "IN_PROGRESS"))
      .collect();

    const waitingDuels = await ctx.db
      .query("duels")
      .withIndex("by_status", (q) => q.eq("status", "WAITING_FOR_PLAYERS"))
      .collect();

    return [...inProgressDuels, ...waitingDuels];
  },
});

// Get duels by session ID
export const getDuelsBySession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db
      .query("duels")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();
  },
});

// Update duel featured illustration
export const updateFeaturedIllustration = mutation({
  args: {
    duelId: v.id("duels"),
    illustration: v.string(),
  },
  handler: async (ctx, { duelId, illustration }) => {
    await ctx.db.patch(duelId, {
      featuredIllustration: illustration,
    });
    return duelId;
  },
});

// Get duels for a specific wizard
export const getWizardDuels = query({
  args: { wizardId: v.id("wizards") },
  handler: async (ctx, { wizardId }) => {
    const duels = await ctx.db.query("duels").collect();

    // Filter duels that include this wizard
    return duels
      .filter((duel) => duel.wizards.includes(wizardId))
      .sort((a, b) => b.createdAt - a.createdAt); // Most recent first
  },
});

// Get duel statistics for a player
export const getPlayerDuelStats = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const duels = await ctx.db.query("duels").collect();

    const playerDuels = duels.filter((duel) => duel.players.includes(userId));

    const stats = {
      totalDuels: playerDuels.length,
      wins: 0,
      losses: 0,
      inProgress: 0,
      cancelled: 0,
    };

    playerDuels.forEach((duel) => {
      switch (duel.status) {
        case "COMPLETED":
          // Check if any of the player's wizards won
          const playerWizards = duel.wizards.filter(() => {
            // This would need to be enhanced to properly check wizard ownership
            return true; // Simplified for now
          });

          const hasWinningWizard = duel.winners?.some((winnerId) =>
            playerWizards.includes(winnerId)
          );

          if (hasWinningWizard) {
            stats.wins++;
          } else {
            stats.losses++;
          }
          break;
        case "IN_PROGRESS":
        case "WAITING_FOR_PLAYERS":
          stats.inProgress++;
          break;
        case "CANCELLED":
          stats.cancelled++;
          break;
      }
    });

    return stats;
  },
});

// Create introduction round (round 0)
export const createIntroductionRound = mutation({
  args: {
    duelId: v.id("duels"),
    outcome: v.object({
      narrative: v.string(),
      result: v.optional(v.string()),
      illustration: v.optional(v.string()),
      illustrationPrompt: v.optional(v.string()),
      pointsAwarded: v.optional(v.record(v.string(), v.number())),
      healthChange: v.optional(v.record(v.string(), v.number())),
    }),
  },
  handler: async (ctx, { duelId, outcome }) => {
    const roundId = await ctx.db.insert("duelRounds", {
      duelId,
      roundNumber: 0, // Introduction round
      type: "SPELL_CASTING" as DuelRoundType,
      status: "COMPLETED" as DuelRoundStatus,
      outcome,
    });

    return roundId;
  },
});

// Update round illustration
export const updateRoundIllustration = mutation({
  args: {
    roundId: v.id("duelRounds"),
    illustration: v.string(),
  },
  handler: async (ctx, { roundId, illustration }) => {
    const round = await ctx.db.get(roundId);
    if (!round) {
      throw new Error("Round not found");
    }

    const updatedOutcome = {
      ...round.outcome,
      illustration,
      narrative: round.outcome?.narrative || "",
    };

    await ctx.db.patch(roundId, {
      outcome: updatedOutcome,
    });

    return roundId;
  },
});

// Start duel after introduction (move to round 1)
export const startDuelAfterIntroduction = mutation({
  args: { duelId: v.id("duels") },
  handler: async (ctx, { duelId }) => {
    const duel = await ctx.db.get(duelId);
    if (!duel) {
      throw new Error("Duel not found");
    }

    // Create the first actual round
    await ctx.db.insert("duelRounds", {
      duelId,
      roundNumber: 1,
      type: "SPELL_CASTING" as DuelRoundType,
      status: "WAITING_FOR_SPELLS" as DuelRoundStatus,
    });

    await ctx.db.patch(duelId, {
      status: "IN_PROGRESS" as DuelStatus,
      currentRound: 1,
      needActionsFrom: duel.wizards, // All wizards need to act
    });

    return duelId;
  },
});
// Manually trigger round processing (useful for testing or retries)
export const triggerRoundProcessing = mutation({
  args: {
    duelId: v.id("duels"),
    roundId: v.id("duelRounds"),
  },
  handler: async (ctx, { duelId, roundId }) => {
    const round = await ctx.db.get(roundId);
    if (!round) {
      throw new Error("Round not found");
    }

    if (round.status !== "PROCESSING") {
      await ctx.db.patch(roundId, {
        status: "PROCESSING" as DuelRoundStatus,
      });
    }

    // Schedule round processing
    ctx.scheduler.runAfter(0, api.processDuelRound.processDuelRound, {
      duelId,
      roundId,
    });

    return roundId;
  },
});
// Create conclusion round (final round after duel completion)
export const createConclusionRound = mutation({
  args: {
    duelId: v.id("duels"),
    roundNumber: v.number(),
    outcome: v.object({
      narrative: v.string(),
      result: v.optional(v.string()),
      illustration: v.optional(v.string()),
      illustrationPrompt: v.optional(v.string()),
      pointsAwarded: v.optional(v.record(v.string(), v.number())),
      healthChange: v.optional(v.record(v.string(), v.number())),
    }),
  },
  handler: async (ctx, { duelId, roundNumber, outcome }) => {
    const roundId = await ctx.db.insert("duelRounds", {
      duelId,
      roundNumber,
      type: "CONCLUSION" as DuelRoundType,
      status: "COMPLETED" as DuelRoundStatus,
      outcome,
    });

    return roundId;
  },
});
