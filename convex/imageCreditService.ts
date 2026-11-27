import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { refundWizardImageToken as refundToken } from "./lib/wizardImageTokens";
import { sponsoredSeatsFor } from "./lib/sponsorship";

// Credit source types
const CreditSource = v.union(
  v.literal("SIGNUP_BONUS"),
  v.literal("AD_REWARD"),
  v.literal("PREMIUM_GRANT"),
  v.literal("ADMIN_GRANT"),
  v.literal("DUEL_ENTRY"),
  v.literal("DUEL_REFUND"),
  v.literal("WIZARD_IMAGE"),
  v.literal("WIZARD_IMAGE_REFUND"),
  v.literal("PURCHASE"),
  v.literal("REFERRAL_BONUS"),
);

// Transaction types
const TransactionType = v.union(
  v.literal("EARNED"),
  v.literal("CONSUMED"),
  v.literal("GRANTED"),
  v.literal("EXPIRED"),
);

/**
 * Get user's current image credit balance
 */
export const getUserImageCredits = query({
  args: {
    userId: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.userId))
      .first();

    if (!user) {
      // Return 0 for new users who haven't been initialized yet
      return 0;
    }

    return user.imageCredits;
  },
});

/**
 * Check if user has sufficient image credits for a duel
 */
export const hasImageCreditsForDuel = query({
  args: {
    userId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.userId))
      .first();

    if (!user) {
      return false;
    }

    // Check if user is premium (unlimited credits)
    if (
      user.subscriptionTier === "PREMIUM" &&
      user.subscriptionStatus === "ACTIVE"
    ) {
      return true;
    }

    // Check if user has at least 1 credit, or a sponsor covers their entry
    if (user.imageCredits > 0) return true;
    return (await sponsoredSeatsFor(ctx, args.userId, 1, Date.now())) > 0;
  },
});

/**
 * Consume an image credit for AI generation
 */
export const consumeImageCredit = internalMutation({
  args: {
    userId: v.string(),
    metadata: v.optional(v.record(v.string(), v.string())),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.userId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Premium users have unlimited credits
    if (
      user.subscriptionTier === "PREMIUM" &&
      user.subscriptionStatus === "ACTIVE"
    ) {
      // Still track the usage for analytics
      await ctx.db.insert("imageCreditTransactions", {
        userId: args.userId,
        type: "CONSUMED",
        amount: 0, // No actual credit consumed for premium users
        source: "PREMIUM_GRANT",
        metadata: args.metadata,
        createdAt: Date.now(),
      });

      // Update monthly usage
      await ctx.db.patch(user._id, {
        monthlyUsage: {
          ...user.monthlyUsage,
          imageGenerations: user.monthlyUsage.imageGenerations + 1,
        },
        updatedAt: Date.now(),
      });

      return true;
    }

    // Check if user has credits
    if (user.imageCredits <= 0) {
      return false;
    }

    // Consume one credit
    await ctx.db.patch(user._id, {
      imageCredits: user.imageCredits - 1,
      monthlyUsage: {
        ...user.monthlyUsage,
        imageGenerations: user.monthlyUsage.imageGenerations + 1,
      },
      updatedAt: Date.now(),
    });

    // Record the transaction
    await ctx.db.insert("imageCreditTransactions", {
      userId: args.userId,
      type: "CONSUMED",
      amount: 1,
      source: "PREMIUM_GRANT", // This will be updated based on context
      metadata: args.metadata,
      createdAt: Date.now(),
    });

    return true;
  },
});

/**
 * Refund the token charged for a wizard illustration that failed to generate
 */
export const refundWizardImageToken = internalMutation({
  args: { userId: v.string(), wizardId: v.id("wizards") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await refundToken(ctx, args.userId, args.wizardId);
    return null;
  },
});

/**
 * Award image credits to a user
 */
export const awardImageCredit = internalMutation({
  args: {
    userId: v.string(),
    amount: v.number(),
    source: CreditSource,
    relatedAdId: v.optional(v.id("adInteractions")),
    metadata: v.optional(v.record(v.string(), v.string())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.amount <= 0) {
      throw new Error("Token amount must be positive");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.userId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Add credits to user balance
    await ctx.db.patch(user._id, {
      imageCredits: user.imageCredits + args.amount,
      updatedAt: Date.now(),
    });

    // Record the transaction
    await ctx.db.insert("imageCreditTransactions", {
      userId: args.userId,
      type: "EARNED",
      amount: args.amount,
      source: args.source,
      relatedAdId: args.relatedAdId,
      metadata: args.metadata,
      createdAt: Date.now(),
    });

    return null;
  },
});

/**
 * Get user's image credit transaction history
 */
export const getImageCreditHistory = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("imageCreditTransactions"),
      type: TransactionType,
      amount: v.number(),
      source: CreditSource,
      createdAt: v.number(),
      metadata: v.optional(v.record(v.string(), v.string())),
    }),
  ),
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    const transactions = await ctx.db
      .query("imageCreditTransactions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);

    return transactions.map((transaction) => ({
      _id: transaction._id,
      type: transaction.type,
      amount: transaction.amount,
      source: transaction.source,
      createdAt: transaction.createdAt,
      metadata: transaction.metadata,
    }));
  },
});

/**
 * Grant initial credits to new users (called during user creation)
 */
export const grantInitialCredits = internalMutation({
  args: {
    userId: v.string(),
    amount: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Record the initial credit grant transaction
    await ctx.db.insert("imageCreditTransactions", {
      userId: args.userId,
      type: "GRANTED",
      amount: args.amount,
      source: "SIGNUP_BONUS",
      metadata: {
        reason: "New user signup bonus",
      },
      createdAt: Date.now(),
    });

    return null;
  },
});

/**
 * Admin function to grant credits to a user
 */
export const adminGrantCredits = mutation({
  args: {
    targetUserId: v.string(),
    amount: v.number(),
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get current user identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Check if current user is admin or super admin
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (
      !currentUser ||
      (currentUser.role !== "admin" && currentUser.role !== "super_admin")
    ) {
      throw new Error("Access denied: Admin privileges required");
    }

    if (args.amount <= 0) {
      throw new Error("Token amount must be positive");
    }

    // Find target user
    const targetUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.targetUserId))
      .first();

    if (!targetUser) {
      throw new Error("Target user not found");
    }

    // Add credits to target user
    await ctx.db.patch(targetUser._id, {
      imageCredits: targetUser.imageCredits + args.amount,
      updatedAt: Date.now(),
    });

    // Record the transaction
    await ctx.db.insert("imageCreditTransactions", {
      userId: args.targetUserId,
      type: "GRANTED",
      amount: args.amount,
      source: "ADMIN_GRANT",
      metadata: {
        grantedBy: identity.subject,
        reason: args.reason || "Admin token grant",
      },
      createdAt: Date.now(),
    });

    return null;
  },
});

/**
 * Get credit statistics for analytics
 */
export const getCreditStatistics = query({
  args: {
    timeframe: v.optional(v.number()), // Days to look back
  },
  returns: v.object({
    totalCreditsEarned: v.number(),
    totalCreditsConsumed: v.number(),
    totalCreditsGranted: v.number(),
    adRewardCredits: v.number(),
    signupBonusCredits: v.number(),
    activeUsers: v.number(),
  }),
  handler: async (ctx, args) => {
    // Get current user identity and check admin access
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (
      !currentUser ||
      (currentUser.role !== "admin" && currentUser.role !== "super_admin")
    ) {
      throw new Error("Access denied: Admin privileges required");
    }

    const timeframe = args.timeframe || 30;
    const cutoffTime = Date.now() - timeframe * 24 * 60 * 60 * 1000;

    const transactions = await ctx.db
      .query("imageCreditTransactions")
      .filter((q) => q.gte(q.field("createdAt"), cutoffTime))
      .collect();

    let totalCreditsEarned = 0;
    let totalCreditsConsumed = 0;
    let totalCreditsGranted = 0;
    let adRewardCredits = 0;
    let signupBonusCredits = 0;

    for (const transaction of transactions) {
      switch (transaction.type) {
        case "EARNED":
          totalCreditsEarned += transaction.amount;
          if (transaction.source === "AD_REWARD") {
            adRewardCredits += transaction.amount;
          }
          break;
        case "CONSUMED":
          totalCreditsConsumed += transaction.amount;
          break;
        case "GRANTED":
          totalCreditsGranted += transaction.amount;
          if (transaction.source === "SIGNUP_BONUS") {
            signupBonusCredits += transaction.amount;
          }
          break;
      }
    }

    // Count active users (users with credits > 0 or premium)
    const users = await ctx.db.query("users").collect();
    const activeUsers = users.filter(
      (user) =>
        user.imageCredits > 0 ||
        (user.subscriptionTier === "PREMIUM" &&
          user.subscriptionStatus === "ACTIVE"),
    ).length;

    return {
      totalCreditsEarned,
      totalCreditsConsumed,
      totalCreditsGranted,
      adRewardCredits,
      signupBonusCredits,
      activeUsers,
    };
  },
});
