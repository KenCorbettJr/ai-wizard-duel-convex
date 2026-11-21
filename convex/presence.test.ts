import { convexTest } from "convex-test";
import presenceTest from "@convex-dev/presence/test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { withAuth } from "./test_utils";

function setup() {
  const t = convexTest(schema, import.meta.glob("./**/*.*s"));
  presenceTest.register(t);
  return t;
}
type T = ReturnType<typeof setup>;

async function makeDuel(t: T) {
  return await t.run((ctx) =>
    ctx.db.insert("duels", {
      numberOfRounds: 3,
      wizards: [],
      players: ["duelist-1", "duelist-2"],
      status: "IN_PROGRESS",
      currentRound: 1,
      createdAt: Date.now(),
      points: {},
      hitPoints: {},
      needActionsFrom: [],
    }),
  );
}

const beat = (roomId: string, userId: string, sessionId = userId) => ({
  roomId,
  userId,
  sessionId,
  interval: 10_000,
});

describe("arena presence", () => {
  test("counts signed-in and anonymous onlookers, not duelists", async () => {
    const t = setup();
    const duelId = await makeDuel(t);

    await withAuth(t, "duelist-1").mutation(
      api.presence.heartbeat,
      beat(duelId, "user:duelist-1"),
    );
    await withAuth(t, "fan").mutation(
      api.presence.heartbeat,
      beat(duelId, "user:fan"),
    );
    await t.mutation(
      api.presence.heartbeat,
      beat(duelId, "anon:3f2b9c1e-guest-viewer"),
    );

    expect(await t.query(api.presence.arena, { duelId })).toEqual({
      onlookers: 2,
      atCapacity: false,
      playersHere: ["duelist-1"],
    });
  });

  test("a viewer leaving drops the count", async () => {
    const t = setup();
    const duelId = await makeDuel(t);

    const { sessionToken } = await t.mutation(
      api.presence.heartbeat,
      beat(duelId, "anon:3f2b9c1e-guest-viewer"),
    );
    await t.mutation(api.presence.disconnect, { sessionToken });

    const arena = await t.query(api.presence.arena, { duelId });
    expect(arena?.onlookers).toBe(0);
  });

  test("nobody can join as another account", async () => {
    const t = setup();
    const duelId = await makeDuel(t);

    await expect(
      withAuth(t, "fan").mutation(
        api.presence.heartbeat,
        beat(duelId, "user:duelist-1"),
      ),
    ).rejects.toThrow("Not authorized");
    await expect(
      t.mutation(api.presence.heartbeat, beat(duelId, "user:duelist-1")),
    ).rejects.toThrow("Not authorized");
  });

  test("rejects malformed IDs and unknown rooms", async () => {
    const t = setup();
    const duelId = await makeDuel(t);

    await expect(
      t.mutation(api.presence.heartbeat, beat(duelId, "duelist-1")),
    ).rejects.toThrow("Invalid presence ID");
    await expect(
      t.mutation(
        api.presence.heartbeat,
        beat("not-a-duel", "anon:3f2b9c1e-guest-viewer"),
      ),
    ).rejects.toThrow("Unknown duel");
  });

  test("the hook's list query reveals nobody", async () => {
    const t = setup();
    const duelId = await makeDuel(t);
    const { roomToken } = await t.mutation(
      api.presence.heartbeat,
      beat(duelId, "anon:3f2b9c1e-guest-viewer"),
    );

    expect(await t.query(api.presence.list, { roomToken })).toEqual([]);
  });
});
