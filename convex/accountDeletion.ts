/**
 * Deleting a player's account, for good, right away.
 *
 * The Clerk sign-in account goes first, so if that fails nothing is touched.
 * Then the player's data is removed in scheduled batches:
 *
 * 1. Duels. Campaign battles, and duels nobody else ever joined, are deleted.
 *    A duel in progress against another player is forfeited. Duels with
 *    other players are kept, but detached: the player's wizard becomes a
 *    "departed" wizard, their ID is replaced in `players`, and their chat
 *    messages are deleted. Their spells stay so the replay still makes sense.
 * 2. Everything else keyed by the player: unshared wizards, campaign
 *    progress, tokens, notifications, devices, reactions, views, referrals,
 *    moderation records. Purchase records are kept for tax, without the
 *    player's ID. Finally the users row itself.
 */

import { ConvexError, v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id, TableNames } from "./_generated/dataModel";
import { forfeitDuelFor } from "./duels";
import { refundDuelTokens } from "./lib/duelTokens";
import { DEPARTED_OWNER } from "./lib/departed";
import { syncDuelParticipants } from "./lib/duelParticipants";

/** Duels looked at per batch. Each can cascade into many deletes. */
const DUELS_PER_BATCH = 50;
/** Rows deleted per table per batch in the final phase. */
const ROWS_PER_BATCH = 200;

/** What the player must type to confirm: their username, or DELETE. */
export function confirmationPhrase(user: { userId?: string }): string {
  return user.userId ?? "DELETE";
}

export const accountToDelete = internalQuery({
  args: { clerkId: v.string() },
  returns: v.union(v.null(), v.object({ userId: v.optional(v.string()) })),
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();
    return user ? { userId: user.userId } : null;
  },
});

/** Delete the signed-in player's account. Can't be undone. */
export const deleteMyAccount = action({
  args: { confirmation: v.string() },
  returns: v.null(),
  handler: async (ctx, { confirmation }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");
    const clerkId = identity.subject;

    const user = await ctx.runQuery(internal.accountDeletion.accountToDelete, {
      clerkId,
    });
    if (!user) throw new ConvexError("Account not found.");
    const expected = confirmationPhrase(user);
    if (confirmation.trim().toLowerCase() !== expected.toLowerCase()) {
      throw new ConvexError(`Type ${expected} to confirm.`);
    }

    await deleteClerkUser(clerkId);
    await ctx.runMutation(internal.accountDeletion.startAccountDeletion, {
      clerkId,
    });
    return null;
  },
});

async function deleteClerkUser(clerkId: string): Promise<void> {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) {
    throw new ConvexError(
      "Account deletion isn't available right now. Please email support@aiwizardduel.com.",
    );
  }
  const res = await fetch(
    `https://api.clerk.com/v1/users/${encodeURIComponent(clerkId)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${secret}` } },
  );
  // 404: already gone from Clerk, so carry on with our data.
  if (!res.ok && res.status !== 404) {
    console.error("Clerk user deletion failed", res.status, await res.text());
    throw new ConvexError(
      "We couldn't delete your account just now. Nothing was deleted. Please try again.",
    );
  }
}

const cursorValidator = v.union(v.string(), v.null());

/** Start deleting a player's data. Their Clerk account is already gone. */
export const startAccountDeletion = internalMutation({
  args: { clerkId: v.string() },
  returns: v.null(),
  handler: async (ctx, { clerkId }) => {
    // Out of matchmaking first, so nobody gets paired with them.
    for (const entry of await ctx.db
      .query("duelLobby")
      .withIndex("by_user", (q) => q.eq("userId", clerkId))
      .collect()) {
      await ctx.db.delete(entry._id);
    }

    // Wizards are detached as their duels are processed, so remember which
    // ones were the player's before their owner changes.
    const wizards = await ctx.db
      .query("wizards")
      .withIndex("by_owner", (q) => q.eq("owner", clerkId))
      .collect();

    await ctx.scheduler.runAfter(0, internal.accountDeletion.processDuels, {
      clerkId,
      wizardIds: wizards.map((w) => w._id),
      cursor: null,
    });
    return null;
  },
});

export const processDuels = internalMutation({
  args: {
    clerkId: v.string(),
    wizardIds: v.array(v.id("wizards")),
    cursor: cursorValidator,
  },
  returns: v.null(),
  handler: async (ctx, { clerkId, wizardIds, cursor }) => {
    // There's no index on a player's duels (`players` is an array), so walk
    // the table in pages.
    const page = await ctx.db
      .query("duels")
      .paginate({ cursor, numItems: DUELS_PER_BATCH });

    for (const duel of page.page) {
      if (duel.players.includes(clerkId)) {
        await handleDuel(ctx, duel, clerkId, wizardIds);
      }
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.accountDeletion.processDuels, {
        clerkId,
        wizardIds,
        cursor: page.continueCursor,
      });
    } else {
      await ctx.scheduler.runAfter(
        0,
        internal.accountDeletion.deleteRemaining,
        {
          clerkId,
          wizardIds,
        },
      );
    }
    return null;
  },
});

async function handleDuel(
  ctx: MutationCtx,
  duel: Doc<"duels">,
  clerkId: string,
  wizardIds: Id<"wizards">[],
) {
  const otherPlayers = duel.players.filter(
    (p) => p !== clerkId && p !== "campaign" && p !== DEPARTED_OWNER,
  );

  // Nobody else has a stake in it: a campaign battle, a duel nobody joined,
  // or one whose other player already left.
  if (duel.isCampaignBattle || otherPlayers.length === 0) {
    await deleteDuelEntirely(ctx, duel);
    return;
  }

  const mine = duel.wizards.filter((id) => wizardIds.includes(id));
  if (duel.status === "IN_PROGRESS" && mine.length > 0) {
    await forfeitDuelFor(ctx, duel, mine);
  } else if (
    duel.status === "WAITING_FOR_PLAYERS" ||
    duel.status === "IN_PROGRESS"
  ) {
    // Joined but not started yet (the introduction is being written).
    await ctx.db.patch(duel._id, { status: "CANCELLED" });
    await syncDuelParticipants(ctx, duel._id);
    await refundDuelTokens(ctx, duel._id, "player_deleted_account");
  }

  await detachFromDuel(ctx, duel._id, clerkId, mine);
}

/** Keep a duel for the other players, but unlinked from this one. */
async function detachFromDuel(
  ctx: MutationCtx,
  duelId: Id<"duels">,
  clerkId: string,
  mine: Id<"wizards">[],
) {
  const duel = await ctx.db.get(duelId);
  if (!duel) return;

  // A rematch this player offered that nobody accepted is about to be
  // deleted, so don't point at it.
  let rematchDuelId = duel.rematchDuelId;
  if (rematchDuelId) {
    const rematch = await ctx.db.get(rematchDuelId);
    if (
      !rematch ||
      rematch.players.every((p) => p === clerkId || p === DEPARTED_OWNER)
    ) {
      rematchDuelId = undefined;
    }
  }

  await ctx.db.patch(duelId, {
    players: duel.players.map((p) => (p === clerkId ? DEPARTED_OWNER : p)),
    tokensCharged: duel.tokensCharged?.filter((p) => p !== clerkId),
    imageCreditConsumedBy:
      duel.imageCreditConsumedBy === clerkId
        ? undefined
        : duel.imageCreditConsumedBy,
    rematchDuelId,
  });
  await syncDuelParticipants(ctx, duelId);

  for (const message of await ctx.db
    .query("duelMessages")
    .withIndex("by_duel_and_user_and_created_at", (q) =>
      q.eq("duelId", duelId).eq("userId", clerkId),
    )
    .collect()) {
    await ctx.db.delete(message._id);
  }

  for (const wizardId of mine) {
    const wizard = await ctx.db.get(wizardId);
    if (wizard?.owner === clerkId) {
      await ctx.db.patch(wizardId, { owner: DEPARTED_OWNER });
    }
  }
}

async function deleteStorage(ctx: MutationCtx, id: string | undefined) {
  if (!id) return;
  try {
    await ctx.storage.delete(id as Id<"_storage">);
  } catch {
    // Not a storage ID (an external URL), or already gone.
  }
}

async function deleteDuelEntirely(ctx: MutationCtx, duel: Doc<"duels">) {
  const duelId = duel._id;

  for (const round of await ctx.db
    .query("duelRounds")
    .withIndex("by_duel", (q) => q.eq("duelId", duelId))
    .collect()) {
    await deleteStorage(ctx, round.outcome?.illustration);
    await deleteStorage(ctx, round.narration?.storageId);
    await ctx.db.delete(round._id);
  }
  for (const row of await ctx.db
    .query("duelMessages")
    .withIndex("by_duel_and_created_at", (q) => q.eq("duelId", duelId))
    .collect()) {
    await ctx.db.delete(row._id);
  }
  for (const row of await ctx.db
    .query("spellReactions")
    .withIndex("by_duel", (q) => q.eq("duelId", duelId))
    .collect()) {
    await ctx.db.delete(row._id);
  }
  for (const row of await ctx.db
    .query("duelViews")
    .withIndex("by_duel_and_viewer", (q) => q.eq("duelId", duelId))
    .collect()) {
    await ctx.db.delete(row._id);
  }
  for (const row of await ctx.db
    .query("duelViewStats")
    .withIndex("by_duel", (q) => q.eq("duelId", duelId))
    .collect()) {
    await ctx.db.delete(row._id);
  }
  for (const row of await ctx.db
    .query("duelRatings")
    .withIndex("by_duel", (q) => q.eq("duelId", duelId))
    .collect()) {
    await ctx.db.delete(row._id);
  }
  for (const row of await ctx.db
    .query("campaignBattles")
    .withIndex("by_duel", (q) => q.eq("duelId", duelId))
    .collect()) {
    await ctx.db.delete(row._id);
  }

  await deleteStorage(ctx, duel.featuredIllustration);
  await ctx.db.delete(duelId);
  await syncDuelParticipants(ctx, duelId);
}

export const deleteRemaining = internalMutation({
  args: { clerkId: v.string(), wizardIds: v.array(v.id("wizards")) },
  returns: v.null(),
  handler: async (ctx, { clerkId, wizardIds }) => {
    let more = false;
    // Delete one batch of rows; note when there may be more left.
    const purge = async (rows: { _id: Id<TableNames> }[]) => {
      if (rows.length === ROWS_PER_BATCH) more = true;
      for (const row of rows) await ctx.db.delete(row._id);
    };

    // Wizards: departed ones stay in other players' duels; the rest go.
    for (const wizardId of wizardIds) {
      for (const row of await ctx.db
        .query("wizardStats")
        .withIndex("by_wizard", (q) => q.eq("wizardId", wizardId))
        .collect()) {
        await ctx.db.delete(row._id);
      }
      for (const row of await ctx.db
        .query("wizardCampaignProgress")
        .withIndex("by_wizard", (q) => q.eq("wizardId", wizardId))
        .collect()) {
        await ctx.db.delete(row._id);
      }
      const wizard = await ctx.db.get(wizardId);
      if (wizard && wizard.owner === clerkId) {
        await deleteStorage(ctx, wizard.illustration);
        await deleteStorage(ctx, wizard.plainIllustration);
        for (const id of wizard.illustrations ?? []) {
          await deleteStorage(ctx, id);
        }
        await ctx.db.delete(wizardId);
      }
    }
    // Wizards created after the deletion started (unlikely, but possible
    // while the old sign-in token was still valid).
    await purge(
      await ctx.db
        .query("wizards")
        .withIndex("by_owner", (q) => q.eq("owner", clerkId))
        .take(ROWS_PER_BATCH),
    );

    await purge(
      await ctx.db
        .query("campaignBattles")
        .withIndex("by_user_opponent", (q) => q.eq("userId", clerkId))
        .take(ROWS_PER_BATCH),
    );
    await purge(
      await ctx.db
        .query("wizardCampaignProgress")
        .withIndex("by_user", (q) => q.eq("userId", clerkId))
        .take(ROWS_PER_BATCH),
    );
    await purge(
      await ctx.db
        .query("imageCreditTransactions")
        .withIndex("by_user", (q) => q.eq("userId", clerkId))
        .take(ROWS_PER_BATCH),
    );
    await purge(
      await ctx.db
        .query("transactions")
        .withIndex("by_user", (q) => q.eq("userId", clerkId))
        .take(ROWS_PER_BATCH),
    );
    await purge(
      await ctx.db
        .query("userInventory")
        .withIndex("by_user", (q) => q.eq("userId", clerkId))
        .take(ROWS_PER_BATCH),
    );
    await purge(
      await ctx.db
        .query("notifications")
        .withIndex("by_user", (q) => q.eq("userId", clerkId))
        .take(ROWS_PER_BATCH),
    );
    await purge(
      await ctx.db
        .query("pushSubscriptions")
        .withIndex("by_user", (q) => q.eq("userId", clerkId))
        .take(ROWS_PER_BATCH),
    );
    await purge(
      await ctx.db
        .query("moderationEvents")
        .withIndex("by_user_id_and_created_at", (q) => q.eq("userId", clerkId))
        .take(ROWS_PER_BATCH),
    );
    await purge(
      await ctx.db
        .query("adInteractions")
        .withIndex("by_user", (q) => q.eq("userId", clerkId))
        .take(ROWS_PER_BATCH),
    );
    await purge(
      await ctx.db
        .query("spellReactions")
        .withIndex("by_user", (q) => q.eq("userId", clerkId))
        .take(ROWS_PER_BATCH),
    );
    await purge(
      await ctx.db
        .query("duelViews")
        .withIndex("by_viewer", (q) => q.eq("viewerId", `user:${clerkId}`))
        .take(ROWS_PER_BATCH),
    );
    await purge(
      await ctx.db
        .query("referrals")
        .withIndex("by_referrer", (q) => q.eq("referrerId", clerkId))
        .take(ROWS_PER_BATCH),
    );
    await purge(
      await ctx.db
        .query("referrals")
        .withIndex("by_referred", (q) => q.eq("referredId", clerkId))
        .take(ROWS_PER_BATCH),
    );
    await purge(
      await ctx.db
        .query("duelLobby")
        .withIndex("by_user", (q) => q.eq("userId", clerkId))
        .take(ROWS_PER_BATCH),
    );

    // Kept, without the player: purchases for tax records, AI calls for cost
    // tracking.
    const purchases = await ctx.db
      .query("tokenPurchases")
      .withIndex("by_user", (q) => q.eq("userId", clerkId))
      .take(ROWS_PER_BATCH);
    if (purchases.length === ROWS_PER_BATCH) more = true;
    for (const row of purchases) {
      await ctx.db.patch(row._id, { userId: DEPARTED_OWNER });
    }
    const aiCalls = await ctx.db
      .query("aiUsage")
      .withIndex("by_user_id_and_created_at", (q) => q.eq("userId", clerkId))
      .take(ROWS_PER_BATCH);
    if (aiCalls.length === ROWS_PER_BATCH) more = true;
    for (const row of aiCalls) {
      await ctx.db.patch(row._id, { userId: undefined });
    }

    if (more) {
      await ctx.scheduler.runAfter(
        0,
        internal.accountDeletion.deleteRemaining,
        {
          clerkId,
          wizardIds,
        },
      );
      return null;
    }

    for (const user of await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .collect()) {
      await ctx.db.delete(user._id);
    }
    return null;
  },
});
