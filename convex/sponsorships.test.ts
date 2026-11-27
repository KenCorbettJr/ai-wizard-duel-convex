import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import type { TestConvex } from "convex-test";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import {
  createTestUser,
  ensureTestUser,
  withAuth,
  withSuperAdminAuth,
} from "./test_utils";

const HOUR = 60 * 60 * 1000;

describe("Sponsored duels", () => {
  let t: TestConvex<typeof schema>;

  beforeEach(async () => {
    t = convexTest(schema, import.meta.glob("./**/*.*s"));
    await createTestUser(t, "super-admin-user", "super_admin");
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

  const sponsor = async (
    overrides: Partial<{
      sponsorName: string;
      startsAt: number;
      endsAt: number;
      maxEntries: number;
      dailyEntriesPerPlayer: number;
      url: string;
      logoStorageId: Id<"_storage">;
    }> = {},
  ) =>
    await withSuperAdminAuth(t).mutation(api.sponsorships.create, {
      sponsorName: "Acme Spellworks",
      message: "Duel on us this week!",
      url: "https://example.com",
      startsAt: Date.now() - HOUR,
      endsAt: Date.now() + 24 * HOUR,
      ...overrides,
    });

  const playDuel = async (alice: string, bob: string) => {
    const duelId = await withAuth(t, alice).mutation(api.duels.createDuel, {
      numberOfRounds: 3,
      wizards: [await makeWizard(alice)],
    });
    await withAuth(t, bob).mutation(api.duels.joinDuel, {
      duelId,
      wizards: [await makeWizard(bob)],
    });
    return duelId;
  };

  it("makes duels free for players while a sponsorship runs", async () => {
    const sponsorshipId = await sponsor();
    await ensureTestUser(t, "alice", 0);
    await ensureTestUser(t, "bob", 0);

    const duelId = await playDuel("alice", "bob");

    expect(await tokens("alice")).toBe(0);
    expect(await tokens("bob")).toBe(0);
    const duel = await t.run(async (ctx) => ctx.db.get(duelId));
    expect(duel?.sponsorshipId).toBe(sponsorshipId);
    expect(duel?.tokensCharged ?? []).toEqual([]);

    const [row] = await withSuperAdminAuth(t).query(api.sponsorships.list, {});
    expect(row.entriesUsed).toBe(2);
    expect(row.players).toBe(2);
    expect(row.status).toBe("RUNNING");
  });

  it("charges tokens again once the sponsor's budget is spent", async () => {
    await sponsor({ maxEntries: 3 });
    await ensureTestUser(t, "alice", 5);
    await ensureTestUser(t, "bob", 5);

    await playDuel("alice", "bob"); // 2 sponsored entries
    await playDuel("alice", "bob"); // 1 sponsored, then 1 paid

    expect((await tokens("alice")) + (await tokens("bob"))).toBe(9);
    const [row] = await withSuperAdminAuth(t).query(api.sponsorships.list, {});
    expect(row.status).toBe("BUDGET_SPENT");
    expect(await t.query(api.sponsorships.getCurrent, {})).toBeNull();
  });

  it("applies the daily per-player limit", async () => {
    await sponsor({ dailyEntriesPerPlayer: 1 });
    await ensureTestUser(t, "alice", 0);
    await ensureTestUser(t, "bob", 2);
    await ensureTestUser(t, "carol", 2);

    await playDuel("alice", "bob");
    const current = await withAuth(t, "alice").query(
      api.sponsorships.getCurrent,
      {},
    );
    expect(current?.coversYou).toBe(false);
    expect(current?.entriesLeftToday).toBe(0);

    // Alice has used her free entry for today and has no tokens
    await expect(
      withAuth(t, "alice").mutation(api.duels.createDuel, {
        numberOfRounds: 3,
        wizards: [await makeWizard("alice")],
      }),
    ).rejects.toThrow(/at least 1 token/);

    // Bob's second duel today costs him a token
    await playDuel("carol", "bob");
    expect(await tokens("bob")).toBe(1);
    expect(await tokens("carol")).toBe(2);
  });

  it("does nothing before it starts or after it ends", async () => {
    await sponsor({
      startsAt: Date.now() + HOUR,
      endsAt: Date.now() + 2 * HOUR,
    });
    await ensureTestUser(t, "alice", 3);
    await ensureTestUser(t, "bob", 3);

    await playDuel("alice", "bob");
    expect(await tokens("alice")).toBe(2);
    expect(await t.query(api.sponsorships.getCurrent, {})).toBeNull();
  });

  it("stops covering entries when ended early", async () => {
    const sponsorshipId = await sponsor();
    await withSuperAdminAuth(t).mutation(api.sponsorships.endNow, {
      sponsorshipId,
    });
    await ensureTestUser(t, "alice", 3);
    await ensureTestUser(t, "bob", 3);

    await playDuel("alice", "bob");
    expect(await tokens("alice")).toBe(2);
  });

  it("shows the running sponsor to signed-out visitors", async () => {
    await sponsor();
    const current = await t.query(api.sponsorships.getCurrent, {});
    expect(current).toMatchObject({
      sponsorName: "Acme Spellworks",
      url: "https://example.com/",
      coversYou: null,
    });
  });

  it("refuses overlapping sponsorships and non-https links", async () => {
    await sponsor();
    await expect(
      sponsor({ sponsorName: "Other Co", startsAt: Date.now() + HOUR }),
    ).rejects.toThrow(/overlaps Acme Spellworks/);
    await expect(
      sponsor({
        startsAt: Date.now() + 48 * HOUR,
        endsAt: Date.now() + 72 * HOUR,
        url: "http://example.com",
      }),
    ).rejects.toThrow(/https/);
  });

  it("only lets super admins manage sponsorships", async () => {
    await createTestUser(t, "mallory", "user");
    await expect(
      withAuth(t, "mallory").mutation(api.sponsorships.create, {
        sponsorName: "Sneaky",
        startsAt: Date.now(),
        endsAt: Date.now() + HOUR,
      }),
    ).rejects.toThrow(/Super admin/);
  });

  it("keeps a used sponsorship on record", async () => {
    const sponsorshipId = await sponsor();
    await ensureTestUser(t, "alice", 0);
    await ensureTestUser(t, "bob", 0);
    await playDuel("alice", "bob");

    await expect(
      withSuperAdminAuth(t).mutation(api.sponsorships.remove, {
        sponsorshipId,
      }),
    ).rejects.toThrow(/stays on record/);
  });

  it("accepts an image logo and rejects other files", async () => {
    const store = (type: string) =>
      t.run(async (ctx) => ctx.storage.store(new Blob(["fake"], { type })));

    const notImage = await store("text/html");
    await expect(sponsor({ logoStorageId: notImage })).rejects.toThrow(
      /PNG, JPEG, WebP or SVG/,
    );

    const logo = await store("image/png");
    await sponsor({ logoStorageId: logo });
    const current = await t.query(api.sponsorships.getCurrent, {});
    expect(current?.logoUrl).toBeTruthy();
  });
});
