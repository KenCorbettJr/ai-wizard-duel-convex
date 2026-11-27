import { mutation, internalMutation, internalQuery } from "./_generated/server";
import { STARTING_TOKENS } from "./lib/pricing";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { recordReferral } from "./referrals";
import schema from "./schema";

// Get or create user record
export const getOrCreateUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    /** Handle from an invite link; only used when the account is new. */
    referralHandle: v.optional(v.string()),
  },
  returns: v.id("users"),
  handler: async (ctx, { clerkId, email, name, referralHandle }) => {
    // Callers may only create or update their own record.
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== clerkId) {
      throw new Error("Not authorized");
    }

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

    // Create new user with role from Clerk metadata or default to "user"
    const clerkRole = (identity?.publicMetadata as { role?: string })?.role;
    const role =
      clerkRole === "super_admin" || clerkRole === "admin" ? clerkRole : "user";

    const userId = await ctx.db.insert("users", {
      clerkId,
      role,
      email,
      name,
      imageCredits: STARTING_TOKENS,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Grant initial credits and record the transaction
    await ctx.runMutation(internal.imageCreditService.grantInitialCredits, {
      userId: clerkId,
      amount: STARTING_TOKENS,
    });

    if (referralHandle) {
      await recordReferral(ctx, clerkId, referralHandle);
    }

    return userId;
  },
});

// Get user by Clerk ID (server and tests only: the record includes the email)
export const getUserByClerkId = internalQuery({
  args: { clerkId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      ...schema.tables.users.validator.fields,
    }),
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
      v.literal("super_admin"),
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

// Internal function to create user for testing
export const createUserInternal = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    imageCredits: v.optional(v.number()),
  },
  returns: v.id("users"),
  handler: async (ctx, { clerkId, email, name, imageCredits = 10 }) => {
    const userId = await ctx.db.insert("users", {
      clerkId,
      role: "user",
      email,
      name,
      imageCredits,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return userId;
  },
});
