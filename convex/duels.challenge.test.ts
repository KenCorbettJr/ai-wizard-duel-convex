import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { withAuth } from "./test_utils";

async function setup() {
  const t = convexTest(schema, import.meta.glob("./**/*.*s"));
  const ids = await t.run(async (ctx) => {
    for (const clerkId of ["alice", "bob", "carol"]) {
      await ctx.db.insert("users", {
        clerkId,
        role: "user",
        imageCredits: 10,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    const make = (owner: string, name: string) =>
      ctx.db.insert("wizards", { owner, name, description: name });
    return {
      aliceWiz: await make("alice", "Ember"),
      bobWiz: await make("bob", "Frost"),
      carolWiz: await make("carol", "Gale"),
      campaignWiz: await ctx.db.insert("wizards", {
        owner: "campaign",
        name: "Boss",
        description: "Boss",
        isCampaignOpponent: true,
      }),
    };
  });
  const alice = withAuth(t, "alice");
  const bob = withAuth(t, "bob");
  const carol = withAuth(t, "carol");
  const challenge = () =>
    alice.mutation(api.duels.challengeWizard, {
      wizardId: ids.aliceWiz,
      opponentWizardId: ids.bobWiz,
      numberOfRounds: 3,
    });
  return { t, ids, alice, bob, carol, challenge };
}

describe("wizard challenges", () => {
  test("challenging creates a private waiting duel and notifies the owner", async () => {
    const { t, ids, bob, challenge } = await setup();
    const duelId = await challenge();

    const duel = await t.run((ctx) => ctx.db.get(duelId));
    expect(duel).toMatchObject({
      status: "WAITING_FOR_PLAYERS",
      players: ["alice"],
      challengedUserId: "bob",
      challengedWizardId: ids.bobWiz,
    });

    const incoming = await bob.query(api.duels.getMyIncomingChallenges, {});
    expect(incoming).toHaveLength(1);
    expect(incoming[0]).toMatchObject({
      duelId,
      challenger: { name: "Ember" },
      myWizard: { name: "Frost" },
    });

    const notes = await t.run((ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("by_user", (q) => q.eq("userId", "bob"))
        .collect(),
    );
    expect(notes.map((n) => n.type)).toEqual(["DUEL_CHALLENGE"]);
  });

  test("accepting adds the challenged wizard and starts the duel", async () => {
    const { t, ids, bob, challenge } = await setup();
    const duelId = await challenge();
    await bob.mutation(api.duels.acceptChallenge, { duelId });

    const duel = await t.run((ctx) => ctx.db.get(duelId));
    expect(duel?.players).toEqual(["alice", "bob"]);
    expect(duel?.wizards).toEqual([ids.aliceWiz, ids.bobWiz]);
    expect(await bob.query(api.duels.getMyIncomingChallenges, {})).toEqual([]);
  });

  test("declining cancels the duel", async () => {
    const { t, bob, challenge } = await setup();
    const duelId = await challenge();
    await bob.mutation(api.duels.declineChallenge, { duelId });

    const duel = await t.run((ctx) => ctx.db.get(duelId));
    expect(duel?.status).toBe("CANCELLED");
  });

  test("nobody else can join or answer a challenge", async () => {
    const { ids, carol, challenge } = await setup();
    const duelId = await challenge();

    await expect(
      carol.mutation(api.duels.joinDuel, { duelId, wizards: [ids.carolWiz] }),
    ).rejects.toThrow(/private challenge/);
    await expect(
      carol.mutation(api.duels.acceptChallenge, { duelId }),
    ).rejects.toThrow();
    await expect(
      carol.mutation(api.duels.declineChallenge, { duelId }),
    ).rejects.toThrow();
  });

  test("challenges stay out of the open duel list", async () => {
    const { carol, challenge } = await setup();
    const duelId = await challenge();
    const open = await carol.query(api.duels.getActiveDuels, {});
    expect(open.map((d) => d._id)).not.toContain(duelId);
  });

  test("can't challenge your own wizard, a campaign wizard, or the same wizard twice", async () => {
    const { ids, alice, challenge } = await setup();
    const base = { wizardId: ids.aliceWiz, numberOfRounds: 3 as const };
    await expect(
      alice.mutation(api.duels.challengeWizard, {
        ...base,
        opponentWizardId: ids.aliceWiz,
      }),
    ).rejects.toThrow(/own wizard/);
    await expect(
      alice.mutation(api.duels.challengeWizard, {
        ...base,
        opponentWizardId: ids.campaignWiz,
      }),
    ).rejects.toThrow(/can't be challenged/);

    await challenge();
    await expect(challenge()).rejects.toThrow(/already challenged/);
  });
});

describe("joinDuel", () => {
  test("a third player can't join while the duel is being prepared", async () => {
    const { ids, alice, bob, carol } = await setup();
    const duelId = await alice.mutation(api.duels.createDuel, {
      numberOfRounds: 3,
      wizards: [ids.aliceWiz],
    });
    await bob.mutation(api.duels.joinDuel, { duelId, wizards: [ids.bobWiz] });
    await expect(
      carol.mutation(api.duels.joinDuel, { duelId, wizards: [ids.carolWiz] }),
    ).rejects.toThrow(/two players/);
  });
});

describe("getWatchableDuels", () => {
  test("hides duels still waiting for a second player", async () => {
    const { t, ids, alice } = await setup();
    const waiting = await alice.mutation(api.duels.createDuel, {
      numberOfRounds: 3,
      wizards: [ids.aliceWiz],
    });
    const result = await t.query(api.duels.getWatchableDuels, {
      limit: 10,
      offset: 0,
    });
    expect(result.duels.map((d) => d._id)).not.toContain(waiting);
  });
});
