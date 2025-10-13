import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

import { api, internal } from "./_generated/api";

// Types for better type safety
export type LobbyStatus = "WAITING" | "MATCHED";
export type DuelType = number | "TO_THE_DEATH";

// Get current lobby entries (for display)
export const getLobbyEntries = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("duelLobby"),
      _creationTime: v.number(),
      userId: v.string(),
      wizardId: v.id("wizards"),
      joinedAt: v.number(),
      duelType: v.union(v.number(), v.literal("TO_THE_DEATH")),
      status: v.union(v.literal("WAITING"), v.literal("MATCHED")),
      matchedWith: v.optional(v.id("duelLobby")),
    })
  ),
  handler: async (ctx) => {
    // Get all waiting lobby entries
    const lobbyEntries = await ctx.db
      .query("duelLobby")
      .withIndex("by_status", (q) => q.eq("status", "WAITING"))
      .order("asc") // First come, first served
      .collect();

    return lobbyEntries;
  },
});

// Get user's most recent duel (for redirect after lobby matching)
export const getUserRecentDuel = query({
  args: {},
  returns: v.union(v.null(), v.id("duels")),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    // Get the user's most recent duel that was created in the last 60 seconds
    // This helps us detect when they were just matched from the lobby
    const recentTime = Date.now() - 60000; // 60 seconds ago

    const recentDuels = await ctx.db.query("duels").collect();
    const userRecentDuel = recentDuels
      .filter(
        (duel) =>
          duel.players.includes(identity.subject) &&
          duel.createdAt > recentTime &&
          (duel.status === "IN_PROGRESS" ||
            duel.status === "WAITING_FOR_PLAYERS")
      )
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    return userRecentDuel?._id || null;
  },
});

// Get user's current lobby status
export const getUserLobbyStatus = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("duelLobby"),
      _creationTime: v.number(),
      userId: v.string(),
      wizardId: v.id("wizards"),
      joinedAt: v.number(),
      duelType: v.union(v.number(), v.literal("TO_THE_DEATH")),
      status: v.union(v.literal("WAITING"), v.literal("MATCHED")),
      matchedWith: v.optional(v.id("duelLobby")),
    })
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const userLobbyEntry = await ctx.db
      .query("duelLobby")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    return userLobbyEntry;
  },
});

// Join the duel lobby with a wizard
export const joinLobby = mutation({
  args: {
    wizardId: v.id("wizards"),
    duelType: v.union(v.number(), v.literal("TO_THE_DEATH")),
  },
  returns: v.id("duelLobby"),
  handler: async (ctx, { wizardId, duelType }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Verify that the wizard belongs to the authenticated user
    const wizard = await ctx.db.get(wizardId);
    if (!wizard || wizard.owner !== userId) {
      throw new Error("Not authorized to use this wizard");
    }

    // Check if user is already in lobby
    const existingEntry = await ctx.db
      .query("duelLobby")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existingEntry) {
      throw new Error("Already in lobby");
    }

    // Check if wizard is already in lobby (by another user, shouldn't happen but safety check)
    const wizardInLobby = await ctx.db
      .query("duelLobby")
      .withIndex("by_wizard", (q) => q.eq("wizardId", wizardId))
      .first();

    if (wizardInLobby) {
      throw new Error("Wizard is already in lobby");
    }

    // Create lobby entry
    const lobbyId = await ctx.db.insert("duelLobby", {
      userId,
      wizardId,
      joinedAt: Date.now(),
      duelType,
      status: "WAITING" as LobbyStatus,
    });

    // Try to find a match immediately
    // Skip scheduling in test environment to avoid transaction escape errors
    if (process.env.NODE_ENV !== "test") {
      await ctx.scheduler.runAfter(100, internal.duelLobby.tryMatchmaking, {
        lobbyId,
      });
    }

    return lobbyId;
  },
});

// Leave the duel lobby
export const leaveLobby = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Find user's lobby entry
    const lobbyEntry = await ctx.db
      .query("duelLobby")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!lobbyEntry) {
      throw new Error("Not in lobby");
    }

    // If matched, also remove the match reference from the other player
    if (lobbyEntry.matchedWith) {
      const matchedEntry = await ctx.db.get(lobbyEntry.matchedWith);
      if (matchedEntry) {
        await ctx.db.patch(matchedEntry._id, {
          status: "WAITING" as LobbyStatus,
          matchedWith: undefined,
        });
      }
    }

    // Remove lobby entry
    await ctx.db.delete(lobbyEntry._id);

    return null;
  },
});

// Internal function to try matchmaking for a lobby entry
export const tryMatchmaking = internalMutation({
  args: { lobbyId: v.id("duelLobby") },
  returns: v.null(),
  handler: async (ctx, { lobbyId }) => {
    const lobbyEntry = await ctx.db.get(lobbyId);
    if (!lobbyEntry || lobbyEntry.status !== "WAITING") {
      return null;
    }

    // Find another waiting player with the same duel type
    const potentialMatch = await ctx.db
      .query("duelLobby")
      .withIndex("by_status", (q) => q.eq("status", "WAITING"))
      .filter((q) =>
        q.and(
          q.neq(q.field("_id"), lobbyId), // Not the same entry
          q.eq(q.field("duelType"), lobbyEntry.duelType) // Same duel type
        )
      )
      .order("asc") // First come, first served
      .first();

    if (!potentialMatch) {
      return null; // No match found
    }

    // Mark both entries as matched
    await ctx.db.patch(lobbyEntry._id, {
      status: "MATCHED" as LobbyStatus,
      matchedWith: potentialMatch._id,
    });

    await ctx.db.patch(potentialMatch._id, {
      status: "MATCHED" as LobbyStatus,
      matchedWith: lobbyEntry._id,
    });

    // Create the duel
    // Skip scheduling in test environment to avoid transaction escape errors
    if (process.env.NODE_ENV !== "test") {
      await ctx.scheduler.runAfter(100, internal.duelLobby.createMatchedDuel, {
        lobbyId1: lobbyEntry._id,
        lobbyId2: potentialMatch._id,
      });
    }

    return null;
  },
});

// Internal function to create a duel from matched lobby entries
export const createMatchedDuel = internalMutation({
  args: {
    lobbyId1: v.id("duelLobby"),
    lobbyId2: v.id("duelLobby"),
  },
  returns: v.null(),
  handler: async (ctx, { lobbyId1, lobbyId2 }) => {
    const entry1 = await ctx.db.get(lobbyId1);
    const entry2 = await ctx.db.get(lobbyId2);

    if (!entry1 || !entry2) {
      return null;
    }

    if (entry1.status !== "MATCHED" || entry2.status !== "MATCHED") {
      return null;
    }

    // Create the duel
    const wizards = [entry1.wizardId, entry2.wizardId];
    const players = [entry1.userId, entry2.userId];

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
      numberOfRounds: entry1.duelType,
      wizards,
      players,
      status: "WAITING_FOR_PLAYERS",
      currentRound: 1,
      createdAt: Date.now(),
      points: initialPoints,
      hitPoints: initialHitPoints,
      needActionsFrom: wizards,
      shortcode,
    });

    // Remove lobby entries since players are now in a duel
    await ctx.db.delete(entry1._id);
    await ctx.db.delete(entry2._id);

    // Auto-start the duel since we have 2 players
    await ctx.db.patch(duelId, {
      status: "IN_PROGRESS",
    });

    // Schedule the duel introduction generation
    // In test environment, skip scheduling to avoid transaction issues
    if (process.env.NODE_ENV !== "test") {
      await ctx.scheduler.runAfter(
        100,
        api.duelIntroduction.generateDuelIntroduction,
        {
          duelId,
        }
      );
    }

    return null;
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

// Get lobby statistics (for display)
export const getLobbyStats = query({
  args: {},
  returns: v.object({
    totalWaiting: v.number(),
    totalMatched: v.number(),
    averageWaitTime: v.number(),
  }),
  handler: async (ctx) => {
    const allEntries = await ctx.db.query("duelLobby").collect();

    const waiting = allEntries.filter((e) => e.status === "WAITING");
    const matched = allEntries.filter((e) => e.status === "MATCHED");

    // Calculate average wait time for waiting players
    const now = Date.now();
    const totalWaitTime = waiting.reduce(
      (sum, entry) => sum + (now - entry.joinedAt),
      0
    );
    const averageWaitTime =
      waiting.length > 0 ? totalWaitTime / waiting.length : 0;

    return {
      totalWaiting: waiting.length,
      totalMatched: matched.length,
      averageWaitTime: Math.round(averageWaitTime / 1000), // Convert to seconds
    };
  },
});
