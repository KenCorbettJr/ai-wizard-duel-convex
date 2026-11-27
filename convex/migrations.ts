import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Remove the old subscription fields from every user, a page at a time.
 * Monthly subscriptions were replaced by tokens, and nothing reads these
 * fields any more. Run once per deployment from the Convex dashboard or with
 * `npx convex run migrations:clearLegacySubscriptionFields` (add `--prod`
 * for production). It schedules itself until every user is done. Afterwards
 * the fields can be deleted from the users table in schema.ts.
 */
export const clearLegacySubscriptionFields = internalMutation({
  args: { cursor: v.optional(v.union(v.string(), v.null())) },
  returns: v.null(),
  handler: async (ctx, { cursor }) => {
    const { page, isDone, continueCursor } = await ctx.db
      .query("users")
      .paginate({ cursor: cursor ?? null, numItems: 100 });

    for (const user of page) {
      if (
        user.subscriptionTier === undefined &&
        user.subscriptionStatus === undefined &&
        user.stripeCustomerId === undefined &&
        user.stripeSubscriptionId === undefined &&
        user.subscriptionEndsAt === undefined &&
        user.monthlyUsage === undefined
      ) {
        continue;
      }
      await ctx.db.patch(user._id, {
        subscriptionTier: undefined,
        subscriptionStatus: undefined,
        stripeCustomerId: undefined,
        stripeSubscriptionId: undefined,
        subscriptionEndsAt: undefined,
        monthlyUsage: undefined,
      });
    }

    if (!isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.clearLegacySubscriptionFields,
        { cursor: continueCursor },
      );
    }
    return null;
  },
});
