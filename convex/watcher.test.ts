import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { withAuth } from "./test_utils";
import { COOLDOWN_STRIKES } from "./lib/watcherRules";

function setup() {
  return convexTest(schema, import.meta.glob("./**/*.*s"));
}
type T = ReturnType<typeof setup>;

async function startDuel(t: T) {
  const [wizard1Id, wizard2Id] = await t.run(async (ctx) => [
    await ctx.db.insert("wizards", {
      owner: "test-user-1",
      name: "Gandalf",
      description: "A wise wizard",
      wins: 0,
      losses: 0,
      isAIPowered: false,
    }),
    await ctx.db.insert("wizards", {
      owner: "test-user-2",
      name: "Saruman",
      description: "A powerful wizard",
      wins: 0,
      losses: 0,
      isAIPowered: false,
    }),
  ]);
  const duelId = await withAuth(t, "test-user-1").mutation(
    api.duels.createDuel,
    { numberOfRounds: 3, wizards: [wizard1Id] },
  );
  await withAuth(t, "test-user-2").mutation(api.duels.joinDuel, {
    duelId,
    wizards: [wizard2Id],
  });
  await withAuth(t, "test-user-1").mutation(
    internal.duels.startDuelAfterIntroduction,
    { duelId },
  );
  return { duelId, wizard1Id };
}

async function spellsInRound(t: T, duelId: string) {
  return await t.run(async (ctx) => {
    const round = await ctx.db
      .query("duelRounds")
      .filter((q) => q.eq(q.field("duelId"), duelId))
      .filter((q) => q.eq(q.field("roundNumber"), 1))
      .first();
    return round?.spells ?? {};
  });
}

async function strikes(t: T) {
  return await t.run((ctx) => ctx.db.query("moderationEvents").collect());
}

describe("watcher.castSpell", () => {
  test("lets a clean spell through", async () => {
    const t = setup();
    const { duelId, wizard1Id } = await startDuel(t);

    const result = await withAuth(t, "test-user-1").action(
      api.watcher.castSpell,
      {
        duelId,
        wizardId: wizard1Id,
        spellDescription: "I hurl a fireball and blast them across the arena",
      },
    );

    expect(result).toEqual({ ok: true });
    expect(Object.keys(await spellsInRound(t, duelId))).toEqual([wizard1Id]);
    expect(await strikes(t)).toHaveLength(0);
  });

  test("rejects a rule break without casting, and records a strike", async () => {
    const t = setup();
    const { duelId, wizard1Id } = await startDuel(t);

    const result = await withAuth(t, "test-user-1").action(
      api.watcher.castSpell,
      { duelId, wizardId: wizard1Id, spellDescription: "Eat sh1t, loser" },
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.rejection.category).toBe("profanity");
    expect(result.rejection.strikeCount).toBe(1);
    expect(result.rejection.message).not.toMatch(/sh1t/i);

    // The turn is not used up.
    expect(await spellsInRound(t, duelId)).toEqual({});
    const recorded = await strikes(t);
    expect(recorded).toHaveLength(1);
    expect(recorded[0]).toMatchObject({
      userId: "test-user-1",
      surface: "spell",
      source: "wordlist",
      duelId,
    });

    // The player can retry with something acceptable.
    const retry = await withAuth(t, "test-user-1").action(
      api.watcher.castSpell,
      { duelId, wizardId: wizard1Id, spellDescription: "Frost nova!" },
    );
    expect(retry).toEqual({ ok: true });
  });

  test("silences a player after too many strikes", async () => {
    const t = setup();
    const { duelId, wizard1Id } = await startDuel(t);
    const cast = (spellDescription: string) =>
      withAuth(t, "test-user-1").action(api.watcher.castSpell, {
        duelId,
        wizardId: wizard1Id,
        spellDescription,
      });

    let last;
    for (let i = 0; i < COOLDOWN_STRIKES; i++) last = await cast("fuck");
    expect(last?.ok).toBe(false);
    if (last?.ok !== false) return;
    expect(last.rejection.category).toBe("cooldown");
    expect(last.rejection.cooldownUntil).toBeGreaterThan(Date.now());

    // Even a clean spell is refused during the cooldown, without a new strike.
    const clean = await cast("A gentle healing light");
    expect(clean.ok).toBe(false);
    if (clean.ok) return;
    expect(clean.rejection.category).toBe("cooldown");
    expect(await strikes(t)).toHaveLength(COOLDOWN_STRIKES);
  });

  test("requires sign-in", async () => {
    const t = setup();
    const { duelId, wizard1Id } = await startDuel(t);
    await expect(
      t.action(api.watcher.castSpell, {
        duelId,
        wizardId: wizard1Id,
        spellDescription: "Fireball",
      }),
    ).rejects.toThrow("Not authenticated");
  });
});

describe("weighted strikes", () => {
  test("a sexual rejection counts as two strikes", async () => {
    const t = setup();
    const { duelId, wizard1Id } = await startDuel(t);
    const result = await withAuth(t, "test-user-1").action(
      api.watcher.castSpell,
      { duelId, wizardId: wizard1Id, spellDescription: "I flash my boobs" },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.rejection.category).toBe("sexual");
    expect(result.rejection.strikeCount).toBe(2);
  });
});

describe("watcher.createWizard", () => {
  test("creates a clean wizard", async () => {
    const t = setup();
    const result = await withAuth(t, "test-user-1").action(
      api.watcher.createWizard,
      { name: "Ember", description: "A fiery young sorceress" },
    );
    expect(result.ok).toBe(true);
    const wizards = await t.run((ctx) => ctx.db.query("wizards").collect());
    expect(wizards.map((w) => w.name)).toEqual(["Ember"]);
  });

  test("rejects a rude name and creates nothing", async () => {
    const t = setup();
    const result = await withAuth(t, "test-user-1").action(
      api.watcher.createWizard,
      { name: "Lord Bitchface", description: "A wizard" },
    );
    expect(result.ok).toBe(false);
    const wizards = await t.run((ctx) => ctx.db.query("wizards").collect());
    expect(wizards).toHaveLength(0);
    expect((await strikes(t))[0].surface).toBe("wizard");
  });
});

describe("watcher.updateUserProfile", () => {
  test("rejects a rude display name", async () => {
    const t = setup();
    const result = await withAuth(t, "test-user-1").action(
      api.watcher.updateUserProfile,
      { displayName: "xXfuckerXx" },
    );
    expect(result.success).toBe(false);
    expect(result.rejection?.category).toBe("profanity");
    expect((await strikes(t))[0].surface).toBe("profile");
  });
});
