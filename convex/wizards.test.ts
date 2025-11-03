import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { withAuth } from "./test_utils";

describe("Wizards", () => {
  test("should create and get a wizard", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.*s"));

    // Create wizard directly in database to avoid scheduled functions
    const wizardId = await t.run(async (ctx) => {
      return await ctx.db.insert("wizards", {
        owner: "test-user-1",
        name: "Gandalf",
        description: "A wise wizard with a long beard",
        wins: 0,
        losses: 0,
        illustrationVersion: 1,
        isAIPowered: false,
      });
    });

    const wizard = await withAuth(t).query(api.wizards.getWizard, { wizardId });

    expect(wizard).toMatchObject({
      owner: "test-user-1",
      name: "Gandalf",
      description: "A wise wizard with a long beard",
      wins: 0,
      losses: 0,
      illustrationVersion: 1,
      isAIPowered: false,
    });
  });

  test("should get all wizards for a user", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.*s"));

    // Create wizards directly in database
    const wizard1Id = await t.run(async (ctx) => {
      return await ctx.db.insert("wizards", {
        owner: "test-user-1",
        name: "Gandalf",
        description: "A wise wizard",
        wins: 0,
        losses: 0,
        isAIPowered: false,
      });
    });

    const wizard2Id = await t.run(async (ctx) => {
      return await ctx.db.insert("wizards", {
        owner: "test-user-1",
        name: "Merlin",
        description: "A powerful wizard",
        wins: 0,
        losses: 0,
        isAIPowered: false,
      });
    });

    // Create wizard for different user
    await t.run(async (ctx) => {
      return await ctx.db.insert("wizards", {
        owner: "test-user-2",
        name: "Dumbledore",
        description: "Headmaster wizard",
        wins: 0,
        losses: 0,
        isAIPowered: false,
      });
    });

    const userWizards = await withAuth(t, "test-user-1").query(
      api.wizards.getUserWizards,
      {}
    );

    expect(userWizards).toHaveLength(2);
    expect(userWizards.map((w) => w._id)).toContain(wizard1Id);
    expect(userWizards.map((w) => w._id)).toContain(wizard2Id);
  });

  test("should update wizard stats correctly", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.*s"));

    const wizardId = await t.run(async (ctx) => {
      return await ctx.db.insert("wizards", {
        owner: "test-user-1",
        name: "Gandalf",
        description: "A wise wizard",
        wins: 0,
        losses: 0,
        isAIPowered: false,
      });
    });

    // Win a battle
    await withAuth(t).mutation(api.wizards.updateWizardStats, {
      wizardId,
      won: true,
    });

    let wizard = await withAuth(t).query(api.wizards.getWizard, { wizardId });
    expect(wizard?.wins).toBe(1);
    expect(wizard?.losses).toBe(0);

    // Lose a battle
    await withAuth(t).mutation(api.wizards.updateWizardStats, {
      wizardId,
      won: false,
    });

    wizard = await withAuth(t).query(api.wizards.getWizard, { wizardId });
    expect(wizard?.wins).toBe(1);
    expect(wizard?.losses).toBe(1);
  });

  test("should delete a wizard", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.*s"));

    const wizardId = await t.run(async (ctx) => {
      return await ctx.db.insert("wizards", {
        owner: "test-user-1",
        name: "Gandalf",
        description: "A wise wizard",
        wins: 0,
        losses: 0,
        isAIPowered: false,
      });
    });

    let wizard = await withAuth(t).query(api.wizards.getWizard, { wizardId });
    expect(wizard).toBeTruthy();

    await withAuth(t).mutation(api.wizards.deleteWizard, { wizardId });

    wizard = await withAuth(t).query(api.wizards.getWizard, { wizardId });
    expect(wizard).toBeNull();
  });
});
