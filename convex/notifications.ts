/**
 * Notifications: an in-app inbox plus Web Push to the player's devices.
 *
 * Anything that wants to tell a player something calls `createNotification`
 * from a mutation. That saves the inbox row and schedules push delivery
 * (convex/pushDelivery.ts). Duel events go through the presence-aware
 * helpers below, so players who are watching the duel aren't pinged.
 */

import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { isPlayerInArena } from "./presence";

/** How long after a round opens before we remind players who are away. */
export const TURN_REMINDER_DELAY_MS = 30_000;
/** How long after a player leaves a duel, still owing a spell, before we remind them. */
export const LEFT_DUEL_REMINDER_DELAY_MS = 60_000;
/** How long after a duel ends before we tell players who weren't watching. */
export const DUEL_RESULT_DELAY_MS = 30_000;

const INBOX_PAGE_SIZE = 50;
const UNREAD_COUNT_CAP = 99;

type NotificationType = Doc<"notifications">["type"];

interface NewNotification {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  url: string;
  duelId?: Id<"duels">;
  dedupeKey?: string;
}

const isTestEnv = () => process.env.NODE_ENV === "test";

/**
 * Save a notification and push it to the player's devices. Returns null if a
 * notification with the same dedupeKey already exists.
 */
export async function createNotification(
  ctx: MutationCtx,
  n: NewNotification,
): Promise<Id<"notifications"> | null> {
  if (n.dedupeKey) {
    const existing = await ctx.db
      .query("notifications")
      .withIndex("by_dedupe_key", (q) => q.eq("dedupeKey", n.dedupeKey))
      .first();
    if (existing) return null;
  }

  const id = await ctx.db.insert("notifications", {
    ...n,
    createdAt: Date.now(),
    pushStatus: "PENDING",
  });

  if (!isTestEnv()) {
    await ctx.scheduler.runAfter(0, internal.pushDelivery.deliver, {
      notificationId: id,
    });
  }
  return id;
}

/** Real players only: skips the campaign AI and anyone without an account. */
async function isRealPlayer(ctx: QueryCtx, userId: string): Promise<boolean> {
  if (userId === "campaign") return false;
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", userId))
    .unique();
  return !!user;
}

/** Name of the first wizard in the duel that this player doesn't own. */
async function opponentName(
  ctx: QueryCtx,
  duel: Doc<"duels">,
  userId: string,
): Promise<string> {
  for (const id of duel.wizards) {
    const w = await ctx.db.get(id);
    if (w && w.owner !== userId) return w.name;
  }
  return "your opponent";
}

// ---------------------------------------------------------------------------
// Duel triggers. Call these from duel mutations.
// ---------------------------------------------------------------------------

/** A spell-casting round just opened: remind anyone away from the duel. */
export async function scheduleTurnReminders(
  ctx: MutationCtx,
  duelId: Id<"duels">,
  roundNumber: number,
  delayMs = TURN_REMINDER_DELAY_MS,
) {
  if (isTestEnv()) return;
  await ctx.scheduler.runAfter(
    delayMs,
    internal.notifications.sendTurnReminders,
    {
      duelId,
      roundNumber,
    },
  );
}

/** A duel just finished: tell anyone who wasn't watching. */
export async function scheduleDuelResultNotifications(
  ctx: MutationCtx,
  duelId: Id<"duels">,
) {
  if (isTestEnv()) return;
  await ctx.scheduler.runAfter(
    DUEL_RESULT_DELAY_MS,
    internal.notifications.sendDuelResults,
    { duelId },
  );
}

export const sendTurnReminders = internalMutation({
  args: { duelId: v.id("duels"), roundNumber: v.number() },
  handler: async (ctx, { duelId, roundNumber }) => {
    const duel = await ctx.db.get(duelId);
    // The round has moved on, or the duel ended: nothing to remind about.
    if (
      !duel ||
      duel.status !== "IN_PROGRESS" ||
      duel.currentRound !== roundNumber
    ) {
      return;
    }

    for (const wizardId of duel.needActionsFrom) {
      const wizard = await ctx.db.get(wizardId);
      if (!wizard) continue;
      const userId = wizard.owner;
      if (!(await isRealPlayer(ctx, userId))) continue;
      if (await isPlayerInArena(ctx, userId, duelId)) continue;

      const opponent = await opponentName(ctx, duel, userId);

      await createNotification(ctx, {
        userId,
        type: "YOUR_TURN",
        title:
          roundNumber === 1
            ? "Your duel has begun!"
            : `Round ${roundNumber}: your move`,
        body:
          roundNumber === 1
            ? `${wizard.name} faces ${opponent}. Cast your first spell.`
            : `${opponent} is waiting. Cast ${wizard.name}'s next spell.`,
        url: `/duels/${duelId}`,
        duelId,
        dedupeKey: `turn:${duelId}:${roundNumber}:${userId}`,
      });
    }
  },
});

export const sendDuelResults = internalMutation({
  args: { duelId: v.id("duels") },
  handler: async (ctx, { duelId }) => {
    const duel = await ctx.db.get(duelId);
    if (!duel || duel.status !== "COMPLETED") return;

    for (const userId of new Set(duel.players)) {
      if (!(await isRealPlayer(ctx, userId))) continue;
      if (await isPlayerInArena(ctx, userId, duelId)) continue;

      // This player's wizard(s) in the duel
      const mine: Doc<"wizards">[] = [];
      for (const id of duel.wizards) {
        const w = await ctx.db.get(id);
        if (w && w.owner === userId) mine.push(w);
      }
      const won = mine.some((w) => duel.winners?.includes(w._id));
      const lost = mine.some((w) => duel.losers?.includes(w._id));
      const name = mine[0]?.name ?? "Your wizard";

      // The player who forfeited already knows how it ended.
      if (duel.forfeitedBy && mine.some((w) => w._id === duel.forfeitedBy)) {
        continue;
      }

      await createNotification(ctx, {
        userId,
        type: "DUEL_RESULT",
        title: won ? "Victory!" : lost ? "Defeat" : "The duel is over",
        body: won
          ? duel.forfeitedBy
            ? `Your opponent forfeited. ${name} wins the duel!`
            : `${name} won the duel. Relive the battle.`
          : lost
            ? `${name} fell in battle. See how it ended.`
            : `${name}'s duel has ended. See how it played out.`,
        url: `/duels/${duelId}`,
        duelId,
        dedupeKey: `result:${duelId}:${userId}`,
      });
    }
  },
});

// ---------------------------------------------------------------------------
// Leaving a duel. Who is in a duel is tracked by the presence component
// (convex/presence.ts); this only handles a player stepping away mid-turn.
// ---------------------------------------------------------------------------

/**
 * The player hid or left the duel page. If they still owe a spell, remind
 * them shortly unless they come back first.
 */
export const noteLeftDuel = mutation({
  args: { duelId: v.id("duels") },
  handler: async (ctx, { duelId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;
    const userId = identity.subject;

    const duel = await ctx.db.get(duelId);
    if (!duel || duel.status !== "IN_PROGRESS") return;
    for (const wizardId of duel.needActionsFrom) {
      const wizard = await ctx.db.get(wizardId);
      if (wizard?.owner === userId) {
        await scheduleTurnReminders(
          ctx,
          duelId,
          duel.currentRound,
          LEFT_DUEL_REMINDER_DELAY_MS,
        );
        return;
      }
    }
  },
});

// ---------------------------------------------------------------------------
// Inbox
// ---------------------------------------------------------------------------

export const listMyNotifications = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .take(INBOX_PAGE_SIZE);
  },
});

export const getMyUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_and_read_at", (q) =>
        q.eq("userId", identity.subject).eq("readAt", undefined),
      )
      .take(UNREAD_COUNT_CAP + 1);
    return unread.length;
  },
});

export const markNotificationRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, { notificationId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const n = await ctx.db.get(notificationId);
    if (!n || n.userId !== identity.subject) return;
    if (!n.readAt) await ctx.db.patch(notificationId, { readAt: Date.now() });
  },
});

export const markAllNotificationsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_and_read_at", (q) =>
        q.eq("userId", identity.subject).eq("readAt", undefined),
      )
      .take(500);
    const now = Date.now();
    for (const n of unread) await ctx.db.patch(n._id, { readAt: now });
  },
});

/** Opening a duel marks its notifications read. */
export const markDuelNotificationsRead = mutation({
  args: { duelId: v.id("duels") },
  handler: async (ctx, { duelId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_and_read_at", (q) =>
        q.eq("userId", identity.subject).eq("readAt", undefined),
      )
      .take(200);
    const now = Date.now();
    for (const n of unread) {
      if (n.duelId === duelId) await ctx.db.patch(n._id, { readAt: now });
    }
  },
});

// ---------------------------------------------------------------------------
// Push subscriptions
// ---------------------------------------------------------------------------

export const savePushSubscription = mutation({
  args: {
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .unique();
    if (existing) {
      // Same browser, possibly a different account signed in now.
      await ctx.db.patch(existing._id, { ...args, userId: identity.subject });
      return;
    }
    await ctx.db.insert("pushSubscriptions", {
      ...args,
      userId: identity.subject,
      createdAt: Date.now(),
    });
  },
});

export const removePushSubscription = mutation({
  args: { endpoint: v.string() },
  handler: async (ctx, { endpoint }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
      .unique();
    if (existing && existing.userId === identity.subject) {
      await ctx.db.delete(existing._id);
    }
  },
});

/** Whether this browser's subscription is registered to the signed-in player. */
export const isPushSubscriptionActive = query({
  args: { endpoint: v.string() },
  handler: async (ctx, { endpoint }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
      .unique();
    return !!existing && existing.userId === identity.subject;
  },
});

// ---------------------------------------------------------------------------
// Internal helpers for push delivery (pushDelivery.ts runs in Node)
// ---------------------------------------------------------------------------

export const getPushDeliveryData = internalQuery({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, { notificationId }) => {
    const notification = await ctx.db.get(notificationId);
    if (!notification) return null;
    const subscriptions = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", notification.userId))
      .collect();
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_and_read_at", (q) =>
        q.eq("userId", notification.userId).eq("readAt", undefined),
      )
      .take(UNREAD_COUNT_CAP + 1);
    return { notification, subscriptions, unreadCount: unread.length };
  },
});

export const recordPushDelivery = internalMutation({
  args: {
    notificationId: v.id("notifications"),
    status: v.union(
      v.literal("SENT"),
      v.literal("NO_DEVICES"),
      v.literal("FAILED"),
    ),
    deliveredSubscriptionIds: v.array(v.id("pushSubscriptions")),
    expiredSubscriptionIds: v.array(v.id("pushSubscriptions")),
  },
  handler: async (
    ctx,
    {
      notificationId,
      status,
      deliveredSubscriptionIds,
      expiredSubscriptionIds,
    },
  ) => {
    if (await ctx.db.get(notificationId)) {
      await ctx.db.patch(notificationId, { pushStatus: status });
    }
    const now = Date.now();
    for (const id of deliveredSubscriptionIds) {
      if (await ctx.db.get(id)) await ctx.db.patch(id, { lastSuccessAt: now });
    }
    // The browser dropped these (uninstalled, permission revoked, etc.)
    for (const id of expiredSubscriptionIds) {
      if (await ctx.db.get(id)) await ctx.db.delete(id);
    }
  },
});
