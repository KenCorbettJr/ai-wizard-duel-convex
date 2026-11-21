/**
 * Who is in a duel's arena right now, via the Convex presence component.
 *
 * Each duel is a room (roomId = duel ID). Everyone viewing the duel page joins,
 * signed in or not:
 *   - signed-in viewers as "user:<clerk id>" (checked against their login)
 *   - anonymous viewers as "anon:<browser session id>" (unverified, so they
 *     only ever count toward the onlooker total)
 *
 * The client hook (usePresence from @convex-dev/presence/react) needs this
 * module to be named `presence` with heartbeat/list/disconnect exports: its
 * tab-close beacon calls `presence:disconnect` by path.
 */

import { v } from "convex/values";
import { Presence } from "@convex-dev/presence";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { components } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";

export const presence = new Presence(components.presence);

/** Presence user ID for a signed-in player. */
export const userPresenceId = (clerkId: string) => `user:${clerkId}`;

const ANON_ID = /^anon:[A-Za-z0-9_-]{8,64}$/;
const MAX_COUNTED = 500;

/**
 * Throws unless this is a valid viewer ID for the caller: their own
 * "user:<clerk id>" when signed in, or any well-formed "anon:" ID.
 */
export async function assertViewerId(
  ctx: MutationCtx,
  viewerId: string,
): Promise<void> {
  if (viewerId.startsWith("user:")) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || userPresenceId(identity.subject) !== viewerId) {
      throw new Error("Not authorized");
    }
  } else if (!ANON_ID.test(viewerId)) {
    throw new Error("Invalid presence ID");
  }
}

/** Who is online in a duel's arena, split into onlookers and duelists. */
export async function arenaCrowd(
  ctx: QueryCtx | MutationCtx,
  duel: Doc<"duels">,
) {
  const online = await presence.listRoom(ctx, duel._id, true, MAX_COUNTED);
  const duelistIds = new Set(duel.players.map(userPresenceId));
  const onlookerIds = online
    .map((p) => p.userId)
    .filter((id) => !duelistIds.has(id));
  return {
    onlookerIds,
    atCapacity: online.length >= MAX_COUNTED,
    playersHere: duel.players.filter((p) =>
      online.some((o) => o.userId === userPresenceId(p)),
    ),
  };
}

export const heartbeat = mutation({
  args: {
    roomId: v.string(),
    userId: v.string(),
    sessionId: v.string(),
    interval: v.number(),
  },
  handler: async (ctx, { roomId, userId, sessionId, interval }) => {
    const duelId = ctx.db.normalizeId("duels", roomId);
    if (!duelId || !(await ctx.db.get(duelId))) {
      throw new Error("Unknown duel");
    }

    await assertViewerId(ctx, userId);

    // Keep heartbeats within sane bounds; the timeout is 2.5x this.
    const safeInterval = Math.min(Math.max(interval, 5_000), 30_000);
    return await presence.heartbeat(
      ctx,
      roomId,
      userId,
      sessionId,
      safeInterval,
    );
  },
});

/**
 * Required by the hook, but deliberately empty: the stock list would reveal
 * every onlooker's account ID to everyone. The duel page reads counts from
 * `arena` below instead.
 */
export const list = query({
  args: { roomToken: v.string() },
  handler: async () => [],
});

export const disconnect = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    // No auth check: this arrives via sendBeacon when the tab closes. The
    // session token is only known to the browser that holds the session.
    return await presence.disconnect(ctx, sessionToken);
  },
});

/**
 * Who is in the arena: how many onlookers, and which duelists are present.
 * Reads nothing per viewer, so every subscriber shares one cached result
 * that only changes when someone arrives or leaves.
 */
export const arena = query({
  args: { duelId: v.id("duels") },
  handler: async (ctx, { duelId }) => {
    const duel = await ctx.db.get(duelId);
    if (!duel) return null;

    const crowd = await arenaCrowd(ctx, duel);
    return {
      onlookers: crowd.onlookerIds.length,
      // Capped count; show "500+" if it ever gets there.
      atCapacity: crowd.atCapacity,
      playersHere: crowd.playersHere, // Clerk IDs, already public on the duel
    };
  },
});

/** Whether this player has the duel open and visible right now. */
export async function isPlayerInArena(
  ctx: QueryCtx,
  clerkId: string,
  duelId: Id<"duels">,
): Promise<boolean> {
  const rooms = await presence.listUser(ctx, userPresenceId(clerkId), true);
  return rooms.some((r) => r.roomId === duelId);
}
