import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import {
  REFERRAL_BONUS_TOKENS,
  REFERRAL_LIFETIME_CAP,
  REFERRAL_MONTHLY_CAP,
  STARTING_TOKENS,
} from "./lib/pricing";
import { rewardReferralsForCompletedDuel } from "./referrals";

const modules = import.meta.glob("./**/*.*s");
type T = ReturnType<typeof convexTest>;

afterEach(() => {
  vi.useRealTimers();
});

async function createUser(
  t: T,
  clerkId: string,
  opts: { handle?: string; referralHandle?: string } = {},
) {
  const as = t.withIdentity({ subject: clerkId });
  const id = await as.mutation(api.users.getOrCreateUser, {
    clerkId,
    referralHandle: opts.referralHandle,
  });
  if (opts.handle) {
    await t.run((ctx) => ctx.db.patch(id, { userId: opts.handle }));
  }
  return as;
}

const purchase = (t: T, clerkId: string, status: "PENDING" | "COMPLETED") =>
  t.run((ctx) =>
    ctx.db.insert("tokenPurchases", {
      userId: clerkId,
      packId: "pouch",
      tokens: 15,
      amountCents: 500,
      currency: "usd",
      stripeSessionId: `cs_${clerkId}_${status}`,
      status,
      createdAt: Date.now(),
    }),
  );

/** A player who has bought tokens, so their invite link is live. */
async function createSupporter(t: T, clerkId: string) {
  const as = await createUser(t, clerkId, { handle: clerkId });
  await purchase(t, clerkId, "COMPLETED");
  return as;
}

const credits = (t: T, clerkId: string) =>
  t.query(api.imageCreditService.getUserImageCredits, { userId: clerkId });

const finishDuel = (t: T, players: string[]) =>
  t.run((ctx) => rewardReferralsForCompletedDuel(ctx, players));

test("both players get the bonus once the new player finishes a duel", async () => {
  const t = convexTest(schema, modules);
  const ken = await createSupporter(t, "ken");
  const friend = await createUser(t, "friend", { referralHandle: "Ken" });

  // Nothing yet: the bonus waits for the first finished duel.
  expect(await credits(t, "friend")).toBe(STARTING_TOKENS);
  expect(await credits(t, "ken")).toBe(STARTING_TOKENS);
  expect(await ken.query(api.referrals.getMyReferralInfo, {})).toMatchObject({
    eligible: true,
    joined: 1,
    rewardedTotal: 0,
  });
  const mine = await friend.query(api.referrals.getMyReferralInfo, {});
  expect(mine).toMatchObject({
    eligible: false,
    invitedBy: { handle: "ken", rewarded: false },
  });

  await finishDuel(t, ["friend", "someone_else"]);
  const withBonus = STARTING_TOKENS + REFERRAL_BONUS_TOKENS;
  expect(await credits(t, "friend")).toBe(withBonus);
  expect(await credits(t, "ken")).toBe(withBonus);

  // A second duel pays nothing more.
  await finishDuel(t, ["friend"]);
  expect(await credits(t, "friend")).toBe(withBonus);
  expect(await ken.query(api.referrals.getMyReferralInfo, {})).toMatchObject({
    rewardedThisMonth: 1,
    rewardedTotal: 1,
    tokensEarned: REFERRAL_BONUS_TOKENS,
  });
});

test("links only work for players who have completed a purchase", async () => {
  const t = convexTest(schema, modules);
  await createUser(t, "freebie", { handle: "freebie" });
  await purchase(t, "freebie", "PENDING");
  expect(
    await t.query(api.referrals.getInviter, { handle: "freebie" }),
  ).toBeNull();

  await createUser(t, "friend", { referralHandle: "freebie" });
  await finishDuel(t, ["friend"]);
  expect(await credits(t, "friend")).toBe(STARTING_TOKENS);
  expect(await credits(t, "freebie")).toBe(STARTING_TOKENS);

  // Buying later doesn't pay out for friends who joined before.
  await purchase(t, "freebie", "COMPLETED");
  await finishDuel(t, ["friend"]);
  expect(await credits(t, "freebie")).toBe(STARTING_TOKENS);
  expect(
    await t.query(api.referrals.getInviter, { handle: "FREEBIE" }),
  ).toEqual({ handle: "freebie", displayName: undefined });
});

test("existing accounts and unknown handles can't claim a referral", async () => {
  const t = convexTest(schema, modules);
  await createSupporter(t, "ken");
  await createUser(t, "veteran");
  // Already has an account: the handle is ignored.
  await createUser(t, "veteran", { referralHandle: "ken" });
  await createUser(t, "stranger", { referralHandle: "nobody" });

  await finishDuel(t, ["veteran", "stranger"]);
  expect(await credits(t, "ken")).toBe(STARTING_TOKENS);
  expect(await credits(t, "veteran")).toBe(STARTING_TOKENS);
  expect(await credits(t, "stranger")).toBe(STARTING_TOKENS);
});

test("the referrer bonus stops at the monthly cap, then resumes next month", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-10T12:00:00Z"));
  const t = convexTest(schema, modules);
  await createSupporter(t, "ken");

  for (let i = 0; i <= REFERRAL_MONTHLY_CAP; i++) {
    await createUser(t, `f${i}`, { referralHandle: "ken" });
    await finishDuel(t, [`f${i}`]);
  }
  // Every friend got theirs; Ken stopped at the cap.
  expect(await credits(t, `f${REFERRAL_MONTHLY_CAP}`)).toBe(
    STARTING_TOKENS + REFERRAL_BONUS_TOKENS,
  );
  expect(await credits(t, "ken")).toBe(
    STARTING_TOKENS + REFERRAL_MONTHLY_CAP * REFERRAL_BONUS_TOKENS,
  );

  vi.setSystemTime(new Date("2026-12-01T00:00:01Z"));
  await createUser(t, "december", { referralHandle: "ken" });
  await finishDuel(t, ["december"]);
  expect(await credits(t, "ken")).toBe(
    STARTING_TOKENS + (REFERRAL_MONTHLY_CAP + 1) * REFERRAL_BONUS_TOKENS,
  );
});

test("the referrer bonus stops for good at the lifetime cap", async () => {
  const t = convexTest(schema, modules);
  await createSupporter(t, "ken");
  // Paid out in earlier months: at the lifetime cap already.
  await t.run(async (ctx) => {
    for (let i = 0; i < REFERRAL_LIFETIME_CAP; i++) {
      await ctx.db.insert("referrals", {
        referrerId: "ken",
        referredId: `old${i}`,
        createdAt: 0,
        rewardedAt: 1,
        referrerRewarded: true,
      });
    }
  });

  await createUser(t, "friend", { referralHandle: "ken" });
  await finishDuel(t, ["friend"]);
  expect(await credits(t, "friend")).toBe(
    STARTING_TOKENS + REFERRAL_BONUS_TOKENS,
  );
  expect(await credits(t, "ken")).toBe(STARTING_TOKENS);
});

test("callers can only create their own account", async () => {
  const t = convexTest(schema, modules);
  await expect(
    t
      .withIdentity({ subject: "mallory" })
      .mutation(api.users.getOrCreateUser, { clerkId: "victim" }),
  ).rejects.toThrow("Not authorized");
});
