import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import type { TestConvex } from "convex-test";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import { TO_THE_DEATH_MAX_ROUNDS } from "./lib/pricing";
import { ensureTestUser, withAuth, withSuperAdminAuth } from "./test_utils";

describe("Duel tokens", () => {
  let t: TestConvex<typeof schema>;

  beforeEach(() => {
    t = convexTest(schema, import.meta.glob("./**/*.*s"));
  });

  const tokens = async (userId: string) =>
    await t.query(api.imageCreditService.getUserImageCredits, { userId });

  const makeWizard = async (owner: string): Promise<Id<"wizards">> =>
    await t.run(
      async (ctx) =>
        await ctx.db.insert("wizards", {
          owner,
          name: `Wizard of ${owner}`,
          description: "A test wizard",
          wins: 0,
          losses: 0,
          isAIPowered: false,
        }),
    );

  const ledger = async (userId: string) =>
    await t.run(async (ctx) =>
      ctx.db
        .query("imageCreditTransactions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
    );

  it("does not take a token while a duel is waiting for an opponent", async () => {
    const wizard = await makeWizard("alice");
    await ensureTestUser(t, "alice", 3);

    const duelId = await withAuth(t, "alice").mutation(api.duels.createDuel, {
      numberOfRounds: 3,
      wizards: [wizard],
    });

    expect(await tokens("alice")).toBe(3);
    expect(await ledger("alice")).toHaveLength(0);

    // Cancelling a waiting duel has nothing to refund
    await withAuth(t, "alice").mutation(api.duels.cancelDuel, { duelId });
    expect(await tokens("alice")).toBe(3);
    expect(await ledger("alice")).toHaveLength(0);
  });

  it("does not create a duel when the creator has no tokens", async () => {
    const wizard = await makeWizard("alice");
    await ensureTestUser(t, "alice", 0);

    await expect(
      withAuth(t, "alice").mutation(api.duels.createDuel, {
        numberOfRounds: 3,
        wizards: [wizard],
      }),
    ).rejects.toThrow(/at least 1 token/);

    const duels = await t.run(async (ctx) => ctx.db.query("duels").collect());
    expect(duels).toHaveLength(0);
  });

  it("takes a token from each player in a PvP duel", async () => {
    const aliceWizard = await makeWizard("alice");
    const bobWizard = await makeWizard("bob");
    await ensureTestUser(t, "alice", 5);
    await ensureTestUser(t, "bob", 5);

    const duelId = await withAuth(t, "alice").mutation(api.duels.createDuel, {
      numberOfRounds: 3,
      wizards: [aliceWizard],
    });
    await withAuth(t, "bob").mutation(api.duels.joinDuel, {
      duelId,
      wizards: [bobWizard],
    });

    expect(await tokens("alice")).toBe(4);
    expect(await tokens("bob")).toBe(4);
    const duel = await t.run(async (ctx) => ctx.db.get(duelId));
    expect(duel?.tokensCharged?.sort()).toEqual(["alice", "bob"]);
  });

  it("does not let a player without tokens join, and leaves the duel waiting", async () => {
    const aliceWizard = await makeWizard("alice");
    const bobWizard = await makeWizard("bob");
    await ensureTestUser(t, "alice", 5);
    await ensureTestUser(t, "bob", 0);

    const duelId = await withAuth(t, "alice").mutation(api.duels.createDuel, {
      numberOfRounds: 3,
      wizards: [aliceWizard],
    });
    await expect(
      withAuth(t, "bob").mutation(api.duels.joinDuel, {
        duelId,
        wizards: [bobWizard],
      }),
    ).rejects.toThrow(/at least 1 token/);

    const duel = await t.run(async (ctx) => ctx.db.get(duelId));
    expect(duel?.players).toEqual(["alice"]);
    expect(duel?.status).toBe("WAITING_FOR_PLAYERS");
    expect(await tokens("alice")).toBe(5);
    expect(await tokens("bob")).toBe(0);
  });

  it("does not start the duel if the creator spent their tokens while waiting", async () => {
    const aliceWizard = await makeWizard("alice");
    const bobWizard = await makeWizard("bob");
    await ensureTestUser(t, "alice", 1);
    await ensureTestUser(t, "bob", 5);

    const duelId = await withAuth(t, "alice").mutation(api.duels.createDuel, {
      numberOfRounds: 3,
      wizards: [aliceWizard],
    });
    // Alice spends her last token elsewhere
    await t.run(async (ctx) => {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", "alice"))
        .first();
      await ctx.db.patch(user!._id, { imageCredits: 0 });
    });

    await expect(
      withAuth(t, "bob").mutation(api.duels.joinDuel, {
        duelId,
        wizards: [bobWizard],
      }),
    ).rejects.toThrow(/creator no longer has a token/);

    expect(await tokens("bob")).toBe(5);
    const duel = await t.run(async (ctx) => ctx.db.get(duelId));
    expect(duel?.players).toEqual(["alice"]);
  });

  it("gives a leftover Premium record no free duels", async () => {
    const wizard = await makeWizard("alice");
    await ensureTestUser(t, "alice", 0);
    await t.run(async (ctx) => {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", "alice"))
        .first();
      await ctx.db.patch(user!._id, {
        subscriptionTier: "PREMIUM",
        subscriptionStatus: "ACTIVE",
      });
    });

    await expect(
      withAuth(t, "alice").mutation(api.duels.createDuel, {
        numberOfRounds: 3,
        wizards: [wizard],
      }),
    ).rejects.toThrow(/at least 1 token/);
  });

  it("won't let a player cancel a duel in progress, so no tokens move", async () => {
    const aliceWizard = await makeWizard("alice");
    const bobWizard = await makeWizard("bob");
    await ensureTestUser(t, "alice", 5);
    await ensureTestUser(t, "bob", 5);

    const duelId = await withAuth(t, "alice").mutation(api.duels.createDuel, {
      numberOfRounds: 3,
      wizards: [aliceWizard],
    });
    await withAuth(t, "bob").mutation(api.duels.joinDuel, {
      duelId,
      wizards: [bobWizard],
    });
    await t.run(async (ctx) => ctx.db.patch(duelId, { status: "IN_PROGRESS" }));

    await expect(
      withAuth(t, "alice").mutation(api.duels.cancelDuel, { duelId }),
    ).rejects.toThrow(/Forfeit it instead/);

    expect(await tokens("alice")).toBe(4);
    expect(await tokens("bob")).toBe(4);
  });

  it("refunds every player when an admin force-cancels a duel", async () => {
    const aliceWizard = await makeWizard("alice");
    const bobWizard = await makeWizard("bob");
    await ensureTestUser(t, "alice", 5);
    await ensureTestUser(t, "bob", 5);

    const duelId = await withAuth(t, "alice").mutation(api.duels.createDuel, {
      numberOfRounds: 3,
      wizards: [aliceWizard],
    });
    await withAuth(t, "bob").mutation(api.duels.joinDuel, {
      duelId,
      wizards: [bobWizard],
    });

    await ensureTestUser(t, "super-admin-user");
    await t.run(async (ctx) => {
      const admin = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", "super-admin-user"))
        .first();
      await ctx.db.patch(admin!._id, { role: "super_admin" });
    });
    await withSuperAdminAuth(t).mutation(api.duels.forceCancelDuel, {
      duelId,
      reason: "stuck",
    });

    expect(await tokens("alice")).toBe(5);
    expect(await tokens("bob")).toBe(5);
  });

  describe("covered entry (creator pays for their opponent)", () => {
    it("charges the creator 2 tokens and the joiner nothing", async () => {
      const aliceWizard = await makeWizard("alice");
      const bobWizard = await makeWizard("bob");
      await ensureTestUser(t, "alice", 5);
      await ensureTestUser(t, "bob", 0);

      const duelId = await withAuth(t, "alice").mutation(api.duels.createDuel, {
        numberOfRounds: 3,
        wizards: [aliceWizard],
        coverOpponentEntry: true,
      });
      // Nothing is taken until the duel starts
      expect(await tokens("alice")).toBe(5);

      // Bob has no tokens but can still join
      await withAuth(t, "bob").mutation(api.duels.joinDuel, {
        duelId,
        wizards: [bobWizard],
      });

      expect(await tokens("alice")).toBe(3);
      expect(await tokens("bob")).toBe(0);
      const duel = await t.run(async (ctx) => ctx.db.get(duelId));
      expect(duel?.tokensCharged).toEqual(["alice", "alice"]);
      const covered = (await ledger("alice")).filter(
        (row) => row.metadata?.coveredFor === "bob",
      );
      expect(covered).toHaveLength(1);
      expect(await ledger("bob")).toHaveLength(0);
    });

    it("refuses to create a covered duel without 2 tokens", async () => {
      const wizard = await makeWizard("alice");
      await ensureTestUser(t, "alice", 1);

      await expect(
        withAuth(t, "alice").mutation(api.duels.createDuel, {
          numberOfRounds: 3,
          wizards: [wizard],
          coverOpponentEntry: true,
        }),
      ).rejects.toThrow(/2 tokens/);
    });

    it("does not start if the creator can no longer cover the entry", async () => {
      const aliceWizard = await makeWizard("alice");
      const bobWizard = await makeWizard("bob");
      await ensureTestUser(t, "alice", 2);
      await ensureTestUser(t, "bob", 5);

      const duelId = await withAuth(t, "alice").mutation(api.duels.createDuel, {
        numberOfRounds: 3,
        wizards: [aliceWizard],
        coverOpponentEntry: true,
      });
      await t.run(async (ctx) => {
        const alice = await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", "alice"))
          .first();
        await ctx.db.patch(alice!._id, { imageCredits: 1 });
      });

      await expect(
        withAuth(t, "bob").mutation(api.duels.joinDuel, {
          duelId,
          wizards: [bobWizard],
        }),
      ).rejects.toThrow(/cover your entry/);
      expect(await tokens("alice")).toBe(1);
      expect(await tokens("bob")).toBe(5);
    });

    it("refunds both covered tokens to the creator on admin cancel", async () => {
      const aliceWizard = await makeWizard("alice");
      const bobWizard = await makeWizard("bob");
      await ensureTestUser(t, "alice", 5);
      await ensureTestUser(t, "bob", 0);

      const duelId = await withAuth(t, "alice").mutation(api.duels.createDuel, {
        numberOfRounds: 3,
        wizards: [aliceWizard],
        coverOpponentEntry: true,
      });
      await withAuth(t, "bob").mutation(api.duels.joinDuel, {
        duelId,
        wizards: [bobWizard],
      });

      await ensureTestUser(t, "super-admin-user");
      await t.run(async (ctx) => {
        const admin = await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", "super-admin-user"))
          .first();
        await ctx.db.patch(admin!._id, { role: "super_admin" });
      });
      await withSuperAdminAuth(t).mutation(api.duels.forceCancelDuel, {
        duelId,
        reason: "stuck",
      });

      expect(await tokens("alice")).toBe(5);
      expect(await tokens("bob")).toBe(0);
    });
  });

  it("ends a To the Death duel at the round cap, still for 1 token each", async () => {
    const aliceWizard = await makeWizard("alice");
    const bobWizard = await makeWizard("bob");
    await ensureTestUser(t, "alice", 5);
    await ensureTestUser(t, "bob", 5);

    const duelId = await withAuth(t, "alice").mutation(api.duels.createDuel, {
      numberOfRounds: "TO_THE_DEATH",
      wizards: [aliceWizard],
    });
    await withAuth(t, "bob").mutation(api.duels.joinDuel, {
      duelId,
      wizards: [bobWizard],
    });

    // Jump to the last allowed round, with both wizards healthy
    const roundId = await t.run(async (ctx) => {
      await ctx.db.patch(duelId, {
        status: "IN_PROGRESS",
        currentRound: TO_THE_DEATH_MAX_ROUNDS,
      });
      return await ctx.db.insert("duelRounds", {
        duelId,
        roundNumber: TO_THE_DEATH_MAX_ROUNDS,
        type: "SPELL_CASTING",
        status: "WAITING_FOR_SPELLS",
      });
    });
    await t.mutation(internal.duels.completeRound, {
      roundId,
      outcome: {
        narrative: "Both wizards still stand.",
        pointsAwarded: { [aliceWizard]: 6, [bobWizard]: 2 },
        healthChange: { [aliceWizard]: -5, [bobWizard]: -5 },
      },
    });

    const duel = await t.run(async (ctx) => ctx.db.get(duelId));
    expect(duel?.status).toBe("COMPLETED");
    expect(duel?.winners).toEqual([aliceWizard]);
    expect(await tokens("alice")).toBe(4);
    expect(await tokens("bob")).toBe(4);
  });

  describe("campaign battles", () => {
    beforeEach(async () => {
      await t.mutation(internal.campaigns.seedCampaignOpponents, {});
      await t.mutation(
        internal.campaignSeasons.createDefaultSeasonInternal,
        {},
      );
    });

    const startBattle = async (userId: string) => {
      const wizardId = await withAuth(t, userId).mutation(
        internal.wizards.createWizard,
        { name: "Campaign Wizard", description: "Fights the campaign" },
      );
      await withAuth(t, userId).mutation(
        api.campaigns.initializeWizardCampaignProgress,
        { wizardId, userId },
      );
      return await withAuth(t, userId).mutation(
        api.campaigns.startCampaignBattle,
        { wizardId, opponentNumber: 1 },
      );
    };

    it("takes 1 token for a campaign battle", async () => {
      await ensureTestUser(t, "alice", 4);
      const { duelId } = await startBattle("alice");

      expect(await tokens("alice")).toBe(3);
      const duel = await t.run(async (ctx) => ctx.db.get(duelId));
      expect(duel?.tokensCharged).toEqual(["alice"]);
    });

    it("does not start a campaign battle without tokens", async () => {
      await ensureTestUser(t, "alice", 0);

      await expect(startBattle("alice")).rejects.toThrow(/at least 1 token/);

      const battles = await t.run(async (ctx) =>
        ctx.db.query("campaignBattles").collect(),
      );
      expect(battles).toHaveLength(0);
      const duels = await t.run(async (ctx) => ctx.db.query("duels").collect());
      expect(duels).toHaveLength(0);
    });
  });
});

describe("Wizard illustration tokens", () => {
  let t: TestConvex<typeof schema>;

  beforeEach(() => {
    t = convexTest(schema, import.meta.glob("./**/*.*s"));
  });

  const tokens = async (userId: string) =>
    await t.query(api.imageCreditService.getUserImageCredits, { userId });

  const makeWizard = async (owner: string, withIllustration: boolean) =>
    await t.run(
      async (ctx) =>
        await ctx.db.insert("wizards", {
          owner,
          name: "Image Wizard",
          description: "A test wizard",
          wins: 0,
          losses: 0,
          isAIPowered: false,
          illustration: withIllustration ? "storage-id" : undefined,
        }),
    );

  it("creating a wizard is free", async () => {
    await ensureTestUser(t, "alice", 3);
    await withAuth(t, "alice").mutation(internal.wizards.createWizard, {
      name: "Free Wizard",
      description: "First look is free",
    });
    expect(await tokens("alice")).toBe(3);
  });

  it("regenerating a wizard that has an illustration costs 1 token", async () => {
    await ensureTestUser(t, "alice", 3);
    const wizardId = await makeWizard("alice", true);

    await withAuth(t, "alice").mutation(api.wizards.regenerateIllustration, {
      wizardId,
    });

    expect(await tokens("alice")).toBe(2);
    const entries = await t.run(async (ctx) =>
      ctx.db
        .query("imageCreditTransactions")
        .withIndex("by_user", (q) => q.eq("userId", "alice"))
        .collect(),
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      type: "CONSUMED",
      amount: 1,
      source: "WIZARD_IMAGE",
    });
  });

  it("regenerating a wizard that has no illustration yet is free", async () => {
    await ensureTestUser(t, "alice", 3);
    const wizardId = await makeWizard("alice", false);

    await withAuth(t, "alice").mutation(api.wizards.regenerateIllustration, {
      wizardId,
    });

    expect(await tokens("alice")).toBe(3);
  });

  it("refuses to regenerate without a token and leaves the wizard unchanged", async () => {
    await ensureTestUser(t, "alice", 0);
    const wizardId = await makeWizard("alice", true);

    await expect(
      withAuth(t, "alice").mutation(api.wizards.regenerateIllustration, {
        wizardId,
      }),
    ).rejects.toThrow(/at least 1 token/);

    const wizard = await t.run(async (ctx) => ctx.db.get(wizardId));
    expect(wizard?.illustrationVersion).toBeUndefined();
  });

  it("refunds the token when generation fails", async () => {
    await ensureTestUser(t, "alice", 3);
    const wizardId = await makeWizard("alice", true);
    await withAuth(t, "alice").mutation(api.wizards.regenerateIllustration, {
      wizardId,
    });
    expect(await tokens("alice")).toBe(2);

    await t.mutation(internal.imageCreditService.refundWizardImageToken, {
      userId: "alice",
      wizardId,
    });
    expect(await tokens("alice")).toBe(3);
  });

  it("saving a new name or description repaints the portrait for 1 token", async () => {
    await ensureTestUser(t, "alice", 3);
    const wizardId = await makeWizard("alice", true);

    const portrait = await withAuth(t, "alice").mutation(
      internal.wizards.updateWizard,
      { wizardId, name: "Renamed", description: "New description" },
    );
    expect(portrait).toBe("redrawing");
    expect(await tokens("alice")).toBe(2);
    const wizard = await t.run(async (ctx) => ctx.db.get(wizardId));
    expect(wizard?.illustrationVersion).toBe(2);
  });

  it("saving unchanged details leaves the portrait and tokens alone", async () => {
    await ensureTestUser(t, "alice", 3);
    const wizardId = await makeWizard("alice", true);
    const before = await t.run(async (ctx) => ctx.db.get(wizardId));

    const portrait = await withAuth(t, "alice").mutation(
      internal.wizards.updateWizard,
      { wizardId, name: before!.name, description: before!.description },
    );
    expect(portrait).toBe("unchanged");
    expect(await tokens("alice")).toBe(3);
  });

  it("refuses to save new details while the portrait is still painting", async () => {
    await ensureTestUser(t, "alice", 3);
    const wizardId = await makeWizard("alice", true);
    await t.run(async (ctx) =>
      ctx.db.patch(wizardId, {
        illustrationStatus: "painting",
        illustrationRequestedAt: Date.now(),
      }),
    );

    await expect(
      withAuth(t, "alice").mutation(internal.wizards.updateWizard, {
        wizardId,
        description: "Changed mid-paint",
      }),
    ).rejects.toThrow(/still being painted/);
    expect(await tokens("alice")).toBe(3);
  });

  it("refuses to save new details without a token to repaint", async () => {
    await ensureTestUser(t, "alice", 0);
    const wizardId = await makeWizard("alice", true);

    await expect(
      withAuth(t, "alice").mutation(internal.wizards.updateWizard, {
        wizardId,
        description: "Typo fixed",
      }),
    ).rejects.toThrow(/costs 1 token/);
    const wizard = await t.run(async (ctx) => ctx.db.get(wizardId));
    expect(wizard?.description).toBe("A test wizard");
    expect(wizard?.illustrationVersion).toBeUndefined();
  });
});
