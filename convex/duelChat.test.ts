import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { withAuth } from "./test_utils";
import type { Id } from "./_generated/dataModel";

function setup() {
  return convexTest(schema, import.meta.glob("./**/*.*s"));
}
type T = ReturnType<typeof setup>;

async function startDuel(t: T, opts: { enableChat?: boolean } = {}) {
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
    { numberOfRounds: 3, wizards: [wizard1Id], ...opts },
  );
  await withAuth(t, "test-user-2").mutation(api.duels.joinDuel, {
    duelId,
    wizards: [wizard2Id],
  });
  await withAuth(t, "test-user-1").mutation(
    internal.duels.startDuelAfterIntroduction,
    { duelId },
  );
  return { duelId, wizard1Id, wizard2Id };
}

async function messages(t: T) {
  return await t.run((ctx) => ctx.db.query("duelMessages").collect());
}

async function strikes(t: T) {
  return await t.run((ctx) => ctx.db.query("moderationEvents").collect());
}

async function setDuel(
  t: T,
  duelId: Id<"duels">,
  patch: { status?: "COMPLETED"; currentRound?: number; completedAt?: number },
) {
  await t.run((ctx) => ctx.db.patch(duelId, patch));
}

describe("watcher.sendChatMessage", () => {
  test("a duelist's clean message is posted as their wizard", async () => {
    const t = setup();
    const { duelId, wizard1Id } = await startDuel(t);

    const result = await withAuth(t, "test-user-1").action(
      api.watcher.sendChatMessage,
      { duelId, body: "  Prepare to be   turned into a toad!  " },
    );

    expect(result).toEqual({ ok: true });
    const [msg] = await messages(t);
    expect(msg).toMatchObject({
      body: "Prepare to be turned into a toad!",
      wizardId: wizard1Id,
      afterRound: 0,
    });
    expect(msg.postDuel).toBeUndefined();
  });

  test("records how many rounds had resolved when it was sent", async () => {
    const t = setup();
    const { duelId } = await startDuel(t);
    await setDuel(t, duelId, { currentRound: 3 });

    await withAuth(t, "test-user-2").action(api.watcher.sendChatMessage, {
      duelId,
      body: "Lucky shot",
    });
    expect((await messages(t))[0].afterRound).toBe(2);
  });

  test("messages after the duel ends are marked post-duel", async () => {
    const t = setup();
    const { duelId } = await startDuel(t);
    await setDuel(t, duelId, {
      status: "COMPLETED",
      currentRound: 3,
      completedAt: Date.now(),
    });

    await withAuth(t, "test-user-2").action(api.watcher.sendChatMessage, {
      duelId,
      body: "GG",
    });
    expect((await messages(t))[0]).toMatchObject({
      afterRound: 3,
      postDuel: true,
    });
  });

  test("chat closes a while after the duel ends", async () => {
    const t = setup();
    const { duelId } = await startDuel(t);
    await setDuel(t, duelId, {
      status: "COMPLETED",
      completedAt: Date.now() - 31 * 60 * 1000,
    });

    await expect(
      withAuth(t, "test-user-1").action(api.watcher.sendChatMessage, {
        duelId,
        body: "GG",
      }),
    ).rejects.toThrow(/closed/);
  });

  test("spectators can't send messages", async () => {
    const t = setup();
    const { duelId } = await startDuel(t);

    await expect(
      withAuth(t, "spectator").action(api.watcher.sendChatMessage, {
        duelId,
        body: "Go Gandalf!",
      }),
    ).rejects.toThrow(/Only the duelists/);
    expect(await messages(t)).toHaveLength(0);
  });

  test("respects a duel created with chat off", async () => {
    const t = setup();
    const { duelId } = await startDuel(t, { enableChat: false });

    await expect(
      withAuth(t, "test-user-2").action(api.watcher.sendChatMessage, {
        duelId,
        body: "Hello",
      }),
    ).rejects.toThrow(/turned off/);
  });

  test("the Watcher blocks profanity and records a chat strike", async () => {
    const t = setup();
    const { duelId } = await startDuel(t);

    const result = await withAuth(t, "test-user-1").action(
      api.watcher.sendChatMessage,
      { duelId, body: "you are a piece of shit" },
    );

    expect(result.ok).toBe(false);
    expect(await messages(t)).toHaveLength(0);
    const [strike] = await strikes(t);
    expect(strike).toMatchObject({
      surface: "chat",
      category: "profanity",
      duelId,
    });
  });

  test("links, emails and phone numbers are blocked as personal info", async () => {
    for (const body of [
      "add me at wizardkid@example.com",
      "join my discord.gg/abc",
      "call 555-123-4567",
    ]) {
      const t = setup();
      const { duelId } = await startDuel(t);
      const result = await withAuth(t, "test-user-1").action(
        api.watcher.sendChatMessage,
        { duelId, body },
      );
      expect(result.ok, body).toBe(false);
      expect((await strikes(t))[0].category).toBe("personal_info");
    }
  });

  test("big damage numbers aren't mistaken for phone numbers", async () => {
    const t = setup();
    const { duelId } = await startDuel(t);
    const result = await withAuth(t, "test-user-1").action(
      api.watcher.sendChatMessage,
      { duelId, body: "My next spell does 99999999 damage" },
    );
    expect(result).toEqual({ ok: true });
  });

  test("rejects messages sent too quickly or too long", async () => {
    const t = setup();
    const { duelId } = await startDuel(t);
    const as1 = withAuth(t, "test-user-1");

    await expect(
      as1.action(api.watcher.sendChatMessage, {
        duelId,
        body: "x".repeat(201),
      }),
    ).rejects.toThrow(/under 200/);

    await as1.action(api.watcher.sendChatMessage, { duelId, body: "One" });
    await expect(
      as1.action(api.watcher.sendChatMessage, { duelId, body: "Two" }),
    ).rejects.toThrow(/Slow down/);
  });
});

describe("duelChat.turnOffChat", () => {
  test("either duelist can turn chat off", async () => {
    const t = setup();
    const { duelId } = await startDuel(t);

    await withAuth(t, "test-user-2").mutation(api.duelChat.turnOffChat, {
      duelId,
    });

    await expect(
      withAuth(t, "test-user-1").action(api.watcher.sendChatMessage, {
        duelId,
        body: "Hello?",
      }),
    ).rejects.toThrow(/turned off/);
  });

  test("spectators can't turn chat off", async () => {
    const t = setup();
    const { duelId } = await startDuel(t);
    await expect(
      withAuth(t, "spectator").mutation(api.duelChat.turnOffChat, { duelId }),
    ).rejects.toThrow(/Only the duelists/);
  });

  test("a rematch keeps chat off", async () => {
    const t = setup();
    const { duelId } = await startDuel(t, { enableChat: false });
    await setDuel(t, duelId, { status: "COMPLETED", completedAt: Date.now() });

    const rematchId = await withAuth(t, "test-user-1").mutation(
      api.duels.requestRematch,
      { duelId },
    );
    const rematch = await t.run((ctx) => ctx.db.get(rematchId));
    expect(rematch?.chatEnabled).toBe(false);
  });
});

describe("duelChat.listMessages", () => {
  test("is hidden from signed-out viewers", async () => {
    const t = setup();
    const { duelId } = await startDuel(t);
    expect(await t.query(api.duelChat.listMessages, { duelId })).toBeNull();
  });

  test("returns messages in order without revealing who sent them", async () => {
    const t = setup();
    const { duelId } = await startDuel(t);
    await withAuth(t, "test-user-1").action(api.watcher.sendChatMessage, {
      duelId,
      body: "Hello",
    });
    await withAuth(t, "test-user-2").action(api.watcher.sendChatMessage, {
      duelId,
      body: "Prepare yourself",
    });

    const list = await withAuth(t, "test-user-1").query(
      api.duelChat.listMessages,
      { duelId },
    );
    expect(list?.map((m) => [m.body, m.mine])).toEqual([
      ["Hello", true],
      ["Prepare yourself", false],
    ]);
    expect(list?.[0]).not.toHaveProperty("userId");

    const spectatorView = await withAuth(t, "spectator").query(
      api.duelChat.listMessages,
      { duelId },
    );
    expect(spectatorView).toHaveLength(2);
  });
});
