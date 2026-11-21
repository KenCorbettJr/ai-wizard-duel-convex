import { convexTest } from "convex-test";
import presenceTest from "@convex-dev/presence/test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { withAuth } from "./test_utils";
import type { Id } from "./_generated/dataModel";

function setup() {
  const t = convexTest(schema, import.meta.glob("./**/*.*s"));
  presenceTest.register(t);
  return t;
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
  await t.mutation(internal.duels.startDuelAfterIntroduction, { duelId });
  return { duelId, wizard1Id, wizard2Id };
}

async function notificationsFor(t: T, userId: string) {
  return await t.run((ctx) =>
    ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
  );
}

/** Open the duel page: join its arena as this user. */
async function enterArena(t: T, userId: string, duelId: Id<"duels">) {
  return await withAuth(t, userId).mutation(api.presence.heartbeat, {
    roomId: duelId,
    userId: `user:${userId}`,
    sessionId: `session-${userId}`,
    interval: 10_000,
  });
}

async function remind(t: T, duelId: Id<"duels">, roundNumber = 1) {
  await t.mutation(internal.notifications.sendTurnReminders, {
    duelId,
    roundNumber,
  });
}

describe("turn reminders", () => {
  test("both away players are told the duel has begun", async () => {
    const t = setup();
    const { duelId } = await startDuel(t);

    await remind(t, duelId);

    const [n1] = await notificationsFor(t, "test-user-1");
    expect(n1).toMatchObject({
      type: "YOUR_TURN",
      title: "Your duel has begun!",
      body: "Gandalf faces Saruman. Cast your first spell.",
      url: `/duels/${duelId}`,
      pushStatus: "PENDING",
    });
    expect(await notificationsFor(t, "test-user-2")).toHaveLength(1);
  });

  test("a player watching the duel is not notified", async () => {
    const t = setup();
    const { duelId } = await startDuel(t);

    await enterArena(t, "test-user-1", duelId);
    await remind(t, duelId);

    expect(await notificationsFor(t, "test-user-1")).toHaveLength(0);
    expect(await notificationsFor(t, "test-user-2")).toHaveLength(1);
  });

  test("a player who left the arena counts as away", async () => {
    const t = setup();
    const { duelId } = await startDuel(t);

    const { sessionToken } = await enterArena(t, "test-user-1", duelId);
    await t.mutation(api.presence.disconnect, { sessionToken });
    await remind(t, duelId);

    expect(await notificationsFor(t, "test-user-1")).toHaveLength(1);
  });

  test("being in a different duel's arena doesn't count", async () => {
    const t = setup();
    const { duelId } = await startDuel(t);
    const { duelId: otherDuelId } = await startDuel(t);

    await enterArena(t, "test-user-1", otherDuelId);
    await remind(t, duelId);

    expect(await notificationsFor(t, "test-user-1")).toHaveLength(1);
  });

  test("players who already cast are skipped", async () => {
    const t = setup();
    const { duelId, wizard2Id } = await startDuel(t);

    await t.run((ctx) =>
      ctx.db.patch(duelId, { needActionsFrom: [wizard2Id] }),
    );
    await remind(t, duelId);

    expect(await notificationsFor(t, "test-user-1")).toHaveLength(0);
    expect(await notificationsFor(t, "test-user-2")).toHaveLength(1);
  });

  test("the same round never notifies twice", async () => {
    const t = setup();
    const { duelId } = await startDuel(t);

    await remind(t, duelId);
    await remind(t, duelId);

    expect(await notificationsFor(t, "test-user-1")).toHaveLength(1);
  });

  test("a reminder for a round that has moved on does nothing", async () => {
    const t = setup();
    const { duelId } = await startDuel(t);

    await t.run((ctx) => ctx.db.patch(duelId, { currentRound: 2 }));
    await remind(t, duelId, 1);

    expect(await notificationsFor(t, "test-user-1")).toHaveLength(0);
  });

  test("later rounds say whose move it is", async () => {
    const t = setup();
    const { duelId } = await startDuel(t);

    await t.run((ctx) => ctx.db.patch(duelId, { currentRound: 3 }));
    await remind(t, duelId, 3);

    const [n] = await notificationsFor(t, "test-user-1");
    expect(n.title).toBe("Round 3: your move");
    expect(n.body).toBe("Saruman is waiting. Cast Gandalf's next spell.");
  });
});

describe("duel results", () => {
  test("winner and loser hear how it ended, unless watching", async () => {
    const t = setup();
    const { duelId, wizard1Id, wizard2Id } = await startDuel(t);
    await t.run((ctx) =>
      ctx.db.patch(duelId, {
        status: "COMPLETED",
        winners: [wizard1Id],
        losers: [wizard2Id],
      }),
    );

    await t.mutation(internal.notifications.sendDuelResults, { duelId });

    const [won] = await notificationsFor(t, "test-user-1");
    const [lost] = await notificationsFor(t, "test-user-2");
    expect(won).toMatchObject({ type: "DUEL_RESULT", title: "Victory!" });
    expect(lost).toMatchObject({ type: "DUEL_RESULT", title: "Defeat" });
  });
});

describe("inbox", () => {
  test("unread count, opening the duel, and mark all read", async () => {
    const t = setup();
    const { duelId } = await startDuel(t);
    await remind(t, duelId);
    const user1 = withAuth(t, "test-user-1");

    expect(await user1.query(api.notifications.getMyUnreadCount, {})).toBe(1);
    expect(
      await user1.query(api.notifications.listMyNotifications, {}),
    ).toHaveLength(1);

    await user1.mutation(api.notifications.markDuelNotificationsRead, {
      duelId,
    });
    expect(await user1.query(api.notifications.getMyUnreadCount, {})).toBe(0);

    // The other player's notification is untouched
    const user2 = withAuth(t, "test-user-2");
    expect(await user2.query(api.notifications.getMyUnreadCount, {})).toBe(1);
    await user2.mutation(api.notifications.markAllNotificationsRead, {});
    expect(await user2.query(api.notifications.getMyUnreadCount, {})).toBe(0);
  });

  test("players can't mark someone else's notification read", async () => {
    const t = setup();
    const { duelId } = await startDuel(t);
    await remind(t, duelId);
    const [n] = await notificationsFor(t, "test-user-2");

    await withAuth(t, "test-user-1").mutation(
      api.notifications.markNotificationRead,
      { notificationId: n._id },
    );

    const [after] = await notificationsFor(t, "test-user-2");
    expect(after.readAt).toBeUndefined();
  });
});

describe("push subscriptions", () => {
  test("a browser's subscription moves to whoever signs in on it", async () => {
    const t = setup();
    const sub = {
      endpoint: "https://push.example/abc",
      p256dh: "k",
      auth: "a",
    };

    await withAuth(t, "test-user-1").mutation(
      api.notifications.savePushSubscription,
      sub,
    );
    await withAuth(t, "test-user-2").mutation(
      api.notifications.savePushSubscription,
      sub,
    );

    const rows = await t.run((ctx) =>
      ctx.db.query("pushSubscriptions").collect(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe("test-user-2");
    expect(
      await withAuth(t, "test-user-1").query(
        api.notifications.isPushSubscriptionActive,
        { endpoint: sub.endpoint },
      ),
    ).toBe(false);
  });

  test("expired subscriptions are removed after delivery", async () => {
    const t = setup();
    const { duelId } = await startDuel(t);
    await remind(t, duelId);
    const [n] = await notificationsFor(t, "test-user-1");
    const subId = await t.run((ctx) =>
      ctx.db.insert("pushSubscriptions", {
        userId: "test-user-1",
        endpoint: "https://push.example/gone",
        p256dh: "k",
        auth: "a",
        createdAt: Date.now(),
      }),
    );

    await t.mutation(internal.notifications.recordPushDelivery, {
      notificationId: n._id,
      status: "FAILED",
      deliveredSubscriptionIds: [],
      expiredSubscriptionIds: [subId],
    });

    expect(await t.run((ctx) => ctx.db.get(subId))).toBeNull();
    const [after] = await notificationsFor(t, "test-user-1");
    expect(after.pushStatus).toBe("FAILED");
  });
});
