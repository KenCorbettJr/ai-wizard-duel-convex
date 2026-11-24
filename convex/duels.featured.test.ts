import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { withAuth } from "./test_utils";

test("the featured image follows the teaser round and drops the final blow", async () => {
  const t = convexTest(schema, import.meta.glob("./**/*.*s"));
  const [w1, w2] = await t.run(async (ctx) => [
    await ctx.db.insert("wizards", {
      owner: "u1",
      name: "A",
      description: "A",
    }),
    await ctx.db.insert("wizards", {
      owner: "u2",
      name: "B",
      description: "B",
    }),
  ]);
  const duelId = await withAuth(t, "u1").mutation(api.duels.createDuel, {
    numberOfRounds: 5,
    wizards: [w1],
  });
  await withAuth(t, "u2").mutation(api.duels.joinDuel, {
    duelId,
    wizards: [w2],
  });
  const roundIds = await t.run(async (ctx) => {
    await ctx.db.patch(duelId, { status: "IN_PROGRESS", currentRound: 3 });
    const ids = [];
    for (const roundNumber of [0, 1, 2]) {
      ids.push(
        await ctx.db.insert("duelRounds", {
          duelId,
          roundNumber,
          type: "SPELL_CASTING",
          status: "COMPLETED",
        }),
      );
    }
    return ids;
  });
  const featured = async () =>
    (await t.run((ctx) => ctx.db.get(duelId)))?.featuredIllustration;

  for (const [i, roundId] of roundIds.entries()) {
    await t.mutation(internal.duels.updateRoundIllustration, {
      roundId,
      illustration: `img-${i}`,
    });
  }
  expect(await featured()).toBe("img-2");

  // Round 2 is now the last round of a finished duel: it shows the ending
  await withAuth(t, "u1").mutation(api.duels.forfeitDuel, { duelId });
  expect(await featured()).toBe("img-1");
});
