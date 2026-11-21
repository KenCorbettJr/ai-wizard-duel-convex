import { query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import {
  REFERRAL_BONUS_TOKENS,
  REFERRAL_LIFETIME_CAP,
  REFERRAL_MONTHLY_CAP,
} from "./lib/pricing";

/**
 * Invite links: aiwizardduel.com/r/<handle>. A thank-you perk for players who
 * have bought tokens; it isn't shown to anyone else.
 *
 * A player who signs up through an eligible link is recorded as referred.
 * When they finish their first duel they get REFERRAL_BONUS_TOKENS, and so
 * does the referrer, up to REFERRAL_MONTHLY_CAP per month and
 * REFERRAL_LIFETIME_CAP in total. Past a cap, only the new player is paid.
 */

const normalizeHandle = (handle: string) => handle.trim().toLowerCase();

type Ctx = QueryCtx | MutationCtx;

/** Players who have completed at least one token purchase. */
async function hasPurchased(ctx: Ctx, clerkId: string) {
  const purchases = await ctx.db
    .query("tokenPurchases")
    .withIndex("by_user", (q) => q.eq("userId", clerkId))
    .collect();
  return purchases.some((p) => p.status === "COMPLETED");
}

const startOfMonthUtc = (now: number) => {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
};

/** How many referrer bonuses this player has been paid, this month and ever. */
async function referrerRewardCounts(ctx: Ctx, clerkId: string, now: number) {
  const invites = await ctx.db
    .query("referrals")
    .withIndex("by_referrer", (q) => q.eq("referrerId", clerkId))
    .collect();
  const paid = invites.filter((r) => r.referrerRewarded);
  const monthStart = startOfMonthUtc(now);
  return {
    invites,
    total: paid.length,
    thisMonth: paid.filter((r) => (r.rewardedAt ?? 0) >= monthStart).length,
  };
}

async function findByHandle(ctx: Ctx, handle: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_user_id", (q) => q.eq("userId", normalizeHandle(handle)))
    .first();
}

async function findByClerkId(ctx: Ctx, clerkId: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
    .first();
}

/**
 * Record that a brand-new account came from `handle`'s invite link. Called
 * only while the account is being created, so existing players can't claim
 * a referral later. Links from players who haven't bought tokens, unknown
 * handles and self-referrals are ignored.
 */
export async function recordReferral(
  ctx: MutationCtx,
  referredClerkId: string,
  handle: string,
) {
  const referrer = await findByHandle(ctx, handle);
  if (!referrer || referrer.clerkId === referredClerkId) return;
  if (!(await hasPurchased(ctx, referrer.clerkId))) return;

  const existing = await ctx.db
    .query("referrals")
    .withIndex("by_referred", (q) => q.eq("referredId", referredClerkId))
    .first();
  if (existing) return;

  await ctx.db.insert("referrals", {
    referrerId: referrer.clerkId,
    referredId: referredClerkId,
    createdAt: Date.now(),
  });
}

async function grantBonus(
  ctx: MutationCtx,
  user: Doc<"users">,
  metadata: Record<string, string>,
) {
  await ctx.db.patch(user._id, {
    imageCredits: user.imageCredits + REFERRAL_BONUS_TOKENS,
    updatedAt: Date.now(),
  });
  await ctx.db.insert("imageCreditTransactions", {
    userId: user.clerkId,
    type: "EARNED",
    amount: REFERRAL_BONUS_TOKENS,
    source: "REFERRAL_BONUS",
    metadata,
    createdAt: Date.now(),
  });
}

/**
 * A duel just finished: pay out any referral waiting on one of its players'
 * first duel. Safe to call for every finished duel; each referral pays once.
 */
export async function rewardReferralsForCompletedDuel(
  ctx: MutationCtx,
  playerClerkIds: string[],
) {
  for (const clerkId of new Set(playerClerkIds)) {
    const referral = await ctx.db
      .query("referrals")
      .withIndex("by_referred", (q) => q.eq("referredId", clerkId))
      .first();
    if (!referral || referral.rewardedAt) continue;

    const now = Date.now();
    const [referrer, referred] = await Promise.all([
      findByClerkId(ctx, referral.referrerId),
      findByClerkId(ctx, referral.referredId),
    ]);

    let referrerRewarded = false;
    if (referrer) {
      const counts = await referrerRewardCounts(ctx, referrer.clerkId, now);
      referrerRewarded =
        counts.thisMonth < REFERRAL_MONTHLY_CAP &&
        counts.total < REFERRAL_LIFETIME_CAP;
    }

    await ctx.db.patch(referral._id, { rewardedAt: now, referrerRewarded });

    if (referred) {
      await grantBonus(ctx, referred, {
        reason: "Finished your first duel after joining from an invite",
        referrerHandle: referrer?.userId ?? "",
      });
    }
    if (referrer && referrerRewarded) {
      await grantBonus(ctx, referrer, {
        reason: "A friend you invited finished their first duel",
        referredHandle: referred?.userId ?? "",
      });
    }
  }
}

/**
 * Public: who an invite link belongs to, for the landing page. Null unless
 * the link is live (its owner has bought tokens).
 */
export const getInviter = query({
  args: { handle: v.string() },
  returns: v.union(
    v.null(),
    v.object({ handle: v.string(), displayName: v.optional(v.string()) }),
  ),
  handler: async (ctx, { handle }) => {
    const user = await findByHandle(ctx, handle);
    if (!user?.userId) return null;
    if (!(await hasPurchased(ctx, user.clerkId))) return null;
    return { handle: user.userId, displayName: user.displayName };
  },
});

/** The signed-in player's invite perk, and the invite they joined through. */
export const getMyReferralInfo = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      /** Has bought tokens, so gets the invite perk. Nothing else is shown otherwise. */
      eligible: v.boolean(),
      handle: v.optional(v.string()),
      bonusTokens: v.number(),
      monthlyCap: v.number(),
      lifetimeCap: v.number(),
      joined: v.number(),
      rewardedThisMonth: v.number(),
      rewardedTotal: v.number(),
      tokensEarned: v.number(),
      invitedBy: v.union(
        v.null(),
        v.object({
          handle: v.optional(v.string()),
          displayName: v.optional(v.string()),
          rewarded: v.boolean(),
        }),
      ),
    }),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const me = await findByClerkId(ctx, identity.subject);
    if (!me) return null;

    const eligible = await hasPurchased(ctx, me.clerkId);
    const counts = await referrerRewardCounts(ctx, me.clerkId, Date.now());

    const mine = await ctx.db
      .query("referrals")
      .withIndex("by_referred", (q) => q.eq("referredId", me.clerkId))
      .first();
    let invitedBy = null;
    if (mine) {
      const inviter = await findByClerkId(ctx, mine.referrerId);
      invitedBy = {
        handle: inviter?.userId,
        displayName: inviter?.displayName,
        rewarded: !!mine.rewardedAt,
      };
    }

    return {
      eligible,
      handle: me.userId,
      bonusTokens: REFERRAL_BONUS_TOKENS,
      monthlyCap: REFERRAL_MONTHLY_CAP,
      lifetimeCap: REFERRAL_LIFETIME_CAP,
      joined: counts.invites.length,
      rewardedThisMonth: counts.thisMonth,
      rewardedTotal: counts.total,
      tokensEarned: counts.total * REFERRAL_BONUS_TOKENS,
      invitedBy,
    };
  },
});

/** Cheap check for the nav: does the signed-in player get the invite perk? */
export const hasInvitePerk = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;
    return await hasPurchased(ctx, identity.subject);
  },
});
