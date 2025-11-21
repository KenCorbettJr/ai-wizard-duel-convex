import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Promote a user to super_admin by email
 * This is an internal mutation that can be called from the Convex dashboard
 */
export const promoteUserToSuperAdmin = internalMutation({
  args: {
    email: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, { email }) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), email))
      .first();

    if (!user) {
      return {
        success: false,
        message: `User with email ${email} not found`,
      };
    }

    await ctx.db.patch(user._id, { role: "super_admin" });

    return {
      success: true,
      message: `User ${email} has been promoted to super_admin`,
    };
  },
});
