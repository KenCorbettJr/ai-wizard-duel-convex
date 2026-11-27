import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import type { TestConvex } from "convex-test";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { ensureTestUser, withAuth } from "./test_utils";
import { TOKEN_PACKS, bonusTokens, centsPerDuel } from "./lib/pricing";

describe("token purchases", () => {
  let t: TestConvex<typeof schema>;
  const pack = TOKEN_PACKS[1];

  beforeEach(async () => {
    t = convexTest(schema, import.meta.glob("./**/*.*s"));
    await ensureTestUser(t, "alice", 2);
    await t.mutation(internal.payments.recordPendingPurchase, {
      userId: "alice",
      packId: pack.id,
      tokens: pack.tokens,
      amountCents: pack.priceCents,
      currency: "usd",
      stripeSessionId: "cs_test_1",
    });
  });

  const tokens = async () =>
    await t
      .withIdentity({ subject: "alice" })
      .query(api.imageCreditService.getUserImageCredits, {});

  it("grants the pack's tokens once, even if Stripe retries", async () => {
    const complete = () =>
      t.mutation(internal.payments.completePurchase, {
        stripeSessionId: "cs_test_1",
        stripePaymentIntentId: "pi_1",
        amountPaidCents: pack.priceCents,
        currency: "usd",
      });

    expect(await complete()).toBe("granted");
    expect(await complete()).toBe("already_completed");
    expect(await tokens()).toBe(2 + pack.tokens);

    const ledger = await t.run(async (ctx) =>
      ctx.db
        .query("imageCreditTransactions")
        .withIndex("by_user", (q) => q.eq("userId", "alice"))
        .collect(),
    );
    expect(ledger.filter((row) => row.source === "PURCHASE")).toHaveLength(1);

    expect(
      await withAuth(t, "alice").query(api.payments.getMyPurchaseStatus, {
        stripeSessionId: "cs_test_1",
      }),
    ).toEqual({ status: "COMPLETED", tokens: pack.tokens, packId: pack.id });
  });

  it("does not grant tokens when the amount paid does not match", async () => {
    expect(
      await t.mutation(internal.payments.completePurchase, {
        stripeSessionId: "cs_test_1",
        amountPaidCents: 1,
        currency: "usd",
      }),
    ).toBe("amount_mismatch");
    expect(await tokens()).toBe(2);
  });

  it("ignores unknown checkout sessions", async () => {
    expect(
      await t.mutation(internal.payments.completePurchase, {
        stripeSessionId: "cs_unknown",
        amountPaidCents: pack.priceCents,
        currency: "usd",
      }),
    ).toBe("unknown_session");
    expect(await tokens()).toBe(2);
  });

  it("only shows a purchase to the player who made it", async () => {
    await ensureTestUser(t, "mallory", 0);
    expect(
      await withAuth(t, "mallory").query(api.payments.getMyPurchaseStatus, {
        stripeSessionId: "cs_test_1",
      }),
    ).toBeNull();
  });
});

describe("pricing config", () => {
  it("never sells a duel below the cost floor", () => {
    // Average AI cost is ~$0.20 a duel; keep every pack above ~25¢ a token
    for (const pack of TOKEN_PACKS) {
      expect(centsPerDuel(pack)).toBeGreaterThanOrEqual(25);
    }
  });

  it("gives bigger packs a better rate", () => {
    for (let i = 1; i < TOKEN_PACKS.length; i++) {
      expect(centsPerDuel(TOKEN_PACKS[i])).toBeLessThan(
        centsPerDuel(TOKEN_PACKS[i - 1]),
      );
      expect(bonusTokens(TOKEN_PACKS[i])).toBeGreaterThan(0);
    }
  });
});
