import { internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { verifySuperAdmin } from "./auth.utils";
import {
  STRIKE_WINDOW_MS,
  cooldownUntil,
  countStrikes,
  severityRank,
} from "./lib/watcherRules";

const MAX_STORED_TEXT = 1000;

const surfaceValidator = v.union(
  v.literal("spell"),
  v.literal("wizard"),
  v.literal("profile"),
  v.literal("chat"),
);

/** Strikes in the current window and whether the user is silenced. */
export const getStrikeStatus = internalQuery({
  args: { userId: v.string(), now: v.number() },
  returns: v.object({
    strikeCount: v.number(),
    cooldownUntil: v.union(v.number(), v.null()),
  }),
  handler: async (ctx, { userId, now }) => {
    const strikes = await ctx.db
      .query("moderationEvents")
      .withIndex("by_user_id_and_created_at", (q) =>
        q.eq("userId", userId).gt("createdAt", now - STRIKE_WINDOW_MS),
      )
      .take(100);
    return {
      strikeCount: countStrikes(strikes, now),
      cooldownUntil: cooldownUntil(strikes, now),
    };
  },
});

/** Record a strike. */
export const record = internalMutation({
  args: {
    userId: v.string(),
    surface: surfaceValidator,
    category: v.string(),
    source: v.union(v.literal("wordlist"), v.literal("ai")),
    text: v.string(),
    reason: v.optional(v.string()),
    duelId: v.optional(v.id("duels")),
    createdAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("moderationEvents", {
      ...args,
      text: args.text.slice(0, MAX_STORED_TEXT),
    });
    return null;
  },
});

/** Recent rejections for the admin review page, newest first. */
export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 100 }) => {
    await verifySuperAdmin(ctx);
    const events = await ctx.db
      .query("moderationEvents")
      .withIndex("by_created_at")
      .order("desc")
      .take(Math.min(Math.max(limit, 1), 500));

    const users = new Map<
      string,
      { displayName?: string; handle?: string; email?: string }
    >();
    for (const userId of new Set(events.map((e) => e.userId))) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", userId))
        .first();
      users.set(userId, {
        displayName: user?.displayName ?? user?.name,
        handle: user?.userId,
        email: user?.email,
      });
    }

    return events.map((e) => ({
      ...e,
      severity: severityRank(e.category),
      user: users.get(e.userId) ?? {},
    }));
  },
});
