import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { verifySuperAdmin } from "./auth.utils";

/**
 * List users with pagination, search, and filtering
 * Admin-only function to view all users in the system
 */
export const listUsers = query({
  args: {
    paginationOpts: paginationOptsValidator,
    searchQuery: v.optional(v.string()),
    sortBy: v.optional(
      v.union(
        v.literal("joinDate"),
        v.literal("activity"),
        v.literal("username")
      )
    ),
    activityFilter: v.optional(
      v.union(
        v.literal("all"),
        v.literal("inactive"),
        v.literal("low"),
        v.literal("medium"),
        v.literal("high")
      )
    ),
  },
  returns: v.object({
    page: v.array(
      v.object({
        _id: v.id("users"),
        clerkId: v.string(),
        email: v.optional(v.string()),
        name: v.optional(v.string()),
        userId: v.optional(v.string()),
        displayName: v.optional(v.string()),
        subscriptionTier: v.union(v.literal("FREE"), v.literal("PREMIUM")),
        subscriptionStatus: v.union(
          v.literal("ACTIVE"),
          v.literal("CANCELED"),
          v.literal("PAST_DUE"),
          v.literal("TRIALING")
        ),
        imageCredits: v.number(),
        createdAt: v.number(),
        role: v.union(
          v.literal("user"),
          v.literal("admin"),
          v.literal("super_admin")
        ),
      })
    ),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    // Verify admin access
    await verifySuperAdmin(ctx);

    // Apply search filter if provided
    if (args.searchQuery && args.searchQuery.trim() !== "") {
      const searchLower = args.searchQuery.toLowerCase().trim();

      // Get all users and filter in memory (Convex doesn't support OR queries)
      const allUsers = await ctx.db.query("users").collect();
      const filteredUsers = allUsers.filter((user) => {
        const nameMatch = user.name?.toLowerCase().includes(searchLower);
        const emailMatch = user.email?.toLowerCase().includes(searchLower);
        const userIdMatch = user.userId?.toLowerCase().includes(searchLower);
        const displayNameMatch = user.displayName
          ?.toLowerCase()
          .includes(searchLower);

        return nameMatch || emailMatch || userIdMatch || displayNameMatch;
      });

      // Apply sorting
      const sortBy = args.sortBy || "joinDate";
      filteredUsers.sort((a, b) => {
        switch (sortBy) {
          case "joinDate":
            return b.createdAt - a.createdAt; // Newest first
          case "username":
            const aName = a.displayName || a.name || a.userId || "";
            const bName = b.displayName || b.name || b.userId || "";
            return aName.localeCompare(bName);
          case "activity":
            // For now, sort by creation date as a proxy
            // Activity level will be calculated separately
            return b.createdAt - a.createdAt;
          default:
            return 0;
        }
      });

      // Manual pagination for filtered results
      const numItems = args.paginationOpts.numItems;
      const cursor = args.paginationOpts.cursor;

      let startIndex = 0;
      if (cursor) {
        // Find the index of the cursor
        const cursorIndex = filteredUsers.findIndex((u) => u._id === cursor);
        startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0;
      }

      const page = filteredUsers.slice(startIndex, startIndex + numItems);
      const isDone = startIndex + numItems >= filteredUsers.length;
      const continueCursor = isDone ? "" : page[page.length - 1]?._id || "";

      return {
        page: page.map((user) => ({
          _id: user._id,
          clerkId: user.clerkId,
          email: user.email,
          name: user.name,
          userId: user.userId,
          displayName: user.displayName,
          subscriptionTier: user.subscriptionTier,
          subscriptionStatus: user.subscriptionStatus,
          imageCredits: user.imageCredits,
          createdAt: user.createdAt,
          role: user.role,
        })),
        isDone,
        continueCursor,
      };
    }

    // No search query - use standard pagination
    const sortBy = args.sortBy || "joinDate";

    // Apply sorting
    // Note: For other sort options, we'll need to collect and sort in memory
    // since Convex doesn't support arbitrary field sorting without indexes
    let result;
    if (sortBy === "joinDate") {
      result = await ctx.db
        .query("users")
        .order("desc")
        .paginate(args.paginationOpts);
    } else {
      result = await ctx.db.query("users").paginate(args.paginationOpts);
    }

    // If sorting by username or activity, we need to sort the results
    if (sortBy === "username" || sortBy === "activity") {
      const sortedPage = [...result.page];
      sortedPage.sort((a, b) => {
        if (sortBy === "username") {
          const aName = a.displayName || a.name || a.userId || "";
          const bName = b.displayName || b.name || b.userId || "";
          return aName.localeCompare(bName);
        }
        // For activity, we'll use creation date as a proxy for now
        return b.createdAt - a.createdAt;
      });

      return {
        page: sortedPage.map((user) => ({
          _id: user._id,
          clerkId: user.clerkId,
          email: user.email,
          name: user.name,
          userId: user.userId,
          displayName: user.displayName,
          subscriptionTier: user.subscriptionTier,
          subscriptionStatus: user.subscriptionStatus,
          imageCredits: user.imageCredits,
          createdAt: user.createdAt,
          role: user.role,
        })),
        isDone: result.isDone,
        continueCursor: result.continueCursor,
      };
    }

    return {
      page: result.page.map((user) => ({
        _id: user._id,
        clerkId: user.clerkId,
        email: user.email,
        name: user.name,
        userId: user.userId,
        displayName: user.displayName,
        subscriptionTier: user.subscriptionTier,
        subscriptionStatus: user.subscriptionStatus,
        imageCredits: user.imageCredits,
        createdAt: user.createdAt,
        role: user.role,
      })),
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

/**
 * Get detailed statistics for a specific user
 * Aggregates wizard count, duel participation, and campaign progress
 */
export const getUserStatistics = query({
  args: { userId: v.string() },
  returns: v.object({
    totalWizards: v.number(),
    multiplayerDuels: v.object({
      total: v.number(),
      wins: v.number(),
      losses: v.number(),
      inProgress: v.number(),
    }),
    campaignBattles: v.object({
      total: v.number(),
      wins: v.number(),
      losses: v.number(),
      currentProgress: v.number(),
    }),
    lastActivityAt: v.optional(v.number()),
    activityLevel: v.union(
      v.literal("inactive"),
      v.literal("low"),
      v.literal("medium"),
      v.literal("high")
    ),
  }),
  handler: async (ctx, args) => {
    // Verify admin access
    await verifySuperAdmin(ctx);

    // Get user to verify they exist
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.userId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Count wizards owned by this user
    const wizards = await ctx.db
      .query("wizards")
      .withIndex("by_owner", (q) => q.eq("owner", args.userId))
      .collect();
    const totalWizards = wizards.length;

    // Get wizard IDs for this user
    const wizardIds = wizards.map((w) => w._id);

    // Get all duels for this user
    const allDuels = await ctx.db
      .query("duels")
      .withIndex("by_player")
      .collect();

    // Filter to only duels where this user is a player
    const userDuels = allDuels.filter((d) => d.players.includes(args.userId));

    const multiplayerDuels = userDuels.filter((d) => !d.isCampaignBattle);

    let multiplayerWins = 0;
    let multiplayerLosses = 0;
    let multiplayerInProgress = 0;

    for (const duel of multiplayerDuels) {
      if (duel.status === "IN_PROGRESS") {
        multiplayerInProgress++;
      } else if (duel.status === "COMPLETED") {
        // Check if any of user's wizards won
        const userWizardIds = duel.wizards.filter((wId) =>
          wizardIds.includes(wId)
        );
        const userWon = userWizardIds.some((wId) =>
          duel.winners?.includes(wId)
        );
        const userLost = userWizardIds.some((wId) =>
          duel.losers?.includes(wId)
        );

        if (userWon) {
          multiplayerWins++;
        } else if (userLost) {
          multiplayerLosses++;
        }
      }
    }

    // Get campaign battles
    const campaignBattles = await ctx.db
      .query("campaignBattles")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    const campaignWins = campaignBattles.filter(
      (b) => b.status === "WON"
    ).length;
    const campaignLosses = campaignBattles.filter(
      (b) => b.status === "LOST"
    ).length;

    // Find highest opponent defeated
    const defeatedOpponents = campaignBattles
      .filter((b) => b.status === "WON")
      .map((b) => b.opponentNumber);
    const currentProgress =
      defeatedOpponents.length > 0 ? Math.max(...defeatedOpponents) : 0;

    // Calculate last activity
    let lastActivityAt: number | undefined = user.createdAt;

    // Check last wizard creation
    if (wizards.length > 0) {
      const lastWizardTime = Math.max(
        ...wizards.map((w) => w.illustrationGeneratedAt || 0)
      );
      if (lastWizardTime > lastActivityAt) {
        lastActivityAt = lastWizardTime;
      }
    }

    // Check last duel activity
    if (userDuels.length > 0) {
      const lastDuelTime = Math.max(
        ...userDuels.map((d) => d.completedAt || d.createdAt)
      );
      if (lastDuelTime > lastActivityAt) {
        lastActivityAt = lastDuelTime;
      }
    }

    // Calculate activity level
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const recentDuels = userDuels.filter(
      (d) => d.createdAt > thirtyDaysAgo
    ).length;

    let activityLevel: "inactive" | "low" | "medium" | "high";

    if (
      lastActivityAt < thirtyDaysAgo ||
      (totalWizards === 0 && userDuels.length === 0)
    ) {
      activityLevel = "inactive";
    } else if (recentDuels <= 2 || totalWizards <= 2) {
      activityLevel = "low";
    } else if (recentDuels <= 10 || totalWizards <= 5) {
      activityLevel = "medium";
    } else {
      activityLevel = "high";
    }

    return {
      totalWizards,
      multiplayerDuels: {
        total: multiplayerDuels.length,
        wins: multiplayerWins,
        losses: multiplayerLosses,
        inProgress: multiplayerInProgress,
      },
      campaignBattles: {
        total: campaignBattles.length,
        wins: campaignWins,
        losses: campaignLosses,
        currentProgress,
      },
      lastActivityAt,
      activityLevel,
    };
  },
});

/**
 * Get platform-wide statistics
 * Provides overview of total users, active users, and content
 */
export const getPlatformStats = query({
  args: {},
  returns: v.object({
    totalUsers: v.number(),
    activeUsers24h: v.number(),
    activeUsers7d: v.number(),
    totalWizards: v.number(),
    totalDuels: v.number(),
    activeDuels: v.number(),
  }),
  handler: async (ctx) => {
    // Verify admin access
    await verifySuperAdmin(ctx);

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    // Get all users
    const allUsers = await ctx.db.query("users").collect();
    const totalUsers = allUsers.length;

    // Get all recent wizards and duels to count active users efficiently
    const recentWizards24h = await ctx.db
      .query("wizards")
      .filter((q) => q.gte(q.field("illustrationGeneratedAt"), oneDayAgo))
      .collect();

    const recentDuels24h = await ctx.db
      .query("duels")
      .filter((q) => q.gte(q.field("createdAt"), oneDayAgo))
      .collect();

    const recentDuels7d = await ctx.db
      .query("duels")
      .filter((q) => q.gte(q.field("createdAt"), sevenDaysAgo))
      .collect();

    // Count unique active users
    const activeUserIds24h = new Set<string>();
    const activeUserIds7d = new Set<string>();

    // Add users who created wizards in last 24h
    for (const wizard of recentWizards24h) {
      if (wizard.owner !== "campaign") {
        activeUserIds24h.add(wizard.owner);
      }
    }

    // Add users who participated in duels in last 24h
    for (const duel of recentDuels24h) {
      for (const playerId of duel.players) {
        activeUserIds24h.add(playerId);
      }
    }

    // Add users who participated in duels in last 7d
    for (const duel of recentDuels7d) {
      for (const playerId of duel.players) {
        activeUserIds7d.add(playerId);
      }
    }

    const activeUsers24h = activeUserIds24h.size;
    const activeUsers7d = activeUserIds7d.size;

    // Count total wizards
    const totalWizards = await ctx.db.query("wizards").collect();

    // Count total duels
    const allDuels = await ctx.db.query("duels").collect();
    const totalDuels = allDuels.length;

    // Count active duels (IN_PROGRESS status)
    const activeDuels = allDuels.filter(
      (d) => d.status === "IN_PROGRESS"
    ).length;

    return {
      totalUsers,
      activeUsers24h,
      activeUsers7d,
      totalWizards: totalWizards.length,
      totalDuels,
      activeDuels,
    };
  },
});

/**
 * Grant image credits to a user
 * Admin-only function to manually adjust user credit balance
 */
export const grantImageCredits = mutation({
  args: {
    targetUserId: v.string(),
    amount: v.number(),
    reason: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    newBalance: v.number(),
  }),
  handler: async (ctx, args) => {
    // Verify admin access and get admin identity
    const adminIdentity = await verifySuperAdmin(ctx);

    // Validate amount
    if (args.amount <= 0 || !Number.isInteger(args.amount)) {
      throw new Error("Credit amount must be a positive integer");
    }

    // Validate reason
    if (!args.reason || args.reason.trim() === "") {
      throw new Error("Reason is required for credit grants");
    }

    // Find target user
    const targetUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.targetUserId))
      .first();

    if (!targetUser) {
      throw new Error("Target user not found");
    }

    // Calculate new balance
    const newBalance = targetUser.imageCredits + args.amount;

    // Update user's credit balance
    await ctx.db.patch(targetUser._id, {
      imageCredits: newBalance,
      updatedAt: Date.now(),
    });

    // Record the transaction with admin identity
    await ctx.db.insert("imageCreditTransactions", {
      userId: args.targetUserId,
      type: "GRANTED",
      amount: args.amount,
      source: "ADMIN_GRANT",
      metadata: {
        grantedBy: adminIdentity.subject,
        grantedByEmail: adminIdentity.email || "unknown",
        reason: args.reason,
      },
      createdAt: Date.now(),
    });

    return {
      success: true,
      newBalance,
    };
  },
});

/**
 * Get detailed statistics for multiple users at once
 * More efficient than calling getUserStatistics multiple times
 */
export const getBatchUserStatistics = query({
  args: { userIds: v.array(v.string()) },
  returns: v.record(
    v.string(),
    v.object({
      totalWizards: v.number(),
      multiplayerDuels: v.object({
        total: v.number(),
        wins: v.number(),
        losses: v.number(),
        inProgress: v.number(),
      }),
      campaignBattles: v.object({
        total: v.number(),
        wins: v.number(),
        losses: v.number(),
        currentProgress: v.number(),
      }),
      lastActivityAt: v.optional(v.number()),
      activityLevel: v.union(
        v.literal("inactive"),
        v.literal("low"),
        v.literal("medium"),
        v.literal("high")
      ),
    })
  ),
  handler: async (ctx, args) => {
    // Verify admin access
    await verifySuperAdmin(ctx);

    const result: Record<
      string,
      {
        totalWizards: number;
        multiplayerDuels: {
          total: number;
          wins: number;
          losses: number;
          inProgress: number;
        };
        campaignBattles: {
          total: number;
          wins: number;
          losses: number;
          currentProgress: number;
        };
        lastActivityAt?: number;
        activityLevel: "inactive" | "low" | "medium" | "high";
      }
    > = {};

    // Process each user
    for (const userId of args.userIds) {
      // Get user to verify they exist
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", userId))
        .first();

      if (!user) {
        continue; // Skip non-existent users
      }

      // Count wizards owned by this user
      const wizards = await ctx.db
        .query("wizards")
        .withIndex("by_owner", (q) => q.eq("owner", userId))
        .collect();
      const totalWizards = wizards.length;

      // Get wizard IDs for this user
      const wizardIds = wizards.map((w) => w._id);

      // Get all duels for this user
      const allDuels = await ctx.db
        .query("duels")
        .withIndex("by_player")
        .collect();

      // Filter to only duels where this user is a player
      const userDuels = allDuels.filter((d) => d.players.includes(userId));

      const multiplayerDuels = userDuels.filter((d) => !d.isCampaignBattle);

      let multiplayerWins = 0;
      let multiplayerLosses = 0;
      let multiplayerInProgress = 0;

      for (const duel of multiplayerDuels) {
        if (duel.status === "IN_PROGRESS") {
          multiplayerInProgress++;
        } else if (duel.status === "COMPLETED") {
          // Check if any of user's wizards won
          const userWizardIds = duel.wizards.filter((wId) =>
            wizardIds.includes(wId)
          );
          const userWon = userWizardIds.some((wId) =>
            duel.winners?.includes(wId)
          );
          const userLost = userWizardIds.some((wId) =>
            duel.losers?.includes(wId)
          );

          if (userWon) {
            multiplayerWins++;
          } else if (userLost) {
            multiplayerLosses++;
          }
        }
      }

      // Get campaign battles
      const campaignBattles = await ctx.db
        .query("campaignBattles")
        .filter((q) => q.eq(q.field("userId"), userId))
        .collect();

      const campaignWins = campaignBattles.filter(
        (b) => b.status === "WON"
      ).length;
      const campaignLosses = campaignBattles.filter(
        (b) => b.status === "LOST"
      ).length;

      // Find highest opponent defeated
      const defeatedOpponents = campaignBattles
        .filter((b) => b.status === "WON")
        .map((b) => b.opponentNumber);
      const currentProgress =
        defeatedOpponents.length > 0 ? Math.max(...defeatedOpponents) : 0;

      // Calculate last activity
      let lastActivityAt: number | undefined = user.createdAt;

      // Check last wizard creation
      if (wizards.length > 0) {
        const lastWizardTime = Math.max(
          ...wizards.map((w) => w.illustrationGeneratedAt || 0)
        );
        if (lastWizardTime > lastActivityAt) {
          lastActivityAt = lastWizardTime;
        }
      }

      // Check last duel activity
      if (userDuels.length > 0) {
        const lastDuelTime = Math.max(
          ...userDuels.map((d) => d.completedAt || d.createdAt)
        );
        if (lastDuelTime > lastActivityAt) {
          lastActivityAt = lastDuelTime;
        }
      }

      // Calculate activity level
      const now = Date.now();
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
      const recentDuels = userDuels.filter(
        (d) => d.createdAt > thirtyDaysAgo
      ).length;

      let activityLevel: "inactive" | "low" | "medium" | "high";

      if (
        lastActivityAt < thirtyDaysAgo ||
        (totalWizards === 0 && userDuels.length === 0)
      ) {
        activityLevel = "inactive";
      } else if (recentDuels <= 2 || totalWizards <= 2) {
        activityLevel = "low";
      } else if (recentDuels <= 10 || totalWizards <= 5) {
        activityLevel = "medium";
      } else {
        activityLevel = "high";
      }

      result[userId] = {
        totalWizards,
        multiplayerDuels: {
          total: multiplayerDuels.length,
          wins: multiplayerWins,
          losses: multiplayerLosses,
          inProgress: multiplayerInProgress,
        },
        campaignBattles: {
          total: campaignBattles.length,
          wins: campaignWins,
          losses: campaignLosses,
          currentProgress,
        },
        lastActivityAt,
        activityLevel,
      };
    }

    return result;
  },
});

/**
 * Update a user's role
 * Admin-only function to change user permissions
 */
export const updateUserRole = mutation({
  args: {
    targetUserId: v.string(),
    newRole: v.union(
      v.literal("user"),
      v.literal("admin"),
      v.literal("super_admin")
    ),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    // Verify admin access
    await verifySuperAdmin(ctx);

    // Find target user by Clerk ID
    const targetUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.targetUserId))
      .first();

    if (!targetUser) {
      throw new Error("Target user not found");
    }

    // Update user's role
    await ctx.db.patch(targetUser._id, {
      role: args.newRole,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: `User role updated to ${args.newRole}`,
    };
  },
});

/**
 * Update a user's role by email
 * Admin-only function to change user permissions using email
 */
export const updateUserRoleByEmail = mutation({
  args: {
    email: v.string(),
    newRole: v.union(
      v.literal("user"),
      v.literal("admin"),
      v.literal("super_admin")
    ),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    // Allow this to work in development without admin check
    if (process.env.NODE_ENV !== "development") {
      await verifySuperAdmin(ctx);
    }

    // Find target user by email
    const targetUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (!targetUser) {
      throw new Error(`User with email ${args.email} not found`);
    }

    // Update user's role
    await ctx.db.patch(targetUser._id, {
      role: args.newRole,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: `User ${args.email} role updated to ${args.newRole}`,
    };
  },
});

/**
 * Get credit transaction history for a specific user
 * Returns paginated list of all credit transactions
 */
export const getCreditHistory = query({
  args: {
    userId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(
      v.object({
        _id: v.id("imageCreditTransactions"),
        type: v.union(
          v.literal("EARNED"),
          v.literal("CONSUMED"),
          v.literal("GRANTED"),
          v.literal("EXPIRED")
        ),
        amount: v.number(),
        source: v.union(
          v.literal("SIGNUP_BONUS"),
          v.literal("AD_REWARD"),
          v.literal("PREMIUM_GRANT"),
          v.literal("ADMIN_GRANT")
        ),
        createdAt: v.number(),
        metadata: v.optional(v.record(v.string(), v.any())),
      })
    ),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    // Verify admin access
    await verifySuperAdmin(ctx);

    // Get paginated transactions for the user, ordered by most recent first
    const result = await ctx.db
      .query("imageCreditTransactions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .paginate(args.paginationOpts);

    return {
      page: result.page.map((transaction) => ({
        _id: transaction._id,
        type: transaction.type,
        amount: transaction.amount,
        source: transaction.source,
        createdAt: transaction.createdAt,
        metadata: transaction.metadata,
      })),
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});
