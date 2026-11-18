import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { verifySuperAdmin } from "./auth.utils";

export const record = internalMutation({
  args: {
    feature: v.string(),
    provider: v.string(),
    model: v.string(),
    kind: v.union(v.literal("text"), v.literal("image")),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    imageCount: v.optional(v.number()),
    costUsd: v.number(),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    success: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("aiUsage", { ...args, createdAt: Date.now() });
    return null;
  },
});

const MAX_ROWS = 8000;

const totalsValidator = v.object({
  key: v.string(),
  costUsd: v.number(),
  calls: v.number(),
});

/**
 * Super admin: AI spend between two timestamps, grouped by day, feature,
 * provider and user. Reads at most MAX_ROWS rows; `truncated` is true if
 * the range had more.
 */
export const getCostSummary = query({
  args: { sinceMs: v.number(), untilMs: v.optional(v.number()) },
  returns: v.object({
    totalCostUsd: v.number(),
    totalCalls: v.number(),
    truncated: v.boolean(),
    byDay: v.array(totalsValidator),
    byFeature: v.array(totalsValidator),
    byProvider: v.array(totalsValidator),
    byUser: v.array(totalsValidator),
  }),
  handler: async (ctx, { sinceMs, untilMs }) => {
    await verifySuperAdmin(ctx);

    const rows = await ctx.db
      .query("aiUsage")
      .withIndex("by_created_at", (q) =>
        untilMs === undefined
          ? q.gte("createdAt", sinceMs)
          : q.gte("createdAt", sinceMs).lt("createdAt", untilMs),
      )
      .take(MAX_ROWS + 1);
    const truncated = rows.length > MAX_ROWS;
    const used = truncated ? rows.slice(0, MAX_ROWS) : rows;

    const groups: Record<
      "day" | "feature" | "provider" | "user",
      Map<string, { costUsd: number; calls: number }>
    > = {
      day: new Map(),
      feature: new Map(),
      provider: new Map(),
      user: new Map(),
    };
    const add = (
      map: Map<string, { costUsd: number; calls: number }>,
      key: string,
      cost: number,
    ) => {
      const entry = map.get(key) ?? { costUsd: 0, calls: 0 };
      entry.costUsd += cost;
      entry.calls += 1;
      map.set(key, entry);
    };

    let totalCostUsd = 0;
    for (const row of used) {
      totalCostUsd += row.costUsd;
      add(
        groups.day,
        new Date(row.createdAt).toISOString().slice(0, 10),
        row.costUsd,
      );
      add(groups.feature, row.feature, row.costUsd);
      add(groups.provider, `${row.provider}/${row.model}`, row.costUsd);
      add(groups.user, row.userId ?? "unknown", row.costUsd);
    }

    const toArray = (
      map: Map<string, { costUsd: number; calls: number }>,
      sortByKey = false,
    ) =>
      [...map.entries()]
        .map(([key, value]) => ({ key, ...value }))
        .sort((a, b) =>
          sortByKey ? a.key.localeCompare(b.key) : b.costUsd - a.costUsd,
        );

    return {
      totalCostUsd,
      totalCalls: used.length,
      truncated,
      byDay: toArray(groups.day, true),
      byFeature: toArray(groups.feature),
      byProvider: toArray(groups.provider),
      byUser: toArray(groups.user).slice(0, 50),
    };
  },
});
