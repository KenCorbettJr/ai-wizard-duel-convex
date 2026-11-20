import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { withAuth } from "./test_utils";
import type { Doc, Id } from "./_generated/dataModel";

function setup() {
  return convexTest(schema, import.meta.glob("./**/*.*s"));
}
type T = ReturnType<typeof setup>;

async function duelWithRound(
  t: T,
  round: Partial<Pick<Doc<"duelRounds">, "narration" | "illustrationStatus">>,
  opts: { textOnlyMode?: boolean } = {},
) {
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
  const roundId = await t.run(async (ctx) => {
    if (opts.textOnlyMode) await ctx.db.patch(duelId, { textOnlyMode: true });
    return await ctx.db.insert("duelRounds", {
      duelId,
      roundNumber: 1,
      type: "SPELL_CASTING",
      status: "COMPLETED",
      outcome: {
        narrative: "Sparks fly across the arena.",
        illustrationPrompt: "Two wizards trading lightning",
      },
      ...round,
    });
  });
  return { duelId, roundId };
}

const getRound = (t: T, roundId: Id<"duelRounds">) =>
  t.run((ctx) => ctx.db.get(roundId));

describe("roundMedia.retryRoundIllustration", () => {
  test("a duelist can retry a failed illustration", async () => {
    const t = setup();
    const { roundId } = await duelWithRound(t, {
      illustrationStatus: "FAILED",
    });

    await withAuth(t, "test-user-2").mutation(
      api.roundMedia.retryRoundIllustration,
      { roundId },
    );

    expect((await getRound(t, roundId))?.illustrationStatus).toBe("PENDING");
  });

  test("spectators can't retry", async () => {
    const t = setup();
    const { roundId } = await duelWithRound(t, {
      illustrationStatus: "FAILED",
    });

    await expect(
      withAuth(t, "someone-else").mutation(
        api.roundMedia.retryRoundIllustration,
        { roundId },
      ),
    ).rejects.toThrow("Only the duelists");
    expect((await getRound(t, roundId))?.illustrationStatus).toBe("FAILED");
  });

  test("signed-out users can't retry", async () => {
    const t = setup();
    const { roundId } = await duelWithRound(t, {
      illustrationStatus: "FAILED",
    });

    await expect(
      t.mutation(api.roundMedia.retryRoundIllustration, { roundId }),
    ).rejects.toThrow("Not authenticated");
  });

  test("can't retry an illustration that is in progress", async () => {
    const t = setup();
    const { roundId } = await duelWithRound(t, {
      illustrationStatus: "PENDING",
    });

    await expect(
      withAuth(t, "test-user-1").mutation(
        api.roundMedia.retryRoundIllustration,
        { roundId },
      ),
    ).rejects.toThrow("hasn't failed");
  });

  test("text-only duels have nothing to retry", async () => {
    const t = setup();
    const { roundId } = await duelWithRound(
      t,
      { illustrationStatus: "FAILED" },
      { textOnlyMode: true },
    );

    await expect(
      withAuth(t, "test-user-1").mutation(
        api.roundMedia.retryRoundIllustration,
        { roundId },
      ),
    ).rejects.toThrow("no illustration");
  });
});

describe("roundMedia.retryRoundNarration", () => {
  test("a duelist can retry a failed narration", async () => {
    const t = setup();
    const { roundId } = await duelWithRound(t, {
      narration: { status: "FAILED" },
    });

    // Scheduling is a no-op under test, so this only checks it is allowed.
    await withAuth(t, "test-user-1").mutation(
      api.roundMedia.retryRoundNarration,
      { roundId },
    );
  });

  test("spectators can't retry", async () => {
    const t = setup();
    const { roundId } = await duelWithRound(t, {
      narration: { status: "FAILED" },
    });

    await expect(
      withAuth(t, "someone-else").mutation(api.roundMedia.retryRoundNarration, {
        roundId,
      }),
    ).rejects.toThrow("Only the duelists");
  });

  test("can't retry a narration that hasn't failed", async () => {
    const t = setup();
    const { roundId } = await duelWithRound(t, {
      narration: { status: "PENDING" },
    });

    await expect(
      withAuth(t, "test-user-1").mutation(api.roundMedia.retryRoundNarration, {
        roundId,
      }),
    ).rejects.toThrow("hasn't failed");
  });
});

describe("roundMedia.setRoundIllustrationStatus", () => {
  test("sets and clears the status by round number", async () => {
    const t = setup();
    const { duelId, roundId } = await duelWithRound(t, {});

    await t.mutation(internal.roundMedia.setRoundIllustrationStatus, {
      duelId,
      roundNumber: 1,
      status: "FAILED",
    });
    expect((await getRound(t, roundId))?.illustrationStatus).toBe("FAILED");

    await t.mutation(internal.roundMedia.setRoundIllustrationStatus, {
      duelId,
      roundNumber: 1,
      status: null,
    });
    expect((await getRound(t, roundId))?.illustrationStatus).toBeUndefined();
  });
});
