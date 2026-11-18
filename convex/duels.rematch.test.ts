import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { withAuth } from "./test_utils";

async function setupCompletedDuel() {
  const t = convexTest(schema, import.meta.glob("./**/*.*s"));
  const [wizard1, wizard2] = await t.run(async (ctx) => {
    const make = (owner: string, name: string) =>
      ctx.db.insert("wizards", {
        owner,
        name,
        description: "A wizard",
        wins: 0,
        losses: 0,
        isAIPowered: false,
      });
    return [await make("user-1", "Gandalf"), await make("user-2", "Merlin")];
  });
  const duelId = await withAuth(t, "user-1").mutation(api.duels.createDuel, {
    numberOfRounds: 3,
    wizards: [wizard1],
  });
  await withAuth(t, "user-2").mutation(api.duels.joinDuel, {
    duelId,
    wizards: [wizard2],
  });
  await t.run(async (ctx) => {
    await ctx.db.patch(duelId, { status: "COMPLETED" });
  });
  return { t, duelId, wizard1, wizard2 };
}

describe("requestRematch", () => {
  test("first requester creates a waiting duel with their wizard", async () => {
    const { t, duelId, wizard1 } = await setupCompletedDuel();

    const rematchId = await withAuth(t, "user-1").mutation(
      api.duels.requestRematch,
      { duelId },
    );

    const rematch = await withAuth(t, "user-1").query(api.duels.getDuel, {
      duelId: rematchId,
    });
    expect(rematch).toMatchObject({
      numberOfRounds: 3,
      wizards: [wizard1],
      players: ["user-1"],
      status: "WAITING_FOR_PLAYERS",
    });

    const original = await withAuth(t, "user-1").query(api.duels.getDuel, {
      duelId,
    });
    expect(original?.rematchDuelId).toBe(rematchId);
  });

  test("the opponent joins the same rematch with their own wizard", async () => {
    const { t, duelId, wizard1, wizard2 } = await setupCompletedDuel();

    const first = await withAuth(t, "user-1").mutation(
      api.duels.requestRematch,
      { duelId },
    );
    const second = await withAuth(t, "user-2").mutation(
      api.duels.requestRematch,
      { duelId },
    );
    expect(second).toBe(first);

    const rematch = await withAuth(t, "user-1").query(api.duels.getDuel, {
      duelId: first,
    });
    expect(rematch?.players).toEqual(["user-1", "user-2"]);
    expect(rematch?.wizards).toEqual([wizard1, wizard2]);
  });

  test("requesting twice does not create a second rematch", async () => {
    const { t, duelId } = await setupCompletedDuel();
    const a = await withAuth(t, "user-1").mutation(api.duels.requestRematch, {
      duelId,
    });
    const b = await withAuth(t, "user-1").mutation(api.duels.requestRematch, {
      duelId,
    });
    expect(b).toBe(a);
  });

  test("rejects non-participants and unfinished duels", async () => {
    const { t, duelId } = await setupCompletedDuel();
    await expect(
      withAuth(t, "user-3").mutation(api.duels.requestRematch, { duelId }),
    ).rejects.toThrow("Only duel participants");

    await t.run(async (ctx) => {
      await ctx.db.patch(duelId, { status: "IN_PROGRESS" });
    });
    await expect(
      withAuth(t, "user-1").mutation(api.duels.requestRematch, { duelId }),
    ).rejects.toThrow("Only completed duels");
  });
});
