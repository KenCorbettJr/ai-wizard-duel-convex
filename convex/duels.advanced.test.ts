import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach } from "vitest";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import schema from "./schema";
import { withAuth } from "./test_utils";

describe("Duels - Advanced Tests", () => {
  let t: ReturnType<typeof convexTest>;
  let wizard1Id: Id<"wizards">;
  let wizard2Id: Id<"wizards">;
  let wizard3Id: Id<"wizards">;

  beforeEach(async () => {
    t = convexTest(schema, import.meta.glob("./**/*.*s"));

    // Create test wizards
    wizard1Id = await withAuth(t, "test-user-1").mutation(
      api.wizards.createWizard,
      {
        name: "Gandalf",
        description: "A wise wizard",
      }
    );

    wizard2Id = await withAuth(t, "test-user-1").mutation(
      api.wizards.createWizard,
      {
        name: "Saruman",
        description: "A powerful wizard",
      }
    );

    wizard3Id = await withAuth(t, "test-user-1").mutation(
      api.wizards.createWizard,
      {
        name: "Merlin",
        description: "An ancient wizard",
      }
    );

    // Update stats using internal function
    await t.run(async (ctx) => {
      await ctx.db.patch(wizard1Id, { wins: 5, losses: 2 });
      await ctx.db.patch(wizard2Id, { wins: 3, losses: 4 });
      await ctx.db.patch(wizard3Id, { wins: 10, losses: 1, isAIPowered: true });
    });
  });

  describe("Duel Creation Edge Cases", () => {
    test("should handle TO_THE_DEATH duel type", async () => {
      const duelId = await withAuth(t, "test-user-1").mutation(
        api.duels.createDuel,
        {
          numberOfRounds: "TO_THE_DEATH",
          wizards: [wizard1Id, wizard2Id],
        }
      );

      const duel = await withAuth(t, "test-user-1").query(api.duels.getDuel, {
        duelId,
      });
      expect(duel?.numberOfRounds).toBe("TO_THE_DEATH");
    });

    test("should generate unique shortcodes for multiple duels", async () => {
      const duelIds = await Promise.all([
        withAuth(t, "test-user-1").mutation(api.duels.createDuel, {
          numberOfRounds: 3,
          wizards: [wizard1Id, wizard2Id],
        }),
        withAuth(t, "test-user-1").mutation(api.duels.createDuel, {
          numberOfRounds: 5,
          wizards: [wizard2Id, wizard3Id],
        }),
        withAuth(t, "test-user-1").mutation(api.duels.createDuel, {
          numberOfRounds: 2,
          wizards: [wizard1Id, wizard3Id],
        }),
      ]);

      const duels = await Promise.all(
        duelIds.map((id) =>
          withAuth(t, "test-user-1").query(api.duels.getDuel, { duelId: id })
        )
      );

      const shortcodes = duels.map((d) => d?.shortcode);
      const uniqueShortcodes = new Set(shortcodes);

      expect(uniqueShortcodes.size).toBe(3);
      shortcodes.forEach((code) => {
        expect(code).toHaveLength(6);
        expect(code).toMatch(/^[A-Z0-9]{6}$/);
      });
    });

    test("should initialize points and hit points correctly for multiple wizards", async () => {
      const duelId = await withAuth(t, "test-user-1").mutation(
        api.duels.createDuel,
        {
          numberOfRounds: 3,
          wizards: [wizard1Id, wizard2Id, wizard3Id],
        }
      );

      const duel = await withAuth(t, "test-user-1").query(api.duels.getDuel, {
        duelId,
      });

      expect(duel?.points[wizard1Id]).toBe(0);
      expect(duel?.points[wizard2Id]).toBe(0);
      expect(duel?.points[wizard3Id]).toBe(0);
      expect(duel?.hitPoints[wizard1Id]).toBe(100);
      expect(duel?.hitPoints[wizard2Id]).toBe(100);
      expect(duel?.hitPoints[wizard3Id]).toBe(100);
      expect(duel?.needActionsFrom).toEqual([wizard1Id, wizard2Id, wizard3Id]);
    });
  });

  describe("Duel Joining", () => {
    test("should successfully join a duel", async () => {
      // Create wizards for different users
      const user2Wizard = await withAuth(t, "test-user-2").mutation(
        api.wizards.createWizard,
        {
          name: "User2 Wizard",
          description: "A wizard owned by user 2",
        }
      );

      const duelId = await withAuth(t, "test-user-1").mutation(
        api.duels.createDuel,
        {
          numberOfRounds: 3,
          wizards: [wizard1Id],
        }
      );

      await withAuth(t, "test-user-2").mutation(api.duels.joinDuel, {
        duelId,
        wizards: [user2Wizard],
      });

      const duel = await withAuth(t, "test-user-1").query(api.duels.getDuel, {
        duelId,
      });
      expect(duel?.players).toContain("test-user-2");
      expect(duel?.wizards).toContain(user2Wizard);
      expect(duel?.points[user2Wizard]).toBe(0);
      expect(duel?.hitPoints[user2Wizard]).toBe(100);
    });

    test("should prevent joining a duel that's not waiting for players", async () => {
      // Create a wizard for test-user-2
      const user2WizardId = await withAuth(t, "test-user-2").mutation(
        api.wizards.createWizard,
        {
          name: "User2 Wizard",
          description: "A wizard for user 2",
        }
      );

      const duelId = await withAuth(t, "test-user-1").mutation(
        api.duels.createDuel,
        {
          numberOfRounds: 3,
          wizards: [wizard1Id, wizard2Id],
        }
      );

      // Change status to IN_PROGRESS
      await t.run(async (ctx) => {
        await ctx.db.patch(duelId, { status: "IN_PROGRESS" });
      });

      await expect(
        withAuth(t, "test-user-2").mutation(api.duels.joinDuel, {
          duelId,
          wizards: [user2WizardId],
        })
      ).rejects.toThrow("Duel is not accepting new players");
    });

    test("should prevent duplicate player joining", async () => {
      const duelId = await withAuth(t, "test-user-1").mutation(
        api.duels.createDuel,
        {
          numberOfRounds: 3,
          wizards: [wizard1Id],
        }
      );

      await expect(
        withAuth(t, "test-user-1").mutation(api.duels.joinDuel, {
          duelId,
          wizards: [wizard2Id],
        })
      ).rejects.toThrow("User is already in this duel");
    });

    test("should handle joining with multiple wizards", async () => {
      // Create wizards for different users
      const user2Wizard1 = await withAuth(t, "test-user-2").mutation(
        api.wizards.createWizard,
        {
          name: "User2 Wizard 1",
          description: "First wizard owned by user 2",
        }
      );

      const user2Wizard2 = await withAuth(t, "test-user-2").mutation(
        api.wizards.createWizard,
        {
          name: "User2 Wizard 2",
          description: "Second wizard owned by user 2",
        }
      );

      const duelId = await withAuth(t, "test-user-1").mutation(
        api.duels.createDuel,
        {
          numberOfRounds: 3,
          wizards: [wizard1Id],
        }
      );

      await withAuth(t, "test-user-2").mutation(api.duels.joinDuel, {
        duelId,
        wizards: [user2Wizard1, user2Wizard2],
      });

      const duel = await withAuth(t, "test-user-1").query(api.duels.getDuel, {
        duelId,
      });
      expect(duel?.wizards).toContain(user2Wizard1);
      expect(duel?.wizards).toContain(user2Wizard2);
      expect(duel?.points[user2Wizard1]).toBe(0);
      expect(duel?.points[user2Wizard2]).toBe(0);
    });

    test("should remain in WAITING_FOR_PLAYERS status when 2 players join (auto-start scheduled)", async () => {
      // Create wizards for different users
      const user2Wizard = await withAuth(t, "test-user-2").mutation(
        api.wizards.createWizard,
        {
          name: "User2 Wizard",
          description: "A wizard owned by user 2",
        }
      );

      const duelId = await withAuth(t, "test-user-1").mutation(
        api.duels.createDuel,
        {
          numberOfRounds: 3,
          wizards: [wizard1Id],
        }
      );

      await withAuth(t, "test-user-2").mutation(api.duels.joinDuel, {
        duelId,
        wizards: [user2Wizard],
      });

      const duel = await withAuth(t, "test-user-1").query(api.duels.getDuel, {
        duelId,
      });

      // Should still be waiting for players (auto-start is scheduled but not immediate)
      expect(duel?.status).toBe("WAITING_FOR_PLAYERS");
      expect(duel?.players).toHaveLength(2);
    });
  });

  describe("Spell Casting", () => {
    test("should allow casting spells when duel is in progress", async () => {
      const duelId = await withAuth(t, "test-user-1").mutation(
        api.duels.createDuel,
        {
          numberOfRounds: 3,
          wizards: [wizard1Id, wizard2Id],
        }
      );

      // Start the duel manually
      await t.run(async (ctx) => {
        await ctx.db.patch(duelId, { status: "IN_PROGRESS" });
      });

      // Create a round for spell casting
      const roundId = await t.run(async (ctx) => {
        return await ctx.db.insert("duelRounds", {
          duelId,
          roundNumber: 1,
          type: "SPELL_CASTING",
          status: "WAITING_FOR_SPELLS",
          spells: {},
        });
      });

      await withAuth(t, "test-user-1").mutation(api.duels.castSpell, {
        duelId,
        wizardId: wizard1Id,
        spellDescription: "Fireball of destruction",
      });

      const round = await t.run(async (ctx) => {
        return await ctx.db.get(roundId);
      });

      expect(round?.spells[wizard1Id]).toBeDefined();
      expect(round?.spells[wizard1Id]?.description).toBe(
        "Fireball of destruction"
      );
    });

    test("should prevent casting spells when duel is not in progress", async () => {
      const duelId = await withAuth(t, "test-user-1").mutation(
        api.duels.createDuel,
        {
          numberOfRounds: 3,
          wizards: [wizard1Id, wizard2Id],
        }
      );

      // Duel is still WAITING_FOR_PLAYERS
      await expect(
        withAuth(t, "test-user-1").mutation(api.duels.castSpell, {
          duelId,
          wizardId: wizard1Id,
          spellDescription: "Premature spell",
        })
      ).rejects.toThrow("Duel is not in progress");
    });

    test("should prevent casting spells when round is not waiting for spells", async () => {
      const duelId = await withAuth(t, "test-user-1").mutation(
        api.duels.createDuel,
        {
          numberOfRounds: 3,
          wizards: [wizard1Id, wizard2Id],
        }
      );

      // Start the duel manually
      await t.run(async (ctx) => {
        await ctx.db.patch(duelId, { status: "IN_PROGRESS" });
      });

      // Create a completed round
      await t.run(async (ctx) => {
        await ctx.db.insert("duelRounds", {
          duelId,
          roundNumber: 1,
          type: "SPELL_CASTING",
          status: "COMPLETED",
          spells: {},
        });
      });

      await expect(
        withAuth(t, "test-user-1").mutation(api.duels.castSpell, {
          duelId,
          wizardId: wizard1Id,
          spellDescription: "Late spell",
        })
      ).rejects.toThrow("Round is not accepting spells");
    });

    test("should prevent casting spells with wizards not in duel", async () => {
      const outsideWizard = await withAuth(t, "test-user-2").mutation(
        api.wizards.createWizard,
        {
          name: "Outside Wizard",
          description: "Not in this duel",
        }
      );

      const duelId = await withAuth(t, "test-user-1").mutation(
        api.duels.createDuel,
        {
          numberOfRounds: 3,
          wizards: [wizard1Id, wizard2Id],
        }
      );

      // Start the duel manually
      await t.run(async (ctx) => {
        await ctx.db.patch(duelId, { status: "IN_PROGRESS" });
      });

      // Create a round for spell casting
      await t.run(async (ctx) => {
        await ctx.db.insert("duelRounds", {
          duelId,
          roundNumber: 1,
          type: "SPELL_CASTING",
          status: "WAITING_FOR_SPELLS",
          spells: {},
        });
      });

      await expect(
        withAuth(t, "test-user-2").mutation(api.duels.castSpell, {
          duelId,
          wizardId: outsideWizard,
          spellDescription: "Unauthorized spell",
        })
      ).rejects.toThrow("Wizard is not participating in this duel");
    });

    test("should prevent duplicate spell casting in same round", async () => {
      const duelId = await withAuth(t, "test-user-1").mutation(
        api.duels.createDuel,
        {
          numberOfRounds: 3,
          wizards: [wizard1Id, wizard2Id],
        }
      );

      // Start the duel manually
      await t.run(async (ctx) => {
        await ctx.db.patch(duelId, { status: "IN_PROGRESS" });
      });

      // Create a round for spell casting
      await t.run(async (ctx) => {
        await ctx.db.insert("duelRounds", {
          duelId,
          roundNumber: 1,
          type: "SPELL_CASTING",
          status: "WAITING_FOR_SPELLS",
          spells: {},
        });
      });

      // Cast first spell
      await withAuth(t, "test-user-1").mutation(api.duels.castSpell, {
        duelId,
        wizardId: wizard1Id,
        spellDescription: "First spell",
      });

      // Try to cast second spell with same wizard
      await expect(
        withAuth(t, "test-user-1").mutation(api.duels.castSpell, {
          duelId,
          wizardId: wizard1Id,
          spellDescription: "Second spell",
        })
      ).rejects.toThrow("Wizard has already cast a spell this round");
    });
  });

  describe("Duel Status Management", () => {
    test("should handle duel cancellation", async () => {
      const duelId = await withAuth(t, "test-user-1").mutation(
        api.duels.createDuel,
        {
          numberOfRounds: 3,
          wizards: [wizard1Id, wizard2Id],
        }
      );

      await withAuth(t, "test-user-1").mutation(api.duels.cancelDuel, {
        duelId,
      });

      const duel = await withAuth(t, "test-user-1").query(api.duels.getDuel, {
        duelId,
      });
      expect(duel?.status).toBe("CANCELLED");
    });

    test("should prevent actions on cancelled duels", async () => {
      const duelId = await withAuth(t, "test-user-1").mutation(
        api.duels.createDuel,
        {
          numberOfRounds: 3,
          wizards: [wizard1Id, wizard2Id],
        }
      );

      await withAuth(t, "test-user-1").mutation(api.duels.cancelDuel, {
        duelId,
      });

      // Try to cast spell on cancelled duel
      await expect(
        withAuth(t, "test-user-1").mutation(api.duels.castSpell, {
          duelId,
          wizardId: wizard1Id,
          spellDescription: "Spell on cancelled duel",
        })
      ).rejects.toThrow("Duel is not in progress");
    });
  });
});
