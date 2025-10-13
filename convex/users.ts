import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Get or create user record
export const getOrCreateUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  returns: v.id("users"),
  handler: async (ctx, { clerkId, email, name }) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    if (existingUser) {
      // Update user info if provided
      if (email || name) {
        await ctx.db.patch(existingUser._id, {
          email: email || existingUser.email,
          name: name || existingUser.name,
          updatedAt: Date.now(),
        });
      }
      return existingUser._id;
    }

    // Create new user with default role and monetization defaults
    const userId = await ctx.db.insert("users", {
      clerkId,
      role: "user",
      email,
      name,
      subscriptionTier: "FREE",
      subscriptionStatus: "ACTIVE",
      imageCredits: 10, // Initial 10 credits for new users
      monthlyUsage: {
        duelsPlayed: 0,
        wizardsCreated: 0,
        imageGenerations: 0,
        adsWatched: 0,
        resetDate: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days from now
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Grant initial credits and record the transaction
    await ctx.runMutation(internal.imageCreditService.grantInitialCredits, {
      userId: clerkId,
      amount: 10,
    });

    return userId;
  },
});

// Get user by Clerk ID
export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      clerkId: v.string(),
      role: v.union(
        v.literal("user"),
        v.literal("admin"),
        v.literal("super_admin")
      ),
      email: v.optional(v.string()),
      name: v.optional(v.string()),
      subscriptionTier: v.union(v.literal("FREE"), v.literal("PREMIUM")),
      subscriptionStatus: v.union(
        v.literal("ACTIVE"),
        v.literal("CANCELED"),
        v.literal("PAST_DUE"),
        v.literal("TRIALING")
      ),
      stripeCustomerId: v.optional(v.string()),
      stripeSubscriptionId: v.optional(v.string()),
      subscriptionEndsAt: v.optional(v.number()),
      imageCredits: v.number(),
      monthlyUsage: v.object({
        duelsPlayed: v.number(),
        wizardsCreated: v.number(),
        imageGenerations: v.number(),
        adsWatched: v.number(),
        resetDate: v.number(),
      }),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, { clerkId }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();
  },
});

// Update user role (super admin only)
export const updateUserRole = mutation({
  args: {
    clerkId: v.string(),
    role: v.union(
      v.literal("user"),
      v.literal("admin"),
      v.literal("super_admin")
    ),
  },
  returns: v.id("users"),
  handler: async (ctx, { clerkId, role }) => {
    // Get current user identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Check if current user is super admin
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser || currentUser.role !== "super_admin") {
      throw new Error("Access denied: Super admin privileges required");
    }

    // Find target user
    const targetUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    if (!targetUser) {
      throw new Error("User not found");
    }

    // Update role
    await ctx.db.patch(targetUser._id, {
      role,
      updatedAt: Date.now(),
    });

    return targetUser._id;
  },
});

// List all users (super admin only)
export const listUsers = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      clerkId: v.string(),
      role: v.union(
        v.literal("user"),
        v.literal("admin"),
        v.literal("super_admin")
      ),
      email: v.optional(v.string()),
      name: v.optional(v.string()),
      subscriptionTier: v.union(v.literal("FREE"), v.literal("PREMIUM")),
      subscriptionStatus: v.union(
        v.literal("ACTIVE"),
        v.literal("CANCELED"),
        v.literal("PAST_DUE"),
        v.literal("TRIALING")
      ),
      stripeCustomerId: v.optional(v.string()),
      stripeSubscriptionId: v.optional(v.string()),
      subscriptionEndsAt: v.optional(v.number()),
      imageCredits: v.number(),
      monthlyUsage: v.object({
        duelsPlayed: v.number(),
        wizardsCreated: v.number(),
        imageGenerations: v.number(),
        adsWatched: v.number(),
        resetDate: v.number(),
      }),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    // Get current user identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Check if current user is super admin
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser || currentUser.role !== "super_admin") {
      throw new Error("Access denied: Super admin privileges required");
    }

    return await ctx.db.query("users").collect();
  },
});
// Internal function to update user subscription (for testing and webhooks)
export const updateUserSubscription = mutation({
  args: {
    userId: v.id("users"),
    subscriptionTier: v.union(v.literal("FREE"), v.literal("PREMIUM")),
    subscriptionStatus: v.union(
      v.literal("ACTIVE"),
      v.literal("CANCELED"),
      v.literal("PAST_DUE"),
      v.literal("TRIALING")
    ),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    subscriptionEndsAt: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      subscriptionTier: args.subscriptionTier,
      subscriptionStatus: args.subscriptionStatus,
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      subscriptionEndsAt: args.subscriptionEndsAt,
      updatedAt: Date.now(),
    });

    return null;
  },
});

// Internal function to create user for testing
export const createUserInternal = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    imageCredits: v.optional(v.number()),
    subscriptionTier: v.optional(
      v.union(v.literal("FREE"), v.literal("PREMIUM"))
    ),
    subscriptionStatus: v.optional(
      v.union(
        v.literal("ACTIVE"),
        v.literal("CANCELED"),
        v.literal("PAST_DUE"),
        v.literal("TRIALING")
      )
    ),
  },
  returns: v.id("users"),
  handler: async (
    ctx,
    {
      clerkId,
      email,
      name,
      imageCredits = 10,
      subscriptionTier = "FREE",
      subscriptionStatus = "ACTIVE",
    }
  ) => {
    const userId = await ctx.db.insert("users", {
      clerkId,
      role: "user",
      email,
      name,
      subscriptionTier,
      subscriptionStatus,
      imageCredits,
      monthlyUsage: {
        duelsPlayed: 0,
        wizardsCreated: 0,
        imageGenerations: 0,
        adsWatched: 0,
        resetDate: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days from now
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return userId;
  },
});
