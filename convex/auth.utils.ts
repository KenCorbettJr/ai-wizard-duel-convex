import { GenericQueryCtx, GenericMutationCtx } from "convex/server";
import { DataModel } from "./_generated/dataModel";

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
  wizardId: string,
  userId: string
) {
  const wizard = await ctx.db.get(wizardId as any);
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
  duelId: string,
  userId: string
) {
  const duel = await ctx.db.get(duelId as any);
  if (!duel) {
    throw new Error("Duel not found");
  }
  if (!duel.players.includes(userId)) {
    throw new Error("Not authorized to access this duel");
  }
  return duel;
}
