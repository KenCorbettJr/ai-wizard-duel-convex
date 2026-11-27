import {
  query,
  mutation,
  internalQuery,
  internalMutation,
  MutationCtx,
} from "./_generated/server";
import { scheduleDuelRating } from "./lib/scheduleDuelRating";
import { syncDuelParticipants } from "./lib/duelParticipants";
import {
  createNotification,
  scheduleDuelResultNotifications,
  scheduleTurnReminders,
} from "./notifications";
import { rewardReferralsForCompletedDuel } from "./referrals";
import { ConvexError, v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

import { api, internal } from "./_generated/api";
import { narrationValidator } from "./lib/narrationValidator";
import {
  assertCanAffordDuelToken,
  chargeDuelToken,
  refundDuelTokens,
} from "./lib/duelTokens";
import { TO_THE_DEATH_MAX_ROUNDS } from "./lib/pricing";
import { scheduleRoundNarration } from "./lib/scheduleNarration";
import { pickTeaserIllustration } from "./lib/socialIllustration";
import {
  verifySuperAdmin,
  debugUserMetadata,
  checkSuperAdminAccess,
} from "./auth.utils";

// Types for better type safety
export type DuelStatus =
  "WAITING_FOR_PLAYERS" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type DuelRoundStatus = "WAITING_FOR_SPELLS" | "PROCESSING" | "COMPLETED";
export type DuelRoundType =
  "SPELL_CASTING" | "COUNTER_SPELL" | "FINAL_ROUND" | "CONCLUSION";
export type DuelLengthOption = "TO_THE_DEATH";

// Get all duels for the authenticated player
export const getPlayerDuels = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("duels"),
      _creationTime: v.number(),
      numberOfRounds: v.union(v.number(), v.literal("TO_THE_DEATH")),
      wizards: v.array(v.id("wizards")),
      players: v.array(v.string()),
      status: v.union(
        v.literal("WAITING_FOR_PLAYERS"),
        v.literal("IN_PROGRESS"),
        v.literal("COMPLETED"),
        v.literal("CANCELLED"),
      ),
      currentRound: v.number(),
      createdAt: v.number(),
      completedAt: v.optional(v.number()),
      points: v.record(v.string(), v.number()),
      hitPoints: v.record(v.string(), v.number()),
      needActionsFrom: v.array(v.id("wizards")),
      featuredIllustration: v.optional(v.string()),
      winners: v.optional(v.array(v.id("wizards"))),
      losers: v.optional(v.array(v.id("wizards"))),
      shortcode: v.optional(v.string()),
      textOnlyMode: v.optional(v.boolean()),
      textOnlyReason: v.optional(v.string()),
      imageCreditConsumed: v.optional(v.boolean()),
      imageCreditConsumedBy: v.optional(v.string()),
      tokensCharged: v.optional(v.array(v.string())),
      tokensRefunded: v.optional(v.boolean()),
      creatorCoversEntry: v.optional(v.boolean()),
      isCampaignBattle: v.optional(v.boolean()),
      rematchDuelId: v.optional(v.id("duels")),
      chatEnabled: v.optional(v.boolean()),
      forfeitedBy: v.optional(v.id("wizards")),
      challengedUserId: v.optional(v.string()),
      challengedWizardId: v.optional(v.id("wizards")),
      sponsorshipId: v.optional(v.id("sponsorships")),
    }),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const duels = await ctx.db.query("duels").collect();

    // Filter duels that include this player
    return duels.filter((duel) => duel.players.includes(identity.subject));
  },
});

// Get completed duels for the authenticated player
export const getPlayerCompletedDuels = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const duels = await ctx.db.query("duels").collect();

    // Filter duels that include this player and are completed
    return duels
      .filter(
        (duel) =>
          duel.players.includes(identity.subject) &&
          duel.status === "COMPLETED",
      )
      .sort((a, b) => b.createdAt - a.createdAt); // Most recent first
  },
});

// Get a specific duel by ID (only for participants or public viewing)
export const getDuel = query({
  args: { duelId: v.id("duels") },
  handler: async (ctx, { duelId }) => {
    const duel = await ctx.db.get(duelId);
    if (!duel) return null;

    // Allow public viewing of all duels - no authentication required for spectating

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

// Internal query to get duel data without access control (for system operations)
export const getDuelInternal = internalQuery({
  args: { duelId: v.id("duels") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("duels"),
      _creationTime: v.number(),
      numberOfRounds: v.union(v.number(), v.literal("TO_THE_DEATH")),
      wizards: v.array(v.id("wizards")),
      players: v.array(v.string()),
      status: v.union(
        v.literal("WAITING_FOR_PLAYERS"),
        v.literal("IN_PROGRESS"),
        v.literal("COMPLETED"),
        v.literal("CANCELLED"),
      ),
      currentRound: v.number(),
      createdAt: v.number(),
      completedAt: v.optional(v.number()),
      points: v.record(v.string(), v.number()),
      hitPoints: v.record(v.string(), v.number()),
      needActionsFrom: v.array(v.id("wizards")),
      featuredIllustration: v.optional(v.string()),
      winners: v.optional(v.array(v.id("wizards"))),
      losers: v.optional(v.array(v.id("wizards"))),
      shortcode: v.optional(v.string()),
      textOnlyMode: v.optional(v.boolean()),
      textOnlyReason: v.optional(v.string()),
      imageCreditConsumed: v.optional(v.boolean()),
      imageCreditConsumedBy: v.optional(v.string()),
      tokensCharged: v.optional(v.array(v.string())),
      tokensRefunded: v.optional(v.boolean()),
      creatorCoversEntry: v.optional(v.boolean()),
      isCampaignBattle: v.optional(v.boolean()),
      rematchDuelId: v.optional(v.id("duels")),
      chatEnabled: v.optional(v.boolean()),
      forfeitedBy: v.optional(v.id("wizards")),
      challengedUserId: v.optional(v.string()),
      challengedWizardId: v.optional(v.id("wizards")),
      sponsorshipId: v.optional(v.id("sponsorships")),
      rounds: v.array(
        v.object({
          _id: v.id("duelRounds"),
          _creationTime: v.number(),
          duelId: v.id("duels"),
          roundNumber: v.number(),
          type: v.union(
            v.literal("SPELL_CASTING"),
            v.literal("COUNTER_SPELL"),
            v.literal("FINAL_ROUND"),
            v.literal("CONCLUSION"),
          ),
          spells: v.optional(
            v.record(
              v.string(),
              v.object({
                description: v.string(),
                castBy: v.id("wizards"),
                timestamp: v.number(),
              }),
            ),
          ),
          outcome: v.optional(
            v.object({
              narrative: v.string(),
              result: v.optional(v.string()),
              illustration: v.optional(v.string()),
              illustrationPrompt: v.optional(v.string()),
              pointsAwarded: v.optional(v.record(v.string(), v.number())),
              healthChange: v.optional(v.record(v.string(), v.number())),
              luckRolls: v.optional(v.record(v.string(), v.number())),
            }),
          ),
          status: v.union(
            v.literal("WAITING_FOR_SPELLS"),
            v.literal("PROCESSING"),
            v.literal("COMPLETED"),
          ),
          narration: v.optional(narrationValidator),
          illustrationStatus: v.optional(
            v.union(v.literal("PENDING"), v.literal("FAILED")),
          ),
        }),
      ),
    }),
  ),
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
        q.eq("shortcode", shortcode.toUpperCase()),
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

// Insert a new duel that is waiting for an opponent
async function insertWaitingDuel(
  ctx: MutationCtx,
  {
    userId,
    numberOfRounds,
    wizards,
    coverOpponentEntry = false,
    chatEnabled = true,
    challenge,
  }: {
    userId: string;
    numberOfRounds: number | "TO_THE_DEATH";
    wizards: Id<"wizards">[];
    coverOpponentEntry?: boolean;
    chatEnabled?: boolean;
    challenge?: { userId: string; wizardId: Id<"wizards"> };
  },
): Promise<Id<"duels">> {
  // A token is only taken when a second player joins and the duel starts.
  // Until then, just make sure the creator could pay for it (and for their
  // opponent's entry, when they offered to cover it).
  await assertCanAffordDuelToken(
    ctx,
    userId,
    "you",
    coverOpponentEntry ? 2 : 1,
  );

  const players = [userId];
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
    shortcode,
    // Every duel is illustrated; images are core to the game.
    textOnlyMode: false,
    creatorCoversEntry: coverOpponentEntry || undefined,
    chatEnabled,
    challengedUserId: challenge?.userId,
    challengedWizardId: challenge?.wizardId,
  });
  await syncDuelParticipants(ctx, duelId);
  return duelId;
}

// Create a new duel
export const createDuel = mutation({
  args: {
    numberOfRounds: v.union(v.number(), v.literal("TO_THE_DEATH")),
    wizards: v.array(v.id("wizards")),
    // Ignored: every duel has images. Still accepted so older clients work.
    enableImageGeneration: v.optional(v.boolean()),
    // Creator pays their opponent's token too, so a friend can play free
    coverOpponentEntry: v.optional(v.boolean()),
    // Lets the two duelists chat. Either of them can still turn it off later.
    enableChat: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    { numberOfRounds, wizards, coverOpponentEntry = false, enableChat = true },
  ) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify that all wizards belong to the authenticated user
    for (const wizardId of wizards) {
      const wizard = await ctx.db.get(wizardId);
      if (!wizard || wizard.owner !== identity.subject) {
        throw new Error("Not authorized to use one or more of these wizards");
      }
    }

    const duelId = await insertWaitingDuel(ctx, {
      userId: identity.subject,
      numberOfRounds,
      wizards,
      coverOpponentEntry,
      chatEnabled: enableChat,
    });

    return duelId;
  },
});

// Add a player and their wizards to a waiting duel, and start the duel
// introduction once there are two players
async function addPlayerToDuel(
  ctx: MutationCtx,
  duel: Doc<"duels">,
  userId: string,
  wizards: Id<"wizards">[],
): Promise<void> {
  const duelId = duel._id;
  if (duel.players.length >= 2) {
    throw new ConvexError("This duel already has two players.");
  }

  // The duel starts when the second player joins, so both players pay now.
  // Any failure here throws and rolls the whole join back.
  if (duel.players.length + 1 >= 2) {
    if (duel.creatorCoversEntry) {
      // The creator gifted this entry: they pay both tokens and the joiner
      // pays nothing. Re-check, since they may have spent tokens meanwhile.
      for (const playerId of duel.players) {
        await assertCanAffordDuelToken(ctx, playerId, "creator", 2);
        await chargeDuelToken(ctx, playerId, duelId, "pvp_duel");
        await chargeDuelToken(ctx, playerId, duelId, "pvp_duel", userId);
      }
    } else {
      // Joiner first: the message is about them. Then re-check the creator,
      // who may have spent their tokens while the duel was waiting.
      await chargeDuelToken(ctx, userId, duelId, "pvp_duel");
      for (const playerId of duel.players) {
        await assertCanAffordDuelToken(ctx, playerId, "creator");
        await chargeDuelToken(ctx, playerId, duelId, "pvp_duel");
      }
    }
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
  await syncDuelParticipants(ctx, duelId);

  // Auto-start the duel if we now have 2 players
  if (updatedPlayers.length >= 2) {
    // Schedule the duel introduction generation which will automatically start the duel
    // Skip scheduling in test environment to avoid transaction escape errors
    if (process.env.NODE_ENV !== "test") {
      await ctx.scheduler.runAfter(
        100, // Add small delay to ensure database transaction is committed
        api.duelIntroduction.generateDuelIntroduction,
        {
          duelId,
          userId: updatedPlayers[0], // Use first player for credit consumption
        },
      );
    }
  }
}

// Join a duel
export const joinDuel = mutation({
  args: {
    duelId: v.id("duels"),
    wizards: v.array(v.id("wizards")),
  },
  handler: async (ctx, { duelId, wizards }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify that all wizards belong to the authenticated user
    for (const wizardId of wizards) {
      const wizard = await ctx.db.get(wizardId);
      if (!wizard || wizard.owner !== identity.subject) {
        throw new Error("Not authorized to use one or more of these wizards");
      }
    }

    const userId = identity.subject;
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

    if (duel.challengedUserId) {
      if (duel.challengedUserId !== userId) {
        throw new ConvexError(
          "This duel is a private challenge for another wizard.",
        );
      }
      if (wizards.length !== 1 || wizards[0] !== duel.challengedWizardId) {
        throw new ConvexError(
          "Accept this challenge with the wizard it names.",
        );
      }
    }

    await addPlayerToDuel(ctx, duel, userId, wizards);

    return duelId;
  },
});

// How many unanswered challenges one player can have out at once
export const MAX_PENDING_CHALLENGES = 5;

// Challenge another player's wizard to a duel. Creates a waiting duel that
// only that wizard's owner can join, and tells them about it.
export const challengeWizard = mutation({
  args: {
    wizardId: v.id("wizards"),
    opponentWizardId: v.id("wizards"),
    numberOfRounds: v.union(v.number(), v.literal("TO_THE_DEATH")),
    // Ignored: every duel has images. Still accepted so older clients work.
    enableImageGeneration: v.optional(v.boolean()),
    coverOpponentEntry: v.optional(v.boolean()),
    enableChat: v.optional(v.boolean()),
  },
  returns: v.id("duels"),
  handler: async (
    ctx,
    {
      wizardId,
      opponentWizardId,
      numberOfRounds,
      coverOpponentEntry = false,
      enableChat = true,
    },
  ) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }
    const userId = identity.subject;

    const wizard = await ctx.db.get(wizardId);
    if (!wizard || wizard.owner !== userId) {
      throw new ConvexError("Not authorized to use this wizard");
    }
    const opponent = await ctx.db.get(opponentWizardId);
    if (!opponent) {
      throw new ConvexError("That wizard no longer exists.");
    }
    if (opponent.owner === userId) {
      throw new ConvexError("You can't challenge your own wizard.");
    }
    const opponentUser =
      opponent.owner === "campaign" || opponent.owner === "departed"
        ? null
        : await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", opponent.owner))
            .unique();
    if (!opponentUser || opponent.isCampaignOpponent) {
      throw new ConvexError("This wizard can't be challenged.");
    }

    const myLive = await ctx.db
      .query("duelParticipants")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    let pending = 0;
    for (const { duelId } of myLive) {
      const d = await ctx.db.get(duelId);
      if (
        !d ||
        d.status !== "WAITING_FOR_PLAYERS" ||
        !d.challengedUserId ||
        d.players[0] !== userId
      ) {
        continue;
      }
      if (d.challengedWizardId === opponentWizardId) {
        throw new ConvexError(
          `You've already challenged ${opponent.name}. Wait for an answer.`,
        );
      }
      pending++;
    }
    if (pending >= MAX_PENDING_CHALLENGES) {
      throw new ConvexError(
        `You have ${MAX_PENDING_CHALLENGES} challenges waiting for an answer. Cancel one or wait before sending another.`,
      );
    }

    const duelId = await insertWaitingDuel(ctx, {
      userId,
      numberOfRounds,
      wizards: [wizardId],
      coverOpponentEntry,
      chatEnabled: enableChat,
      challenge: { userId: opponent.owner, wizardId: opponentWizardId },
    });

    await createNotification(ctx, {
      userId: opponent.owner,
      type: "DUEL_CHALLENGE",
      title: `${wizard.name} challenges ${opponent.name}!`,
      body: coverOpponentEntry
        ? "They're covering your entry. Accept or decline the duel."
        : "Accept or decline the duel.",
      url: `/duels/${duelId}`,
      duelId,
      dedupeKey: `challenge:${duelId}`,
    });

    return duelId;
  },
});

// The challenged player accepts: their wizard joins and the duel begins.
export const acceptChallenge = mutation({
  args: { duelId: v.id("duels") },
  returns: v.id("duels"),
  handler: async (ctx, { duelId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }
    const userId = identity.subject;
    const duel = await ctx.db.get(duelId);
    if (!duel || !duel.challengedUserId || !duel.challengedWizardId) {
      throw new ConvexError("Challenge not found");
    }
    if (duel.challengedUserId !== userId) {
      throw new ConvexError("This challenge isn't for you.");
    }
    if (duel.status !== "WAITING_FOR_PLAYERS") {
      throw new ConvexError("This challenge is no longer open.");
    }
    if (duel.players.includes(userId)) {
      return duelId;
    }
    const wizard = await ctx.db.get(duel.challengedWizardId);
    if (!wizard || wizard.owner !== userId) {
      throw new ConvexError("The challenged wizard is no longer yours.");
    }

    await addPlayerToDuel(ctx, duel, userId, [duel.challengedWizardId]);

    await createNotification(ctx, {
      userId: duel.players[0],
      type: "DUEL_CHALLENGE",
      title: `${wizard.name} accepted your challenge!`,
      body: "The duel is starting.",
      url: `/duels/${duelId}`,
      duelId,
      dedupeKey: `challenge-accepted:${duelId}`,
    });

    return duelId;
  },
});

// The challenged player declines: the duel is cancelled and nobody pays.
export const declineChallenge = mutation({
  args: { duelId: v.id("duels") },
  returns: v.null(),
  handler: async (ctx, { duelId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }
    const userId = identity.subject;
    const duel = await ctx.db.get(duelId);
    if (!duel || duel.challengedUserId !== userId) {
      throw new ConvexError("Challenge not found");
    }
    if (duel.status === "CANCELLED") {
      return null;
    }
    if (duel.status !== "WAITING_FOR_PLAYERS") {
      throw new ConvexError("This challenge has already started.");
    }

    await ctx.db.patch(duelId, { status: "CANCELLED" as DuelStatus });
    await syncDuelParticipants(ctx, duelId);

    const wizard = duel.challengedWizardId
      ? await ctx.db.get(duel.challengedWizardId)
      : null;
    await createNotification(ctx, {
      userId: duel.players[0],
      type: "DUEL_CHALLENGE",
      title: `${wizard?.name ?? "Your opponent"} declined your challenge`,
      body: "Challenge another wizard, or find a match in the lobby.",
      url: `/duels/${duelId}`,
      duelId,
      dedupeKey: `challenge-declined:${duelId}`,
    });
    return null;
  },
});

// Open challenges sent to the signed-in player, newest first
export const getMyIncomingChallenges = query({
  args: {},
  returns: v.array(
    v.object({
      duelId: v.id("duels"),
      createdAt: v.number(),
      numberOfRounds: v.union(v.number(), v.literal("TO_THE_DEATH")),
      creatorCoversEntry: v.boolean(),
      challenger: v.object({
        _id: v.id("wizards"),
        name: v.string(),
        illustration: v.optional(v.string()),
      }),
      myWizard: v.object({ _id: v.id("wizards"), name: v.string() }),
    }),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const duels = await ctx.db
      .query("duels")
      .withIndex("by_challenged_user_and_status", (q) =>
        q
          .eq("challengedUserId", identity.subject)
          .eq("status", "WAITING_FOR_PLAYERS"),
      )
      .order("desc")
      .take(20);

    const rows = [];
    for (const duel of duels) {
      if (duel.players.includes(identity.subject)) continue;
      const challenger = await ctx.db.get(duel.wizards[0]);
      const mine = duel.challengedWizardId
        ? await ctx.db.get(duel.challengedWizardId)
        : null;
      if (!challenger || !mine) continue;
      rows.push({
        duelId: duel._id,
        createdAt: duel.createdAt,
        numberOfRounds: duel.numberOfRounds,
        creatorCoversEntry: !!duel.creatorCoversEntry,
        challenger: {
          _id: challenger._id,
          name: challenger.name,
          illustration: challenger.illustration,
        },
        myWizard: { _id: mine._id, name: mine.name },
      });
    }
    return rows;
  },
});

// Request a rematch of a completed duel. The first participant to ask creates
// a new waiting duel with their wizards and the same settings. The other
// participant joins it with their own wizards when they ask.
export const requestRematch = mutation({
  args: { duelId: v.id("duels") },
  returns: v.id("duels"),
  handler: async (ctx, { duelId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    const duel = await ctx.db.get(duelId);
    if (!duel) {
      throw new Error("Duel not found");
    }
    if (duel.status !== "COMPLETED") {
      throw new Error("Only completed duels can be rematched");
    }
    if (duel.isCampaignBattle) {
      throw new Error("Campaign battles cannot be rematched");
    }
    if (!duel.players.includes(userId)) {
      throw new Error("Only duel participants can request a rematch");
    }

    // This player's wizards from the original duel, if they still exist
    const myWizards: Id<"wizards">[] = [];
    for (const wizardId of duel.wizards) {
      const wizard = await ctx.db.get(wizardId);
      if (wizard && wizard.owner === userId) {
        myWizards.push(wizardId);
      }
    }
    if (myWizards.length === 0) {
      throw new Error("Your wizard from this duel no longer exists");
    }

    if (duel.rematchDuelId) {
      const rematch = await ctx.db.get(duel.rematchDuelId);
      if (rematch && rematch.status !== "CANCELLED") {
        if (
          rematch.status === "WAITING_FOR_PLAYERS" &&
          !rematch.players.includes(userId)
        ) {
          await addPlayerToDuel(ctx, rematch, userId, myWizards);
        }
        return rematch._id;
      }
    }

    const rematchId = await insertWaitingDuel(ctx, {
      userId,
      numberOfRounds: duel.numberOfRounds,
      wizards: myWizards,
      chatEnabled: duel.chatEnabled !== false,
    });
    await ctx.db.patch(duelId, { rematchDuelId: rematchId });
    return rematchId;
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

    // Skip duel introduction generation to avoid transaction escape errors in tests
    // Introduction generation is not critical for core duel functionality

    return duelId;
  },
});

// Cast a spell in the current round
// Called by watcher.castSpell after the Watcher approves the text.
export const castSpell = internalMutation({
  args: {
    duelId: v.id("duels"),
    wizardId: v.id("wizards"),
    spellDescription: v.string(),
  },
  handler: async (ctx, { duelId, wizardId, spellDescription }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify that the wizard belongs to the authenticated user
    const wizard = await ctx.db.get(wizardId);
    if (!wizard || wizard.owner !== identity.subject) {
      throw new Error("Not authorized to cast spells with this wizard");
    }
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

    // Check if the wizard is participating in this duel
    if (!duel.wizards.includes(wizardId)) {
      throw new Error("Wizard is not participating in this duel");
    }

    // Check if the wizard has already cast a spell this round
    if (currentRound.spells && currentRound.spells[wizardId]) {
      throw new Error("Wizard has already cast a spell this round");
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
      (id) => id !== wizardId,
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
      if (process.env.NODE_ENV !== "test") {
        await ctx.scheduler.runAfter(
          100,
          internal.processDuelRound.processDuelRound,
          {
            duelId,
            roundId: currentRound._id,
          },
        );
      }
    } else if (duel.isCampaignBattle) {
      // For campaign battles, check if any remaining wizards are campaign opponents
      // and generate their actions automatically
      if (process.env.NODE_ENV !== "test") {
        await ctx.scheduler.runAfter(
          500, // Small delay to ensure database is updated
          internal.campaignOpponentAI.processCampaignOpponentActions,
          { duelId },
        );
      }
    }

    return currentRound._id;
  },
});

// Undo a spell cast in the current round (only while waiting for other wizards)
export const undoSpell = mutation({
  args: {
    duelId: v.id("duels"),
    wizardId: v.id("wizards"),
  },
  handler: async (ctx, { duelId, wizardId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify that the wizard belongs to the authenticated user
    const wizard = await ctx.db.get(wizardId);
    if (!wizard || wizard.owner !== identity.subject) {
      throw new Error("Not authorized to undo spells for this wizard");
    }

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
      throw new Error(
        "Cannot undo spell - round is no longer accepting spells",
      );
    }

    // Check if the wizard is participating in this duel
    if (!duel.wizards.includes(wizardId)) {
      throw new Error("Wizard is not participating in this duel");
    }

    // Check if the wizard has actually cast a spell this round
    if (!currentRound.spells || !currentRound.spells[wizardId]) {
      throw new Error(
        "No spell to undo - wizard has not cast a spell this round",
      );
    }

    // Remove the spell from the round
    const currentSpells = currentRound.spells || {};
    const updatedSpells = { ...currentSpells };
    delete updatedSpells[wizardId];

    await ctx.db.patch(currentRound._id, {
      spells: Object.keys(updatedSpells).length > 0 ? updatedSpells : undefined,
    });

    // Add wizard back to needActionsFrom if not already there
    const updatedNeedActions = duel.needActionsFrom.includes(wizardId)
      ? duel.needActionsFrom
      : [...duel.needActionsFrom, wizardId];

    await ctx.db.patch(duelId, {
      needActionsFrom: updatedNeedActions,
    });

    return currentRound._id;
  },
});

// Complete a round with outcome
export const completeRound = internalMutation({
  args: {
    roundId: v.id("duelRounds"),
    outcome: v.object({
      narrative: v.string(),
      result: v.optional(v.string()),
      illustration: v.optional(v.string()),
      illustrationPrompt: v.optional(v.string()),
      pointsAwarded: v.optional(v.record(v.string(), v.number())),
      healthChange: v.optional(v.record(v.string(), v.number())),
      luckRolls: v.optional(v.record(v.string(), v.number())),
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

    await scheduleRoundNarration(ctx, roundId);

    // The duel ended while this round was being written (a forfeit). Keep the
    // round for the replay, but leave the duel's result alone.
    if (duel.status === "COMPLETED" || duel.status === "CANCELLED") {
      return roundId;
    }

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
            (updatedHitPoints[wizardId] ?? 100) + (healthChange as number),
          );
        },
      );
    }

    // Check if duel should end
    const shouldEndDuel = checkDuelEndConditions(
      { ...duel, points: updatedPoints },
      updatedHitPoints,
    );

    if (shouldEndDuel.shouldEnd) {
      await ctx.db.patch(duel._id, {
        status: "COMPLETED" as DuelStatus,
        completedAt: Date.now(),
        points: updatedPoints,
        hitPoints: updatedHitPoints,
        winners: shouldEndDuel.winners,
        losers: shouldEndDuel.losers,
      });
      await syncDuelParticipants(ctx, duel._id);

      await afterDuelCompleted(
        ctx,
        duel,
        shouldEndDuel.winners ?? [],
        shouldEndDuel.losers ?? [],
      );
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

      // Remind anyone who stepped away that it's time to cast.
      await scheduleTurnReminders(ctx, duel._id, nextRoundNumber);

      // For campaign battles, automatically generate actions for campaign opponents
      if (duel.isCampaignBattle && process.env.NODE_ENV !== "test") {
        await ctx.scheduler.runAfter(
          1000, // Small delay to ensure database is updated
          internal.campaignOpponentAI.processCampaignOpponentActions,
          { duelId: duel._id },
        );
      }
    }

    return roundId;
  },
});

/**
 * Everything that follows a duel finishing, however it finished: wizard
 * records, referral bonuses, result notifications, the AI rating and campaign
 * progress. Call once, right after the duel is marked COMPLETED.
 */
async function afterDuelCompleted(
  ctx: MutationCtx,
  duel: Doc<"duels">,
  winners: Id<"wizards">[],
  losers: Id<"wizards">[],
) {
  // The final round can't be the teaser any more
  await refreshFeaturedIllustration(ctx, duel._id);
  for (const winnerId of winners) {
    await ctx.runMutation(internal.wizards.updateWizardStatsInternal, {
      wizardId: winnerId,
      won: true,
      isCampaignBattle: duel.isCampaignBattle || false,
    });
  }
  for (const loserId of losers) {
    await ctx.runMutation(internal.wizards.updateWizardStatsInternal, {
      wizardId: loserId,
      won: false,
      isCampaignBattle: duel.isCampaignBattle || false,
    });
  }

  // A new player's first finished duel unlocks any referral bonus.
  await rewardReferralsForCompletedDuel(ctx, duel.players);

  // Tell players who weren't watching how it ended.
  await scheduleDuelResultNotifications(ctx, duel._id);

  // Rate finished player duels so admins can pick highlights
  if (!duel.isCampaignBattle) {
    await scheduleDuelRating(ctx, duel._id);
  }

  if (duel.isCampaignBattle) {
    await ctx.runMutation(internal.campaigns.completeCampaignBattleInternal, {
      duelId: duel._id,
      winners,
      losers,
    });
  }
}

/**
 * End an in-progress duel because a player gave up. Their wizard(s) lose and
 * everyone else's win. A round still waiting for spells is dropped, so the
 * replay ends on the last round that was actually fought.
 */
export async function forfeitDuelFor(
  ctx: MutationCtx,
  duel: Doc<"duels">,
  forfeitingWizards: Id<"wizards">[],
): Promise<void> {
  if (duel.status !== "IN_PROGRESS") {
    throw new ConvexError("Only a duel in progress can be forfeited.");
  }
  const losers = duel.wizards.filter((id) => forfeitingWizards.includes(id));
  const winners = duel.wizards.filter((id) => !forfeitingWizards.includes(id));
  if (losers.length === 0) {
    throw new ConvexError("You don't have a wizard in this duel.");
  }

  const pending = await ctx.db
    .query("duelRounds")
    .withIndex("by_duel", (q) => q.eq("duelId", duel._id))
    .filter((q) => q.eq(q.field("status"), "WAITING_FOR_SPELLS"))
    .collect();
  for (const round of pending) {
    await ctx.db.delete(round._id);
  }

  await ctx.db.patch(duel._id, {
    status: "COMPLETED" as DuelStatus,
    completedAt: Date.now(),
    winners,
    losers,
    needActionsFrom: [],
    forfeitedBy: losers[0],
  });
  await syncDuelParticipants(ctx, duel._id);

  await afterDuelCompleted(ctx, duel, winners, losers);
}

/** Give up a duel in progress. The other player wins. */
export const forfeitDuel = mutation({
  args: { duelId: v.id("duels") },
  returns: v.null(),
  handler: async (ctx, { duelId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");
    const duel = await ctx.db.get(duelId);
    if (!duel) throw new ConvexError("Duel not found.");
    if (!duel.players.includes(identity.subject)) {
      throw new ConvexError("Only the duelists can forfeit this duel.");
    }

    const mine: Id<"wizards">[] = [];
    for (const id of duel.wizards) {
      const wizard = await ctx.db.get(id);
      if (wizard?.owner === identity.subject) mine.push(id);
    }
    await forfeitDuelFor(ctx, duel, mine);
    return null;
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
  hitPoints: Record<string, number>,
): {
  shouldEnd: boolean;
  winners?: Id<"wizards">[];
  losers?: Id<"wizards">[];
} {
  // Check if any wizard has 0 hit points (death condition)
  const aliveWizards = duel.wizards.filter(
    (wizardId: Id<"wizards">) => (hitPoints[wizardId] || 0) > 0,
  );

  if (aliveWizards.length <= 1) {
    return {
      shouldEnd: true,
      winners: aliveWizards,
      losers: duel.wizards.filter(
        (wizardId: Id<"wizards">) => !aliveWizards.includes(wizardId),
      ),
    };
  }

  // Check if we've reached the maximum number of rounds. "To the Death"
  // duels are capped too, so a token always covers a known cost.
  const maxRounds =
    typeof duel.numberOfRounds === "number"
      ? duel.numberOfRounds
      : TO_THE_DEATH_MAX_ROUNDS;
  if (duel.currentRound >= maxRounds) {
    // Determine winner by points, then by hit points
    const wizardScores = duel.wizards.map((wizardId: Id<"wizards">) => ({
      wizardId,
      points: duel.points[wizardId] || 0,
      hitPoints: hitPoints[wizardId] || 0,
    }));

    wizardScores.sort(
      (
        a: { points: number; hitPoints: number },
        b: { points: number; hitPoints: number },
      ) => {
        if (a.points !== b.points) return b.points - a.points;
        return b.hitPoints - a.hitPoints;
      },
    );

    const highestScore = wizardScores[0];
    const winners = wizardScores
      .filter(
        (w: { points: number; hitPoints: number; wizardId: Id<"wizards"> }) =>
          w.points === highestScore.points &&
          w.hitPoints === highestScore.hitPoints,
      )
      .map((w: { wizardId: Id<"wizards"> }) => w.wizardId);

    const losers = wizardScores
      .filter(
        (w: { points: number; hitPoints: number; wizardId: Id<"wizards"> }) =>
          !(
            w.points === highestScore.points &&
            w.hitPoints === highestScore.hitPoints
          ),
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
/**
 * Cancel a duel that hasn't started yet. Only a player in the duel can.
 * A duel in progress can't be cancelled; a player forfeits it instead.
 */
export const cancelDuel = mutation({
  args: { duelId: v.id("duels") },
  handler: async (ctx, { duelId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const duel = await ctx.db.get(duelId);
    if (!duel) {
      throw new ConvexError("Duel not found");
    }
    if (!duel.players.includes(identity.subject)) {
      throw new ConvexError("Only a player in this duel can cancel it.");
    }
    if (duel.status === "CANCELLED") {
      return duelId;
    }
    if (duel.status !== "WAITING_FOR_PLAYERS") {
      throw new ConvexError(
        "Only a duel that hasn't started can be cancelled. Forfeit it instead.",
      );
    }

    await ctx.db.patch(duelId, {
      status: "CANCELLED" as DuelStatus,
    });
    await syncDuelParticipants(ctx, duelId);

    return duelId;
  },
});

// Get active duels (in progress or waiting for players) - excludes campaign battles
export const getActiveDuels = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("duels"),
      _creationTime: v.number(),
      numberOfRounds: v.union(v.number(), v.literal("TO_THE_DEATH")),
      wizards: v.array(v.id("wizards")),
      players: v.array(v.string()),
      status: v.union(
        v.literal("WAITING_FOR_PLAYERS"),
        v.literal("IN_PROGRESS"),
        v.literal("COMPLETED"),
        v.literal("CANCELLED"),
      ),
      currentRound: v.number(),
      createdAt: v.number(),
      completedAt: v.optional(v.number()),
      points: v.record(v.string(), v.number()),
      hitPoints: v.record(v.string(), v.number()),
      needActionsFrom: v.array(v.id("wizards")),
      featuredIllustration: v.optional(v.string()),
      winners: v.optional(v.array(v.id("wizards"))),
      losers: v.optional(v.array(v.id("wizards"))),
      shortcode: v.optional(v.string()),
      textOnlyMode: v.optional(v.boolean()),
      textOnlyReason: v.optional(v.string()),
      imageCreditConsumed: v.optional(v.boolean()),
      imageCreditConsumedBy: v.optional(v.string()),
      tokensCharged: v.optional(v.array(v.string())),
      tokensRefunded: v.optional(v.boolean()),
      creatorCoversEntry: v.optional(v.boolean()),
      isCampaignBattle: v.optional(v.boolean()),
      rematchDuelId: v.optional(v.id("duels")),
      chatEnabled: v.optional(v.boolean()),
      forfeitedBy: v.optional(v.id("wizards")),
      challengedUserId: v.optional(v.string()),
      challengedWizardId: v.optional(v.id("wizards")),
      sponsorshipId: v.optional(v.id("sponsorships")),
    }),
  ),
  handler: async (ctx) => {
    const inProgressDuels = await ctx.db
      .query("duels")
      .withIndex("by_status", (q) => q.eq("status", "IN_PROGRESS"))
      .collect();

    const waitingDuels = await ctx.db
      .query("duels")
      .withIndex("by_status", (q) => q.eq("status", "WAITING_FOR_PLAYERS"))
      .collect();

    // Filter out campaign battles and private challenges nobody else can join
    const allDuels = [
      ...inProgressDuels,
      ...waitingDuels.filter((duel) => !duel.challengedUserId),
    ];
    return allDuels.filter((duel) => !duel.isCampaignBattle);
  },
});

// Live (waiting or in-progress) duels for the signed-in player's wizards, one
// row per wizard per duel. Reads the player's duelParticipants rows (indexed,
// live duels only) and then just those duels, so it costs O(own live duels)
// and only re-runs when one of them changes. Powers the "Your turn" /
// "In duel" state on My Wizards.
export const getMyWizardsLiveDuels = query({
  args: {},
  returns: v.array(
    v.object({
      wizardId: v.id("wizards"),
      duelId: v.id("duels"),
      status: v.union(
        v.literal("WAITING_FOR_PLAYERS"),
        v.literal("IN_PROGRESS"),
      ),
      yourTurn: v.boolean(),
      isCampaignBattle: v.boolean(),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject;

    const participations = await ctx.db
      .query("duelParticipants")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    if (participations.length === 0) return [];

    const myWizards = await ctx.db
      .query("wizards")
      .withIndex("by_owner", (q) => q.eq("owner", userId))
      .collect();
    const mine = new Set(myWizards.map((w) => w._id));

    const rows = [];
    for (const { duelId } of participations) {
      const duel = await ctx.db.get(duelId);
      if (
        !duel ||
        (duel.status !== "IN_PROGRESS" && duel.status !== "WAITING_FOR_PLAYERS")
      ) {
        continue;
      }
      for (const wizardId of duel.wizards) {
        if (!mine.has(wizardId)) continue;
        rows.push({
          wizardId,
          duelId: duel._id,
          status: duel.status,
          yourTurn:
            duel.status === "IN_PROGRESS" &&
            duel.needActionsFrom.includes(wizardId),
          isCampaignBattle: !!duel.isCampaignBattle,
          createdAt: duel.createdAt,
        });
      }
    }
    return rows;
  },
});

// One-time backfill of duelParticipants for duels that were already live
// before the table existed. Run once after deploying:
//   npx convex run duels:backfillDuelParticipants
// Safe to re-run; it pages through live duels and self-schedules.
export const backfillDuelParticipants = internalMutation({
  args: {
    status: v.optional(
      v.union(v.literal("IN_PROGRESS"), v.literal("WAITING_FOR_PLAYERS")),
    ),
    cursor: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.null(),
  handler: async (ctx, { status = "IN_PROGRESS", cursor = null }) => {
    const page = await ctx.db
      .query("duels")
      .withIndex("by_status", (q) => q.eq("status", status))
      .paginate({ cursor, numItems: 100 });
    for (const duel of page.page) {
      await syncDuelParticipants(ctx, duel._id);
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.duels.backfillDuelParticipants, {
        status,
        cursor: page.continueCursor,
      });
    } else if (status === "IN_PROGRESS") {
      await ctx.scheduler.runAfter(0, internal.duels.backfillDuelParticipants, {
        status: "WAITING_FOR_PLAYERS",
        cursor: null,
      });
    }
    return null;
  },
});

// Get watchable duels: player-vs-player duels, campaign battles, or both.
// With an opponent, only campaign battles against that campaign wizard.
export const getWatchableDuels = query({
  args: {
    limit: v.number(),
    offset: v.number(),
    kind: v.optional(
      v.union(
        v.literal("all"),
        v.literal("live"),
        v.literal("players"),
        v.literal("campaign"),
      ),
    ),
    opponentId: v.optional(v.id("wizards")),
  },
  returns: v.object({
    liveCount: v.number(),
    duels: v.array(
      v.object({
        _id: v.id("duels"),
        _creationTime: v.number(),
        numberOfRounds: v.union(v.number(), v.literal("TO_THE_DEATH")),
        wizards: v.array(v.id("wizards")),
        players: v.array(v.string()),
        status: v.union(
          v.literal("WAITING_FOR_PLAYERS"),
          v.literal("IN_PROGRESS"),
          v.literal("COMPLETED"),
          v.literal("CANCELLED"),
        ),
        currentRound: v.number(),
        createdAt: v.number(),
        completedAt: v.optional(v.number()),
        points: v.record(v.string(), v.number()),
        hitPoints: v.record(v.string(), v.number()),
        needActionsFrom: v.array(v.id("wizards")),
        featuredIllustration: v.optional(v.string()),
        winners: v.optional(v.array(v.id("wizards"))),
        losers: v.optional(v.array(v.id("wizards"))),
        shortcode: v.optional(v.string()),
        textOnlyMode: v.optional(v.boolean()),
        textOnlyReason: v.optional(v.string()),
        imageCreditConsumed: v.optional(v.boolean()),
        imageCreditConsumedBy: v.optional(v.string()),
        tokensCharged: v.optional(v.array(v.string())),
        tokensRefunded: v.optional(v.boolean()),
        creatorCoversEntry: v.optional(v.boolean()),
        isCampaignBattle: v.optional(v.boolean()),
        rematchDuelId: v.optional(v.id("duels")),
        chatEnabled: v.optional(v.boolean()),
        forfeitedBy: v.optional(v.id("wizards")),
        challengedUserId: v.optional(v.string()),
        challengedWizardId: v.optional(v.id("wizards")),
        sponsorshipId: v.optional(v.id("sponsorships")),
        // Spoiler-free hook: the spells cast in the first resolved round.
        openings: v.array(
          v.object({ wizardId: v.id("wizards"), spell: v.string() }),
        ),
        uniqueViewers: v.optional(v.number()),
      }),
    ),
    total: v.number(),
    hasMore: v.boolean(),
  }),
  handler: async (ctx, { limit, offset, kind = "all", opponentId }) => {
    const viewerId = (await ctx.auth.getUserIdentity())?.subject;
    const allDuels = await ctx.db.query("duels").collect();
    const watchableDuels = allDuels
      .filter((duel) => {
        // A duel still waiting for its second player has nothing to watch.
        if (duel.players.length < 2) return false;
        // Nothing to watch yet, and its join code is for the players.
        if (
          duel.status === "WAITING_FOR_PLAYERS" &&
          !(viewerId && duel.players.includes(viewerId))
        ) {
          return false;
        }
        if (opponentId) {
          return (
            !!duel.isCampaignBattle &&
            duel.status !== "CANCELLED" &&
            duel.wizards.includes(opponentId)
          );
        }
        if (kind === "live") return duel.status === "IN_PROGRESS";
        if (kind === "players") return !duel.isCampaignBattle;
        if (kind === "campaign") {
          // A cancelled campaign battle never had anything to watch.
          return !!duel.isCampaignBattle && duel.status !== "CANCELLED";
        }
        return !duel.isCampaignBattle || duel.status !== "CANCELLED";
      })
      // Live duels first: they're what a spectator can join right now.
      .sort(
        (a, b) =>
          Number(b.status === "IN_PROGRESS") -
            Number(a.status === "IN_PROGRESS") || b.createdAt - a.createdAt,
      );
    const liveCount = allDuels.filter(
      (duel) => duel.status === "IN_PROGRESS" && duel.players.length >= 2,
    ).length;

    const total = watchableDuels.length;
    const duels = await Promise.all(
      watchableDuels.slice(offset, offset + limit).map(async (duel) => {
        const [rounds, stats] = await Promise.all([
          ctx.db
            .query("duelRounds")
            .withIndex("by_duel", (q) => q.eq("duelId", duel._id))
            .collect(),
          ctx.db
            .query("duelViewStats")
            .withIndex("by_duel", (q) => q.eq("duelId", duel._id))
            .first(),
        ]);
        const firstRound = rounds.find((r) => r.roundNumber === 1);
        // Only a resolved round: an open round's spells are still secret.
        const spells =
          firstRound?.status === "COMPLETED"
            ? Object.values(firstRound.spells ?? {})
            : [];
        // In seat order, so each spell lines up with its wizard on the card.
        const openings = duel.wizards.flatMap((wizardId) => {
          const spell = spells.find((s) => s.castBy === wizardId);
          return spell
            ? [{ wizardId, spell: spell.description.slice(0, 200) }]
            : [];
        });
        // Spectators replay spoiler-free, so only the duelists get the
        // result. Everyone else finds out on the duel page.
        const participant = !!viewerId && duel.players.includes(viewerId);
        return {
          ...duel,
          ...(participant
            ? {}
            : {
                winners: undefined,
                losers: undefined,
                forfeitedBy: undefined,
                points: {},
                hitPoints: {},
                // How long a finished duel ran can hint at a knockout.
                completedAt: undefined,
                // Account details and billing are nobody else's business.
                players: [],
                needActionsFrom: [],
                challengedUserId: undefined,
                imageCreditConsumedBy: undefined,
                tokensCharged: undefined,
                textOnlyReason: undefined,
                ...(duel.status === "COMPLETED" ? { currentRound: 0 } : {}),
              }),
          openings,
          uniqueViewers: stats?.uniqueViewers,
        };
      }),
    );
    const hasMore = offset + limit < total;

    return {
      duels,
      total,
      hasMore,
      liveCount,
    };
  },
});

// Point the duel's featured illustration (card thumbnail and link preview)
// at its teaser round. Call when a round illustration lands and when the duel
// ends, since the final round must then stop being the teaser.
async function refreshFeaturedIllustration(
  ctx: MutationCtx,
  duelId: Id<"duels">,
): Promise<void> {
  const duel = await ctx.db.get(duelId);
  if (!duel) return;
  const rounds = await ctx.db
    .query("duelRounds")
    .withIndex("by_duel", (q) => q.eq("duelId", duelId))
    .collect();
  const teaser = pickTeaserIllustration(duel.status, rounds);
  if (teaser !== duel.featuredIllustration) {
    await ctx.db.patch(duelId, { featuredIllustration: teaser });
  }
}

// One-time backfill: switch existing duels from the introduction image to
// their teaser round. Run once after deploying:
//   npx convex run duels:backfillFeaturedIllustrations
export const backfillFeaturedIllustrations = internalMutation({
  args: { cursor: v.optional(v.union(v.string(), v.null())) },
  returns: v.null(),
  handler: async (ctx, { cursor = null }) => {
    const page = await ctx.db.query("duels").paginate({ cursor, numItems: 50 });
    for (const duel of page.page) {
      await refreshFeaturedIllustration(ctx, duel._id);
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.duels.backfillFeaturedIllustrations,
        { cursor: page.continueCursor },
      );
    }
    return null;
  },
});

// Update duel text-only mode status
export const updateDuelTextOnlyMode = internalMutation({
  args: {
    duelId: v.id("duels"),
    textOnlyMode: v.boolean(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { duelId, textOnlyMode, reason }) => {
    await ctx.db.patch(duelId, {
      textOnlyMode,
      textOnlyReason: reason,
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

// Get duels for a specific wizard with string validation
export const getWizardDuelsSafe = query({
  args: { wizardId: v.id("wizards") },
  handler: async (ctx, { wizardId }) => {
    try {
      const duels = await ctx.db.query("duels").collect();

      // Filter duels that include this wizard
      return duels
        .filter((duel) => duel.wizards.includes(wizardId))
        .sort((a, b) => b.createdAt - a.createdAt); // Most recent first
    } catch (error) {
      console.warn("Invalid wizard ID for duels:", wizardId, error);
      return [];
    }
  },
});

// A wizard's duels, newest first, each with its (first) opponent's name and
// portrait so a history list can render in one round trip.
export const getWizardDuelHistory = query({
  args: { wizardId: v.id("wizards") },
  handler: async (ctx, { wizardId }) => {
    const duels = (await ctx.db.query("duels").collect())
      .filter((duel) => duel.wizards.includes(wizardId))
      .sort((a, b) => b.createdAt - a.createdAt);

    const opponentCache = new Map<
      Id<"wizards">,
      {
        _id: Id<"wizards">;
        name: string;
        illustration?: string;
        illustrationURL?: string;
      } | null
    >();
    const opponentOf = async (id: Id<"wizards">) => {
      if (!opponentCache.has(id)) {
        const w = await ctx.db.get(id);
        opponentCache.set(
          id,
          w
            ? {
                _id: w._id,
                name: w.name,
                illustration: w.illustration,
                illustrationURL: w.illustrationURL,
              }
            : null,
        );
      }
      return opponentCache.get(id) ?? null;
    };

    return Promise.all(
      duels.map(async (duel) => {
        const opponentIds = duel.wizards.filter((id) => id !== wizardId);
        // Only what a history row needs, not the whole duel document.
        return {
          _id: duel._id,
          status: duel.status,
          wizards: duel.wizards,
          winners: duel.winners,
          losers: duel.losers,
          numberOfRounds: duel.numberOfRounds,
          currentRound: duel.currentRound,
          createdAt: duel.createdAt,
          isCampaignBattle: duel.isCampaignBattle,
          opponent: opponentIds[0] ? await opponentOf(opponentIds[0]) : null,
          extraOpponents: Math.max(0, opponentIds.length - 1),
        };
      }),
    );
  },
});

// Get duel statistics for the authenticated player
export const getPlayerDuelStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
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
            playerWizards.includes(winnerId),
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
      luckRolls: v.optional(v.record(v.string(), v.number())),
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

    await scheduleRoundNarration(ctx, roundId);
    return roundId;
  },
});

// Update round illustration
export const updateRoundIllustration = internalMutation({
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
    await refreshFeaturedIllustration(ctx, round.duelId);

    return roundId;
  },
});

// Schedule round illustration generation
export const scheduleRoundIllustration = mutation({
  args: {
    illustrationPrompt: v.string(),
    duelId: v.id("duels"),
    roundNumber: v.string(),
    userId: v.optional(v.string()),
    skipImageGeneration: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    {
      illustrationPrompt,
      duelId,
      roundNumber,
      userId,
      skipImageGeneration = false,
    },
  ) => {
    // Schedule the illustration generation
    // Skip scheduling in test environment to avoid transaction escape errors
    if (process.env.NODE_ENV !== "test") {
      await ctx.scheduler.runAfter(
        100, // Add small delay to ensure database transaction is committed
        internal.generateRoundIllustration.generateRoundIllustration,
        {
          illustrationPrompt,
          duelId,
          roundNumber,
          userId,
          skipImageGeneration,
        },
      );
    }
  },
});

// Start duel after introduction (move to round 1)
export const startDuelAfterIntroduction = internalMutation({
  args: { duelId: v.id("duels") },
  handler: async (ctx, { duelId }) => {
    const duel = await ctx.db.get(duelId);
    if (!duel) {
      throw new Error("Duel not found");
    }
    // Cancelled while the introduction was being written (for example, a
    // player deleted their account).
    if (duel.status !== "WAITING_FOR_PLAYERS") {
      return;
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
    await syncDuelParticipants(ctx, duelId);

    // Players often wander off while waiting for an opponent to join.
    await scheduleTurnReminders(ctx, duelId, 1);

    // For campaign battles, automatically generate actions for campaign opponents
    if (duel.isCampaignBattle && process.env.NODE_ENV !== "test") {
      await ctx.scheduler.runAfter(
        1000, // Small delay to ensure database is updated
        internal.campaignOpponentAI.processCampaignOpponentActions,
        { duelId },
      );
    }

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
    if (process.env.NODE_ENV !== "test") {
      await ctx.scheduler.runAfter(
        100,
        internal.processDuelRound.processDuelRound,
        {
          duelId,
          roundId,
        },
      );
    }

    return roundId;
  },
});

// Search and filter duels with advanced criteria (super admin only)
export const searchDuels = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("WAITING_FOR_PLAYERS"),
        v.literal("IN_PROGRESS"),
        v.literal("COMPLETED"),
        v.literal("CANCELLED"),
      ),
    ),
    playerUserId: v.optional(v.string()),
    wizardId: v.optional(v.id("wizards")),
    createdAfter: v.optional(v.number()),
    createdBefore: v.optional(v.number()),
    numberOfRounds: v.optional(v.union(v.number(), v.literal("TO_THE_DEATH"))),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (
    ctx,
    {
      status,
      playerUserId,
      wizardId,
      createdAfter,
      createdBefore,
      numberOfRounds,
      limit = 50,
      offset = 0,
    },
  ) => {
    // Verify super admin access
    await verifySuperAdmin(ctx);
    let duels;

    // Apply status filter if provided
    if (status) {
      duels = await ctx.db
        .query("duels")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect();
    } else {
      duels = await ctx.db.query("duels").collect();
    }

    // Apply additional filters
    duels = duels.filter((duel) => {
      if (playerUserId && !duel.players.includes(playerUserId)) {
        return false;
      }
      if (wizardId && !duel.wizards.includes(wizardId)) {
        return false;
      }
      if (createdAfter && duel.createdAt < createdAfter) {
        return false;
      }
      if (createdBefore && duel.createdAt > createdBefore) {
        return false;
      }
      if (
        numberOfRounds !== undefined &&
        duel.numberOfRounds !== numberOfRounds
      ) {
        return false;
      }
      return true;
    });

    // Sort by creation date (newest first)
    duels.sort((a, b) => b.createdAt - a.createdAt);

    // Apply pagination
    const paginatedDuels = duels.slice(offset, offset + limit);

    return {
      duels: paginatedDuels,
      total: duels.length,
      hasMore: offset + limit < duels.length,
    };
  },
});

// Get comprehensive duel analytics (super admin only)
export const getDuelAnalytics = query({
  args: {
    timeRange: v.optional(
      v.union(
        v.literal("24h"),
        v.literal("7d"),
        v.literal("30d"),
        v.literal("all"),
      ),
    ),
  },
  handler: async (ctx, { timeRange = "30d" }) => {
    // Verify super admin access
    await verifySuperAdmin(ctx);
    const now = Date.now();
    let startTime = 0;

    switch (timeRange) {
      case "24h":
        startTime = now - 24 * 60 * 60 * 1000;
        break;
      case "7d":
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "30d":
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case "all":
        startTime = 0;
        break;
    }

    const duels = await ctx.db.query("duels").collect();
    const filteredDuels = duels.filter((duel) => duel.createdAt >= startTime);

    const analytics = {
      totalDuels: filteredDuels.length,
      statusBreakdown: {
        waiting: filteredDuels.filter((d) => d.status === "WAITING_FOR_PLAYERS")
          .length,
        inProgress: filteredDuels.filter((d) => d.status === "IN_PROGRESS")
          .length,
        completed: filteredDuels.filter((d) => d.status === "COMPLETED").length,
        cancelled: filteredDuels.filter((d) => d.status === "CANCELLED").length,
      },
      roundTypeBreakdown: {
        fixedRounds: filteredDuels.filter(
          (d) => typeof d.numberOfRounds === "number",
        ).length,
        toTheDeath: filteredDuels.filter(
          (d) => d.numberOfRounds === "TO_THE_DEATH",
        ).length,
      },
      averageRoundsPerDuel: 0,
      averageDuelDuration: 0,
      mostActiveWizards: [] as { wizardId: string; duelCount: number }[],
      dailyActivity: [] as { date: string; duels: number }[],
    };

    // Calculate average rounds for completed duels
    const completedDuels = filteredDuels.filter(
      (d) => d.status === "COMPLETED",
    );
    if (completedDuels.length > 0) {
      const totalRounds = completedDuels.reduce(
        (sum, duel) => sum + duel.currentRound,
        0,
      );
      analytics.averageRoundsPerDuel =
        Math.round((totalRounds / completedDuels.length) * 10) / 10;
    }

    // Calculate wizard participation
    const wizardParticipation: Record<string, number> = {};
    filteredDuels.forEach((duel) => {
      duel.wizards.forEach((wizardId) => {
        wizardParticipation[wizardId] =
          (wizardParticipation[wizardId] || 0) + 1;
      });
    });

    analytics.mostActiveWizards = Object.entries(wizardParticipation)
      .map(([wizardId, count]) => ({ wizardId, duelCount: count }))
      .sort((a, b) => b.duelCount - a.duelCount)
      .slice(0, 10);

    // Calculate daily activity for the last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
      ).getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;

      const duelsOnDay = filteredDuels.filter(
        (d) => d.createdAt >= dayStart && d.createdAt < dayEnd,
      ).length;
      analytics.dailyActivity.push({
        date: date.toISOString().split("T")[0],
        duels: duelsOnDay,
      });
    }

    return analytics;
  },
});

// Get active duel monitoring data (super admin only)
export const getActiveDuelMonitoring = query({
  args: {},
  handler: async (ctx) => {
    // Verify super admin access
    await verifySuperAdmin(ctx);
    const activeDuels = await ctx.db
      .query("duels")
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "WAITING_FOR_PLAYERS"),
          q.eq(q.field("status"), "IN_PROGRESS"),
        ),
      )
      .collect();

    const monitoringData = await Promise.all(
      activeDuels.map(async (duel) => {
        // Get current round info
        const currentRound = await ctx.db
          .query("duelRounds")
          .withIndex("by_duel", (q) => q.eq("duelId", duel._id))
          .filter((q) => q.eq(q.field("roundNumber"), duel.currentRound))
          .first();

        // Get wizard details
        const wizardDetails = await Promise.all(
          duel.wizards.map(async (wizardId) => {
            const wizard = await ctx.db.get(wizardId);
            return wizard
              ? { id: wizardId, name: wizard.name, owner: wizard.owner }
              : null;
          }),
        );

        return {
          duel,
          currentRound,
          wizards: wizardDetails.filter(Boolean),
          waitingTime:
            duel.status === "WAITING_FOR_PLAYERS"
              ? Date.now() - duel.createdAt
              : null,
          roundWaitingTime:
            currentRound?.status === "WAITING_FOR_SPELLS"
              ? Date.now() -
                (Math.max(
                  ...Object.values(currentRound.spells || {}).map(
                    (s) => s.timestamp,
                  ),
                ) || duel.createdAt)
              : null,
        };
      }),
    );

    return monitoringData.sort((a, b) => b.duel.createdAt - a.duel.createdAt);
  },
});

// Force cancel a duel (super admin only)
export const forceCancelDuel = mutation({
  args: {
    duelId: v.id("duels"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { duelId, reason }) => {
    // Verify super admin access
    await verifySuperAdmin(ctx);
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
    await syncDuelParticipants(ctx, duelId);

    // Admins cancel broken or stuck duels, so every player gets their token back
    await refundDuelTokens(ctx, duelId, "admin_cancelled");

    // Log the cancellation reason if provided
    if (reason) {
      // In a real implementation, you might want to store this in a separate audit log table
      console.log(`Duel ${duelId} cancelled: ${reason}`);
    }

    return duelId;
  },
});

// Get all recent duels from the platform (for watching duels)
export const getAllRecentDuels = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 20, offset = 0 }) => {
    const duels = await ctx.db.query("duels").collect();

    // Filter to only show active (in progress) or completed duels
    const watchableDuels = duels.filter(
      (duel) => duel.status === "IN_PROGRESS" || duel.status === "COMPLETED",
    );

    // Sort by creation date (newest first) and apply pagination
    const sortedDuels = watchableDuels
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(offset, offset + limit);

    return {
      duels: sortedDuels,
      total: watchableDuels.length,
      hasMore: offset + limit < watchableDuels.length,
    };
  },
});

// Get duel statistics for multiple players
export const getMultiPlayerDuelStats = query({
  args: { userIds: v.array(v.string()) },
  handler: async (ctx, { userIds }) => {
    const duels = await ctx.db.query("duels").collect();

    const stats = userIds.map((userId) => {
      const playerDuels = duels.filter((duel) => duel.players.includes(userId));

      const playerStats = {
        userId,
        totalDuels: playerDuels.length,
        wins: 0,
        losses: 0,
        inProgress: 0,
        cancelled: 0,
        averageRounds: 0,
      };

      let totalRounds = 0;
      let completedDuels = 0;

      playerDuels.forEach((duel) => {
        switch (duel.status) {
          case "COMPLETED":
            completedDuels++;
            totalRounds += duel.currentRound;

            // Check if any of the player's wizards won
            const hasWinningWizard = duel.winners?.some((winnerId) =>
              duel.wizards.includes(winnerId),
            );

            if (hasWinningWizard) {
              playerStats.wins++;
            } else {
              playerStats.losses++;
            }
            break;
          case "IN_PROGRESS":
          case "WAITING_FOR_PLAYERS":
            playerStats.inProgress++;
            break;
          case "CANCELLED":
            playerStats.cancelled++;
            break;
        }
      });

      if (completedDuels > 0) {
        playerStats.averageRounds =
          Math.round((totalRounds / completedDuels) * 10) / 10;
      }

      return playerStats;
    });

    return stats;
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
      luckRolls: v.optional(v.record(v.string(), v.number())),
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

    await scheduleRoundNarration(ctx, roundId);
    return roundId;
  },
});
// Debug query to check user metadata
export const debugUser = query({
  args: {},
  handler: async (ctx) => {
    return await debugUserMetadata(ctx);
  },
});

// Check if current user has admin access (non-throwing)
export const checkAdminAccess = query({
  args: {},
  handler: async (ctx) => {
    return await checkSuperAdminAccess(ctx);
  },
});

// Internal function to create duel for testing
export const createDuelInternal = internalMutation({
  args: {
    numberOfRounds: v.union(v.number(), v.literal("TO_THE_DEATH")),
    wizards: v.array(v.id("wizards")),
    players: v.array(v.string()),
    isCampaignBattle: v.optional(v.boolean()),
  },
  returns: v.id("duels"),
  handler: async (
    ctx,
    { numberOfRounds, wizards, players, isCampaignBattle },
  ) => {
    // Initialize points and hit points for all wizards
    const points: Record<string, number> = {};
    const hitPoints: Record<string, number> = {};

    for (const wizardId of wizards) {
      points[wizardId] = 0;
      hitPoints[wizardId] = 100; // Starting hit points
    }

    const duelId = await ctx.db.insert("duels", {
      numberOfRounds,
      wizards,
      players,
      status: "IN_PROGRESS",
      currentRound: 1,
      createdAt: Date.now(),
      points,
      hitPoints,
      needActionsFrom: wizards,
      textOnlyMode: false,
      isCampaignBattle: isCampaignBattle || false,
    });
    await syncDuelParticipants(ctx, duelId);

    return duelId;
  },
});
// Internal function to cast spell for campaign opponents (bypasses authentication)
export const castSpellForCampaignOpponent = internalMutation({
  args: {
    duelId: v.id("duels"),
    wizardId: v.id("wizards"),
    spellDescription: v.string(),
  },
  returns: v.union(v.id("duelRounds"), v.null()),
  handler: async (ctx, { duelId, wizardId, spellDescription }) => {
    const duel = await ctx.db.get(duelId);
    if (!duel) {
      throw new Error("Duel not found");
    }

    if (duel.status !== "IN_PROGRESS") {
      throw new Error("Duel is not in progress");
    }

    // Verify this is a campaign opponent
    const wizard = await ctx.db.get(wizardId);
    if (!wizard || !wizard.isCampaignOpponent) {
      throw new Error("This function is only for campaign opponents");
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

    // Check if the wizard is participating in this duel
    if (!duel.wizards.includes(wizardId)) {
      throw new Error("Wizard is not participating in this duel");
    }

    // Check if the wizard has already cast a spell this round
    if (currentRound.spells && currentRound.spells[wizardId]) {
      throw new Error("Wizard has already cast a spell this round");
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
      (id) => id !== wizardId,
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
      if (process.env.NODE_ENV !== "test") {
        await ctx.scheduler.runAfter(
          100,
          internal.processDuelRound.processDuelRound,
          {
            duelId,
            roundId: currentRound._id,
          },
        );
      }
    }

    return currentRound._id;
  },
});
