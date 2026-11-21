"use node";

/**
 * Sends a saved notification to the player's devices with Web Push (VAPID).
 * No Firebase needed: browsers expose a push endpoint (Google's FCM for
 * Chrome/Android, Apple's for Safari/iOS, Mozilla's for Firefox) and
 * `web-push` speaks the standard protocol to all of them.
 *
 * Needs these Convex environment variables:
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY  (npx web-push generate-vapid-keys)
 *   VAPID_SUBJECT                        (mailto:you@example.com or https://your-site)
 */

import { sendNotification, setVapidDetails } from "web-push";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// Collapse a duel's notifications into one on the device: a newer
// "your move" replaces the older one instead of stacking up.
function tagFor(duelId: string | undefined, notificationId: string) {
  return duelId ? `duel:${duelId}` : `n:${notificationId}`;
}

export const deliver = internalAction({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, { notificationId }) => {
    const data = await ctx.runQuery(
      internal.notifications.getPushDeliveryData,
      {
        notificationId,
      },
    );
    if (!data) return;
    const { notification, subscriptions, unreadCount } = data;

    const record = (
      status: "SENT" | "NO_DEVICES" | "FAILED",
      delivered: Id<"pushSubscriptions">[] = [],
      expired: Id<"pushSubscriptions">[] = [],
    ) =>
      ctx.runMutation(internal.notifications.recordPushDelivery, {
        notificationId,
        status,
        deliveredSubscriptionIds: delivered,
        expiredSubscriptionIds: expired,
      });

    if (subscriptions.length === 0) {
      await record("NO_DEVICES");
      return;
    }

    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;
    if (!publicKey || !privateKey || !subject) {
      console.warn("Push skipped: VAPID_* environment variables are not set");
      await record("FAILED");
      return;
    }
    setVapidDetails(subject, publicKey, privateKey);

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      url: notification.url,
      tag: tagFor(notification.duelId, notification._id),
      notificationId: notification._id,
      badgeCount: unreadCount,
    });

    const delivered: Id<"pushSubscriptions">[] = [];
    const expired: Id<"pushSubscriptions">[] = [];

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload,
            // Turn reminders go stale; don't deliver one a day late.
            { TTL: 60 * 60 * 12, urgency: "high" },
          );
          delivered.push(sub._id);
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            expired.push(sub._id);
          } else {
            console.error("Push failed", status, (err as Error).message);
          }
        }
      }),
    );

    await record(delivered.length > 0 ? "SENT" : "FAILED", delivered, expired);
  },
});
