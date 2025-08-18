import { GenericQueryCtx, GenericMutationCtx } from "convex/server";
import { DataModel, Id } from "./_generated/dataModel";

// Helper function to get authenticated user identity
export async function getAuthenticatedUser(
  ctx: GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity;
}

// Helper function to verify wizard ownership
export async function verifyWizardOwnership(
  ctx: GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>,
  wizardId: Id<"wizards">,
  userId: string
) {
  const wizard = await ctx.db.get(wizardId);
  if (!wizard) {
    throw new Error("Wizard not found");
  }
  if (wizard.owner !== userId) {
    throw new Error("Not authorized to access this wizard");
  }
  return wizard;
}

// Helper function to verify duel participation
export async function verifyDuelParticipation(
  ctx: GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>,
  duelId: Id<"duels">,
  userId: string
) {
  const duel = await ctx.db.get(duelId);
  if (!duel) {
    throw new Error("Duel not found");
  }
  if (!duel.players.includes(userId)) {
    throw new Error("Not authorized to access this duel");
  }
  return duel;
}

// Helper function to verify super admin access
export async function verifySuperAdmin(
  ctx: GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  // Allow super admin access in development mode
  if (process.env.NODE_ENV === "development") {
    console.log("Development mode: granting super admin access");
    return identity;
  }

  // Check user role from our users table
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();

  console.log("User lookup:", {
    clerkId: identity.subject,
    user: user ? { role: user.role, email: user.email } : null,
  });

  if (!user) {
    throw new Error(
      "User not found in database. Please contact an administrator."
    );
  }

  if (user.role !== "super_admin") {
    throw new Error(
      `Access denied: Super admin privileges required. Current role: ${user.role}`
    );
  }

  return identity;
}

// Debug function to check current user's metadata
export async function debugUserMetadata(
  ctx: GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return { error: "Not authenticated" };
  }

  // Check user in database
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();

  return {
    subject: identity.subject,
    publicMetadata: identity.publicMetadata,
    jwtRole: (identity.publicMetadata as { role?: string })?.role,
    databaseUser: user
      ? { role: user.role, email: user.email, createdAt: user.createdAt }
      : null,
    environment: process.env.NODE_ENV,
  };
}
