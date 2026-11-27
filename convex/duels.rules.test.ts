import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { withAuth } from "./test_utils";

// The server enforces what the create-duel page offers, so a hand-crafted
// request can't get a duel the page wouldn't allow.
async function setup() {
  const t = convexTest(schema, import.meta.glob("./**/*.*s"));
  const ids = await t.run(async (ctx) => {
    await ctx.db.insert("users", {
      clerkId: "alice",
      userId: "alice",
      role: "user",
      imageCredits: 10,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    // Signed up but never picked a username
    await ctx.db.insert("users", {
      clerkId: "nameless",
      role: "user",
      imageCredits: 10,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await ctx.db.insert("users", {
      clerkId: "bob",
      userId: "bob",
      role: "user",
      imageCredits: 10,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const make = (owner: string, name: string) =>
      ctx.db.insert("wizards", { owner, name, description: name });
    return {
      ember: await make("alice", "Ember"),
      ash: await make("alice", "Ash"),
      quiet: await make("nameless", "Quiet"),
      frost: await make("bob", "Frost"),
    };
  });
  return { t, ids, alice: withAuth(t, "alice") };
}

describe("duel creation rules", () => {
  test("only menu lengths are accepted", async () => {
    const { ids, alice } = await setup();
    for (const numberOfRounds of [0, -1, 1, 4, 500, 2.5]) {
      await expect(
        alice.mutation(api.duels.createDuel, {
          numberOfRounds,
          wizards: [ids.ember],
        }),
      ).rejects.toThrow("duel length");
      await expect(
        alice.mutation(api.duels.challengeWizard, {
          wizardId: ids.ember,
          opponentWizardId: ids.frost,
          numberOfRounds,
        }),
      ).rejects.toThrow("duel length");
      await expect(
        alice.mutation(api.duelLobby.joinLobby, {
          wizardId: ids.ember,
          duelType: numberOfRounds,
        }),
      ).rejects.toThrow("duel length");
    }
    for (const numberOfRounds of [3, 5, 10, "TO_THE_DEATH"] as const) {
      await expect(
        alice.mutation(api.duels.createDuel, {
          numberOfRounds,
          wizards: [ids.ember],
        }),
      ).resolves.toBeDefined();
    }
  });

  test("a duel takes exactly one of your wizards", async () => {
    const { ids, alice } = await setup();
    for (const wizards of [[], [ids.ember, ids.ash]]) {
      await expect(
        alice.mutation(api.duels.createDuel, { numberOfRounds: 3, wizards }),
      ).rejects.toThrow("exactly one wizard");
    }
  });

  test("you need a username to create or send a duel", async () => {
    const { t, ids } = await setup();
    const nameless = withAuth(t, "nameless");
    await expect(
      nameless.mutation(api.duels.createDuel, {
        numberOfRounds: 3,
        wizards: [ids.quiet],
      }),
    ).rejects.toThrow("username");
    await expect(
      nameless.mutation(api.duels.challengeWizard, {
        wizardId: ids.quiet,
        opponentWizardId: ids.frost,
        numberOfRounds: 3,
      }),
    ).rejects.toThrow("username");
  });
});
