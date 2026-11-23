import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import { withAuth } from "./test_utils";

function setup() {
  return convexTest(schema, import.meta.glob("./**/*.*s"));
}
type T = ReturnType<typeof setup>;

async function makeWizard(t: T, name: string, owner: string) {
  return await t.run(
    async (ctx) =>
      await ctx.db.insert("wizards", { owner, name, description: name }),
  );
}

async function participantRows(t: T, duelId: Id<"duels">) {
  return await t.run(async (ctx) =>
    (
      await ctx.db
        .query("duelParticipants")
        .withIndex("by_duel", (q) => q.eq("duelId", duelId))
        .collect()
    )
      .map((r) => r.userId)
      .sort(),
  );
}

const live = (t: T, user: string) =>
  withAuth(t, user).query(api.duels.getMyWizardsLiveDuels, {});

describe("getMyWizardsLiveDuels", () => {
  test("follows a duel from lobby to your turn to forfeit", async () => {
    const t = setup();
    const a = await makeWizard(t, "A", "user-1");
    const b = await makeWizard(t, "B", "user-2");

    const duelId = await withAuth(t, "user-1").mutation(api.duels.createDuel, {
      numberOfRounds: 3,
      wizards: [a],
    });
    expect(await participantRows(t, duelId)).toEqual(["user-1"]);
    expect(await live(t, "user-1")).toMatchObject([
      { wizardId: a, duelId, status: "WAITING_FOR_PLAYERS", yourTurn: false },
    ]);

    await withAuth(t, "user-2").mutation(api.duels.joinDuel, {
      duelId,
      wizards: [b],
    });
    expect(await participantRows(t, duelId)).toEqual(["user-1", "user-2"]);

    await t.mutation(internal.duels.startDuelAfterIntroduction, { duelId });
    expect(await live(t, "user-2")).toMatchObject([
      { wizardId: b, duelId, status: "IN_PROGRESS", yourTurn: true },
    ]);

    await withAuth(t, "user-1").mutation(internal.duels.castSpell, {
      duelId,
      wizardId: a,
      spellDescription: "Fireball!",
    });
    // Turn state is read from the duel itself, so it updates without a sync.
    expect(await live(t, "user-1")).toMatchObject([{ yourTurn: false }]);
    expect(await live(t, "user-2")).toMatchObject([{ yourTurn: true }]);

    await withAuth(t, "user-1").mutation(api.duels.forfeitDuel, { duelId });
    expect(await participantRows(t, duelId)).toEqual([]);
    expect(await live(t, "user-1")).toEqual([]);
    expect(await live(t, "user-2")).toEqual([]);
  });

  test("a cancelled lobby drops out", async () => {
    const t = setup();
    const a = await makeWizard(t, "A", "user-1");
    const duelId = await withAuth(t, "user-1").mutation(api.duels.createDuel, {
      numberOfRounds: 3,
      wizards: [a],
    });
    await withAuth(t, "user-1").mutation(api.duels.cancelDuel, { duelId });
    expect(await participantRows(t, duelId)).toEqual([]);
    expect(await live(t, "user-1")).toEqual([]);
  });

  test("backfill indexes duels that were live before the table existed", async () => {
    const t = setup();
    const a = await makeWizard(t, "A", "user-1");
    const x = await makeWizard(t, "X", "user-2");
    const duelId = await t.run(
      async (ctx) =>
        await ctx.db.insert("duels", {
          numberOfRounds: 3,
          wizards: [a, x],
          players: ["user-1", "user-2"],
          status: "IN_PROGRESS",
          currentRound: 1,
          createdAt: Date.now(),
          points: {},
          hitPoints: {},
          needActionsFrom: [a],
        }),
    );
    expect(await live(t, "user-1")).toEqual([]);

    await t.mutation(internal.duels.backfillDuelParticipants, {});
    await t.finishAllScheduledFunctions(() => {});

    expect(await live(t, "user-1")).toMatchObject([
      { wizardId: a, duelId, yourTurn: true },
    ]);
  });

  test("returns nothing when signed out", async () => {
    const t = setup();
    expect(await t.query(api.duels.getMyWizardsLiveDuels, {})).toEqual([]);
  });
});
