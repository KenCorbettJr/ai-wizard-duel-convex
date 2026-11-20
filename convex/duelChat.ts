/**
 * Duel chat between the two duelists. Messages are written through
 * `watcher.sendChatMessage`, which checks them first; everything else lives
 * here. Rules are in lib/duelChat.ts.
 */

import { ConvexError, v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type QueryCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  MAX_TEXTS_PER_DUEL,
  TEXT_GAP_MS,
  chatPhase,
  cleanChatText,
  textBlockedReason,
} from "./lib/duelChat";

/** How many messages the duel page loads. */
const LIST_LIMIT = 400;

/**
 * The signed-in user allowed to see duel chat and reactions, or null. These
 * are for registered users only. An age check (13+) will go here later.
 */
export async function chatViewer(ctx: QueryCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject ?? null;
}

/** Why the user can't send this text now, or null when they can. */
async function textProblem(
  ctx: QueryCtx,
  duel: Doc<"duels"> | null,
  userId: string,
  body: string,
  now: number,
): Promise<string | null> {
  if (!duel) return "Duel not found.";
  const blocked = textBlockedReason(duel, userId, now);
  if (blocked) return blocked;
  const cleaned = cleanChatText(body);
  if (!cleaned.ok) return cleaned.error;

  const mine = await ctx.db
    .query("duelMessages")
    .withIndex("by_duel_and_user_and_created_at", (q) =>
      q.eq("duelId", duel._id).eq("userId", userId),
    )
    .order("desc")
    .take(MAX_TEXTS_PER_DUEL);
  if (mine.length >= MAX_TEXTS_PER_DUEL) {
    return "You've said plenty in this duel. Let your magic do the talking.";
  }
  if (mine[0] && now - mine[0].createdAt < TEXT_GAP_MS) {
    return "Slow down a little before your next message.";
  }
  return null;
}

/** Checked before the Watcher runs, so blocked messages cost no AI call. */
export const checkCanSendText = internalQuery({
  args: {
    duelId: v.id("duels"),
    userId: v.string(),
    body: v.string(),
    now: v.number(),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { duelId, userId, body, now }) => {
    return await textProblem(ctx, await ctx.db.get(duelId), userId, body, now);
  },
});

/** Save a message the Watcher has approved. */
export const postText = internalMutation({
  args: { duelId: v.id("duels"), userId: v.string(), body: v.string() },
  returns: v.id("duelMessages"),
  handler: async (ctx, { duelId, userId, body }) => {
    const duel = await ctx.db.get(duelId);
    const now = Date.now();
    const problem = await textProblem(ctx, duel, userId, body, now);
    if (problem || !duel) throw new ConvexError(problem ?? "Duel not found.");

    let wizardId: Id<"wizards"> | undefined;
    for (const id of duel.wizards) {
      const wizard = await ctx.db.get(id);
      if (wizard?.owner === userId) {
        wizardId = id;
        break;
      }
    }

    const cleaned = cleanChatText(body);
    return await ctx.db.insert("duelMessages", {
      duelId,
      userId,
      body: cleaned.ok ? cleaned.text : body,
      wizardId,
      ...chatPhase(duel),
      createdAt: now,
    });
  },
});

/**
 * Turn chat off for this duel. Either duelist can, at any time, and it stays
 * off. Spell reactions are unaffected.
 */
export const turnOffChat = mutation({
  args: { duelId: v.id("duels") },
  returns: v.null(),
  handler: async (ctx, { duelId }) => {
    const userId = await chatViewer(ctx);
    if (!userId) throw new ConvexError("Not authenticated");
    const duel = await ctx.db.get(duelId);
    if (!duel) throw new ConvexError("Duel not found.");
    if (!duel.players.includes(userId)) {
      throw new ConvexError("Only the duelists can turn chat off.");
    }
    if (duel.chatEnabled !== false) {
      await ctx.db.patch(duelId, { chatEnabled: false });
    }
    return null;
  },
});

const messageValidator = v.object({
  _id: v.id("duelMessages"),
  body: v.string(),
  wizardId: v.optional(v.id("wizards")),
  afterRound: v.number(),
  postDuel: v.optional(v.boolean()),
  createdAt: v.number(),
  mine: v.boolean(),
});

/**
 * The duel's messages, oldest first. Null for signed-out viewers. Everything
 * is returned; the page holds back what the viewer hasn't reached in a replay.
 */
export const listMessages = query({
  args: { duelId: v.id("duels") },
  returns: v.union(v.null(), v.array(messageValidator)),
  handler: async (ctx, { duelId }) => {
    const userId = await chatViewer(ctx);
    if (!userId) return null;

    const rows = await ctx.db
      .query("duelMessages")
      .withIndex("by_duel_and_created_at", (q) => q.eq("duelId", duelId))
      .order("desc")
      .take(LIST_LIMIT);
    rows.reverse();
    // Sender ids stay on the server; viewers only learn which ones are theirs.
    return rows.map((m) => ({
      _id: m._id,
      body: m.body,
      wizardId: m.wizardId,
      afterRound: m.afterRound,
      postDuel: m.postDuel,
      createdAt: m.createdAt,
      mine: m.userId === userId,
    }));
  },
});
