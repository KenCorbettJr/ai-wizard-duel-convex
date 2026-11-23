import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";
import { withAuth } from "./test_utils";
import { labelDuplicateNames, normalizeWizardName } from "./lib/wizardNames";

function setup() {
  return convexTest(schema, import.meta.glob("./**/*.*s"));
}

const create = (t: ReturnType<typeof setup>, user: string, name: string) =>
  withAuth(t, user).mutation(internal.wizards.createWizard, {
    name,
    description: "A wizard",
  });

describe("wizard names are unique within one player's roster", () => {
  test("rejects a second wizard with the same name, ignoring case and spaces", async () => {
    const t = setup();
    await create(t, "ken", "Frostfire");
    await expect(create(t, "ken", "  frostFIRE ")).rejects.toThrow(
      /already have a wizard named "Frostfire"/,
    );
  });

  test("different players may share a name", async () => {
    const t = setup();
    await create(t, "ken", "Frostfire");
    await expect(create(t, "sam", "Frostfire")).resolves.toBeDefined();
  });

  test("renaming onto another of your wizards is rejected; keeping your own name is fine", async () => {
    const t = setup();
    await create(t, "ken", "Frostfire");
    const other = await create(t, "ken", "Stormcaller");

    await expect(
      withAuth(t, "ken").mutation(internal.wizards.updateWizard, {
        wizardId: other,
        name: "FROSTFIRE",
      }),
    ).rejects.toThrow(/already have a wizard/);

    await expect(
      withAuth(t, "ken").mutation(internal.wizards.updateWizard, {
        wizardId: other,
        name: "stormcaller",
        description: "Now with more thunder",
      }),
    ).resolves.toBeNull();
  });
});

test("wizards that already share a name can still be edited", async () => {
  const t = setup();
  const [a] = await t.run(async (ctx) => [
    await ctx.db.insert("wizards", {
      owner: "ken",
      name: "Twin",
      description: "",
    }),
    await ctx.db.insert("wizards", {
      owner: "ken",
      name: "Twin",
      description: "",
    }),
  ]);
  await expect(
    withAuth(t, "ken").mutation(internal.wizards.updateWizard, {
      wizardId: a,
      name: "Twin",
      description: "Edited",
    }),
  ).resolves.toBeNull();
  await expect(
    t.query(internal.wizards.assertNameFreeForOwner, {
      owner: "ken",
      name: "twin",
      exceptId: a,
    }),
  ).resolves.toBeNull();
});

describe("labelDuplicateNames", () => {
  const owner = (w: { owner?: string }) => w.owner;

  test("leaves unique names, and nulls, untouched (same objects)", () => {
    const a = { name: "Frostfire", owner: "Ken" };
    const b = { name: "Stormcaller", owner: "Sam" };
    const out = labelDuplicateNames([a, b, null, undefined], owner);
    expect(out[0]).toBe(a);
    expect(out[1]).toBe(b);
    expect(out[2]).toBeNull();
    expect(out[3]).toBeUndefined();
  });

  test("adds the owner to shared names", () => {
    const out = labelDuplicateNames(
      [
        { name: "Frostfire", owner: "Ken" },
        { name: "frostfire", owner: "Sam" },
      ],
      owner,
    );
    expect(out.map((w) => w?.name)).toEqual([
      "Frostfire (Ken)",
      "frostfire (Sam)",
    ]);
  });

  test("falls back to player numbers when owners are missing or the same", () => {
    const out = labelDuplicateNames(
      [
        { name: "Frostfire", owner: "Ken" },
        { name: "Frostfire", owner: "ken" },
      ],
      owner,
    );
    expect(out.map((w) => w?.name)).toEqual([
      "Frostfire (Player 1)",
      "Frostfire (Player 2)",
    ]);
  });

  test("normalizes case and whitespace", () => {
    expect(normalizeWizardName("  Frost   Fire ")).toBe("frost fire");
  });
});

const user = (clerkId: string, displayName: string) => ({
  clerkId,
  role: "user" as const,
  displayName,
  subscriptionTier: "FREE" as const,
  subscriptionStatus: "ACTIVE" as const,
  imageCredits: 0,
  monthlyUsage: {
    duelsPlayed: 0,
    wizardsCreated: 0,
    imageGenerations: 0,
    adsWatched: 0,
    resetDate: 0,
  },
  createdAt: 0,
  updatedAt: 0,
});

describe("getDuelWizardNames", () => {
  test("labels same-named wizards with their owner's display name", async () => {
    const t = setup();
    const ids = await t.run(async (ctx) => {
      await ctx.db.insert("users", user("ken", "Ken"));
      await ctx.db.insert("users", user("sam", "Sam"));
      return [
        await ctx.db.insert("wizards", {
          owner: "ken",
          name: "Frostfire",
          description: "",
        }),
        await ctx.db.insert("wizards", {
          owner: "sam",
          name: "Frostfire",
          description: "",
        }),
      ];
    });
    expect(
      await t.query(internal.wizards.getDuelWizardNames, { wizardIds: ids }),
    ).toEqual(["Frostfire (Ken)", "Frostfire (Sam)"]);
  });
});
