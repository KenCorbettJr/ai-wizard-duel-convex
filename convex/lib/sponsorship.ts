import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";

/**
 * Sponsored duels: while a sponsorship is running, duel entries and campaign
 * battles cost players no tokens. The sponsor's budget (`maxEntries`) and the
 * per-player daily fair-use limit decide how many entries it covers. Once
 * either runs out, players pay with tokens as usual.
 *
 * An entry is one player's seat in one duel: a PvP duel uses two, a
 * campaign battle one.
 */

/** "2026-11-26" in UTC, the day the per-player limit counts against. */
export function sponsorshipDay(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

/** Running now: started, not ended, not stopped early. Ignores the budget. */
export function isInWindow(s: Doc<"sponsorships">, now: number): boolean {
  return !s.endedEarlyAt && s.startsAt <= now && now < s.endsAt;
}

/** Entries left in the sponsor's budget (Infinity when uncapped). */
export function budgetLeft(s: Doc<"sponsorships">): number {
  return s.maxEntries === undefined
    ? Infinity
    : Math.max(0, s.maxEntries - s.entriesUsed);
}

/**
 * The sponsorship running right now with budget left, if any. Windows never
 * overlap, so there is at most one.
 */
export async function findRunningSponsorship(
  ctx: QueryCtx,
  now: number,
): Promise<Doc<"sponsorships"> | null> {
  const candidates = await ctx.db
    .query("sponsorships")
    .withIndex("by_ends_at", (q) => q.gt("endsAt", now))
    .take(20);
  return (
    candidates.find((s) => isInWindow(s, now) && budgetLeft(s) > 0) ?? null
  );
}

async function usageToday(
  ctx: QueryCtx,
  s: Doc<"sponsorships">,
  userId: string,
  now: number,
) {
  return await ctx.db
    .query("sponsorshipUsage")
    .withIndex("by_sponsorship_user_day", (q) =>
      q
        .eq("sponsorshipId", s._id)
        .eq("userId", userId)
        .eq("day", sponsorshipDay(now)),
    )
    .unique();
}

/** Entries this player can still have sponsored today (Infinity when uncapped). */
export async function playerEntriesLeft(
  ctx: QueryCtx,
  s: Doc<"sponsorships">,
  userId: string,
  now: number,
): Promise<number> {
  const budget = budgetLeft(s);
  if (s.dailyEntriesPerPlayer === undefined) return budget;
  const used = (await usageToday(ctx, s, userId, now))?.entries ?? 0;
  return Math.min(budget, Math.max(0, s.dailyEntriesPerPlayer - used));
}

/**
 * How many of `seats` entries a sponsor would cover for this player right now.
 */
export async function sponsoredSeatsFor(
  ctx: QueryCtx,
  userId: string,
  seats: number,
  now: number,
): Promise<number> {
  const s = await findRunningSponsorship(ctx, now);
  if (!s) return 0;
  return Math.min(seats, await playerEntriesLeft(ctx, s, userId, now));
}

/**
 * Use one sponsored entry for this player, if a sponsor covers it. Returns
 * the sponsorship that paid, or null when the player has to pay.
 */
export async function takeSponsoredEntry(
  ctx: MutationCtx,
  userId: string,
  now: number,
): Promise<Doc<"sponsorships"> | null> {
  const s = await findRunningSponsorship(ctx, now);
  if (!s || (await playerEntriesLeft(ctx, s, userId, now)) < 1) return null;

  await ctx.db.patch(s._id, { entriesUsed: s.entriesUsed + 1 });
  const usage = await usageToday(ctx, s, userId, now);
  if (usage) {
    await ctx.db.patch(usage._id, { entries: usage.entries + 1 });
  } else {
    await ctx.db.insert("sponsorshipUsage", {
      sponsorshipId: s._id,
      userId,
      day: sponsorshipDay(now),
      entries: 1,
    });
  }
  return s;
}
