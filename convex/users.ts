import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

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

    // Create new user with default role
    const userId = await ctx.db.insert("users", {
      clerkId,
      role: "user",
      email,
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
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
