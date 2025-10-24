import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { promoteToSuperAdmin, debugUserMetadata } from "./auth.utils";

/**
 * Development-only mutation to promote a user to super admin
 * This is only available in development mode for security
 */
export const promoteUserToSuperAdmin = mutation({
  args: {
    userEmail: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    user: v.object({
      email: v.optional(v.string()),
      role: v.string(),
    }),
  }),
  handler: async (ctx, args) => {
    return await promoteToSuperAdmin(ctx, args.userEmail);
  },
});

/**
 * Debug query to check current user's permissions and metadata
 */
export const debugCurrentUser = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await debugUserMetadata(ctx);
  },
});

/**
 * List all users with their roles (development only)
 */
export const listUsersWithRoles = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("users"),
      email: v.optional(v.string()),
      role: v.string(),
      clerkId: v.string(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    // Only allow in development
    if (process.env.NODE_ENV !== "development") {
      throw new Error("This function is only available in development mode");
    }

    const users = await ctx.db.query("users").collect();
    return users.map((user) => ({
      _id: user._id,
      email: user.email,
      role: user.role,
      clerkId: user.clerkId,
      createdAt: user.createdAt,
    }));
  },
});
