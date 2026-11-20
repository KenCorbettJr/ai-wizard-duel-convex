import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { withAuth } from "./test_utils";

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
  await t.run(async (ctx) => {
    await ctx.db.insert("duelRounds", {
      duelId,
      roundNumber: 1,
      type: "SPELL_CASTING",
      status: "COMPLETED",
      spells: {
        [wizard1Id]: {
          description: "Fireball",
          castBy: wizard1Id,
          timestamp: 1,
        },
      },
      outcome: { narrative: "The fireball scorches the stands." },
    });
  });
  return { duelId };
}

describe("spell ideas", () => {
  test("context is the caller's wizard against their opponent", async () => {
    const t = setup();
    const { duelId } = await startDuel(t);

    const context = await t.query(internal.spellIdeasData.getSpellIdeaContext, {
      duelId,
      userId: "test-user-2",
    });

    expect(context?.wizard.name).toBe("Saruman");
    expect(context?.opponent.name).toBe("Gandalf");
    expect(context?.lastNarrative).toBe("The fireball scorches the stands.");
    expect(context?.pastSpells).toEqual([]);
  });

  test("context includes the caller's past moves", async () => {
    const t = setup();
    const { duelId } = await startDuel(t);

    const context = await t.query(internal.spellIdeasData.getSpellIdeaContext, {
      duelId,
      userId: "test-user-1",
    });

    expect(context?.pastSpells).toEqual(["Fireball"]);
  });

  test("spectators get no context", async () => {
    const t = setup();
    const { duelId } = await startDuel(t);

    const context = await t.query(internal.spellIdeasData.getSpellIdeaContext, {
      duelId,
      userId: "someone-else",
    });

    expect(context).toBeNull();
  });

  test("a duelist gets three ideas", async () => {
    const t = setup();
    const { duelId } = await startDuel(t);

    const ideas = await withAuth(t, "test-user-1").action(
      api.spellIdeas.suggestSpellIdeas,
      { duelId },
    );

    expect(ideas.length).toBeGreaterThan(0);
    expect(ideas.length).toBeLessThanOrEqual(3);
  });

  test("spectators can't ask for ideas", async () => {
    const t = setup();
    const { duelId } = await startDuel(t);

    await expect(
      withAuth(t, "someone-else").action(api.spellIdeas.suggestSpellIdeas, {
        duelId,
      }),
    ).rejects.toThrow("aren't casting");
  });
});
