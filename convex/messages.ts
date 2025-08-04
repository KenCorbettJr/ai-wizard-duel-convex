import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("messages").collect();
  },
});

export const send = mutation({
  args: { text: v.string(), author: v.string() },
  handler: async (ctx, { text, author }) => {
    await ctx.db.insert("messages", { text, author });
  },
});
