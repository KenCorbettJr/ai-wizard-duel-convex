import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import type { Id } from "./_generated/dataModel";
import { DEPARTED_OWNER } from "./lib/departed";

type Status = "WAITING_FOR_PLAYERS" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

const ME = "user_me";
const RIVAL = "user_rival";

async function seed() {
  const t = convexTest(schema, import.meta.glob("./**/*.*s"));

  const user = (clerkId: string, userId: string) =>
    t.run((ctx) =>
      ctx.db.insert("users", {
        clerkId,
        role: "user",
        userId,
        displayName: userId,
        email: `${userId}@example.com`,
        imageCredits: 5,
        createdAt: 0,
        updatedAt: 0,
      }),
    );
  await user(ME, "merlin");
  const rivalUserId = await user(RIVAL, "morgana");

  const wizard = (owner: string, name: string) =>
    t.run((ctx) =>
      ctx.db.insert("wizards", { owner, name, description: name }),
    );
  const shared = await wizard(ME, "Shared"); // fought another player
  const solo = await wizard(ME, "Solo"); // campaign battles only
  const unused = await wizard(ME, "Unused"); // never fought
  const rival = await wizard(RIVAL, "Rival");
  const campaignFoe = await wizard("campaign", "Ember");

  const duel = (
    status: Status,
    wizards: Id<"wizards">[],
    players: string[],
    extra: Record<string, unknown> = {},
  ) =>
    t.run((ctx) =>
      ctx.db.insert("duels", {
        numberOfRounds: 3,
        wizards,
        players,
        status,
        currentRound: 1,
        createdAt: 0,
        points: {},
        hitPoints: {},
        needActionsFrom: status === "IN_PROGRESS" ? wizards : [],
        ...extra,
      }),
    );

  const finished = await duel("COMPLETED", [shared, rival], [ME, RIVAL], {
    winners: [shared],
    losers: [rival],
  });
  const live = await duel("IN_PROGRESS", [shared, rival], [ME, RIVAL]);
  const lonely = await duel("WAITING_FOR_PLAYERS", [shared], [ME]);
  const campaign = await duel(
    "COMPLETED",
    [solo, campaignFoe],
    [ME, "campaign"],
    { isCampaignBattle: true },
  );
  const othersDuel = await duel("COMPLETED", [rival, rival], [RIVAL, "x"]);

  await t.run(async (ctx) => {
    await ctx.db.insert("duelRounds", {
      duelId: finished,
      roundNumber: 1,
      type: "SPELL_CASTING",
      status: "COMPLETED",
      spells: {
        [shared]: { description: "Fireball", castBy: shared, timestamp: 1 },
      },
    });
    await ctx.db.insert("duelRounds", {
      duelId: live,
      roundNumber: 1,
      type: "SPELL_CASTING",
      status: "WAITING_FOR_SPELLS",
    });
    await ctx.db.insert("duelRounds", {
      duelId: campaign,
      roundNumber: 1,
      type: "SPELL_CASTING",
      status: "COMPLETED",
    });
    for (const [userId, body] of [
      [ME, "good luck"],
      [RIVAL, "you too"],
    ]) {
      await ctx.db.insert("duelMessages", {
        duelId: finished,
        userId,
        body,
        afterRound: 0,
        createdAt: 1,
      });
    }
    const round = (await ctx.db.query("duelRounds").first())!;
    await ctx.db.insert("spellReactions", {
      duelId: othersDuel,
      roundId: round._id,
      wizardId: rival,
      userId: ME,
      emoji: "fire",
      createdAt: 1,
    });
    await ctx.db.insert("wizardStats", {
      wizardId: shared,
      wins: 1,
      losses: 0,
      totalDuels: 1,
      winRate: 1,
    });
    const seasonId = await ctx.db.insert("campaignSeasons", {
      name: "Season",
      description: "Season",
      status: "ACTIVE",
      completionRelic: { name: "Relic", description: "Relic", luckBonus: 1 },
      opponents: [campaignFoe],
      createdAt: 0,
      createdBy: "admin",
    });
    await ctx.db.insert("wizardCampaignProgress", {
      wizardId: solo,
      userId: ME,
      seasonId,
      currentOpponent: 2,
      defeatedOpponents: [1],
      hasCompletionRelic: false,
      createdAt: 0,
    });
    await ctx.db.insert("notifications", {
      userId: ME,
      type: "DUEL_RESULT",
      title: "Victory!",
      body: "won",
      url: "/duels/x",
      createdAt: 0,
    });
    await ctx.db.insert("moderationEvents", {
      userId: ME,
      surface: "chat",
      category: "profanity",
      source: "wordlist",
      text: "bad",
      createdAt: 0,
    });
    await ctx.db.insert("duelViews", {
      duelId: othersDuel,
      viewerId: `user:${ME}`,
      visits: 1,
      firstViewedAt: 0,
      lastViewedAt: 0,
    });
    await ctx.db.insert("tokenPurchases", {
      userId: ME,
      packId: "small",
      tokens: 10,
      amountCents: 499,
      currency: "usd",
      stripeSessionId: "cs_1",
      status: "COMPLETED",
      createdAt: 0,
    });
    await ctx.db.insert("referrals", {
      referrerId: RIVAL,
      referredId: ME,
      createdAt: 0,
    });
  });

  return {
    t,
    rivalUserId,
    wizards: { shared, solo, unused, rival },
    duels: { finished, live, lonely, campaign, othersDuel },
  };
}

describe("deleteMyAccount", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    process.env.CLERK_SECRET_KEY = "sk_test";
    fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    delete process.env.CLERK_SECRET_KEY;
  });

  async function deleteMe(t: Awaited<ReturnType<typeof seed>>["t"]) {
    await t
      .withIdentity({ subject: ME })
      .action(api.accountDeletion.deleteMyAccount, { confirmation: "Merlin" });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
  }

  test("requires the username to confirm, and deletes nothing otherwise", async () => {
    const { t } = await seed();
    await expect(
      t
        .withIdentity({ subject: ME })
        .action(api.accountDeletion.deleteMyAccount, { confirmation: "nope" }),
    ).rejects.toThrow(/merlin/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("stops before touching data if Clerk refuses", async () => {
    const { t } = await seed();
    fetchMock.mockResolvedValueOnce(new Response("err", { status: 500 }));
    await expect(
      t
        .withIdentity({ subject: ME })
        .action(api.accountDeletion.deleteMyAccount, {
          confirmation: "merlin",
        }),
    ).rejects.toThrow(/Nothing was deleted/);
    const users = await t.run((ctx) => ctx.db.query("users").collect());
    expect(users).toHaveLength(2);
  });

  test("deletes the Clerk user and the player's private data", async () => {
    const { t } = await seed();
    await deleteMe(t);

    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.clerk.com/v1/users/${ME}`,
      expect.objectContaining({ method: "DELETE" }),
    );

    await t.run(async (ctx) => {
      const users = await ctx.db.query("users").collect();
      expect(users.map((u) => u.clerkId)).toEqual([RIVAL]);
      for (const table of [
        "notifications",
        "moderationEvents",
        "spellReactions",
        "duelViews",
        "referrals",
        "wizardCampaignProgress",
      ] as const) {
        expect(await ctx.db.query(table).collect()).toEqual([]);
      }
      // Kept for tax records, without the player.
      const [purchase] = await ctx.db.query("tokenPurchases").collect();
      expect(purchase.userId).toBe(DEPARTED_OWNER);
    });
  });

  test("deletes campaign battles, unjoined duels and unshared wizards", async () => {
    const { t, wizards, duels } = await seed();
    await deleteMe(t);

    await t.run(async (ctx) => {
      expect(await ctx.db.get(duels.campaign)).toBeNull();
      expect(await ctx.db.get(duels.lonely)).toBeNull();
      expect(await ctx.db.get(wizards.solo)).toBeNull();
      expect(await ctx.db.get(wizards.unused)).toBeNull();
      const rounds = await ctx.db
        .query("duelRounds")
        .withIndex("by_duel", (q) => q.eq("duelId", duels.campaign))
        .collect();
      expect(rounds).toEqual([]);
    });
  });

  test("keeps finished duels with other players, detached from the player", async () => {
    const { t, wizards, duels } = await seed();
    await deleteMe(t);

    await t.run(async (ctx) => {
      const duel = (await ctx.db.get(duels.finished))!;
      expect(duel.players).toEqual([DEPARTED_OWNER, RIVAL]);
      expect(duel.winners).toEqual([wizards.shared]);

      const wizard = (await ctx.db.get(wizards.shared))!;
      expect(wizard.owner).toBe(DEPARTED_OWNER);
      expect(wizard.name).toBe("Shared");

      // Spells stay; the player's chat goes, the rival's stays.
      const [round] = await ctx.db
        .query("duelRounds")
        .withIndex("by_duel", (q) => q.eq("duelId", duels.finished))
        .collect();
      expect(round.spells?.[wizards.shared]?.description).toBe("Fireball");
      const messages = await ctx.db.query("duelMessages").collect();
      expect(messages.map((m) => m.body)).toEqual(["you too"]);

      // Off the leaderboard.
      expect(await ctx.db.query("wizardStats").collect()).toEqual(
        expect.not.arrayContaining([
          expect.objectContaining({ wizardId: wizards.shared }),
        ]),
      );
    });

    const board = await t.query(api.wizards.getWizardLeaderboard, {});
    expect(board.map((w) => w._id)).not.toContain(wizards.shared);
  });

  test("forfeits duels in progress, so the other player wins", async () => {
    const { t, wizards, duels } = await seed();
    await deleteMe(t);

    await t.run(async (ctx) => {
      const duel = (await ctx.db.get(duels.live))!;
      expect(duel.status).toBe("COMPLETED");
      expect(duel.winners).toEqual([wizards.rival]);
      expect(duel.losers).toEqual([wizards.shared]);
      expect(duel.forfeitedBy).toBe(wizards.shared);
      expect(duel.players).toEqual([DEPARTED_OWNER, RIVAL]);
    });

    const board = await t.query(api.wizards.getWizardLeaderboard, {});
    expect(board.map((w) => w._id)).toContain(wizards.rival);
  });

  test("leaves other players' data alone", async () => {
    const { t, rivalUserId, wizards, duels } = await seed();
    await deleteMe(t);

    await t.run(async (ctx) => {
      expect(await ctx.db.get(rivalUserId)).not.toBeNull();
      expect((await ctx.db.get(wizards.rival))!.owner).toBe(RIVAL);
      expect(await ctx.db.get(duels.othersDuel)).not.toBeNull();
    });
  });
});
