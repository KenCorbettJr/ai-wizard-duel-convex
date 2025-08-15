import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach } from "vitest";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import schema from "./schema";
import { withAuth } from "./test_utils";

describe("Wizards - Advanced Tests", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema);
  });

  describe("Wizard Creation", () => {
    test("should create wizard with default values", async () => {
      const wizardId = await withAuth(t, "test-user-1").mutation(
        api.wizards.createWizard,
        {
          name: "Test Wizard",
          description: "A test wizard",
        }
      );

      const wizard = await withAuth(t, "test-user-1").query(
        api.wizards.getWizard,
        { wizardId }
      );

      expect(wizard).toMatchObject({
        owner: "test-user-1",
        name: "Test Wizard",
        description: "A test wizard",
        wins: 0,
        losses: 0,
        isAIPowered: false,
      });
      expect(wizard?.illustrationVersion).toBe(1);
    });

    test("should create AI-powered wizard", async () => {
      const wizardId = await withAuth(t, "test-user-1").mutation(
        api.wizards.createWizard,
        {
          name: "AI Wizard",
          description: "An AI-generated wizard",
        }
      );

      // Update to AI-powered using internal function
      await t.run(async (ctx) => {
        await ctx.db.patch(wizardId, { isAIPowered: true });
      });

      const wizard = await withAuth(t, "test-user-1").query(
        api.wizards.getWizard,
        { wizardId }
      );

      expect(wizard?.isAIPowered).toBe(true);
      expect(wizard?.name).toBe("AI Wizard");
    });

    test("should handle wizard creation with special characters", async () => {
      const wizardId = await withAuth(t, "test-user-1").mutation(
        api.wizards.createWizard,
        {
          name: "Wizard™ 🧙‍♂️",
          description: "A wizard with émojis and spëcial characters",
        }
      );

      const wizard = await withAuth(t, "test-user-1").query(
        api.wizards.getWizard,
        { wizardId }
      );

      expect(wizard?.name).toBe("Wizard™ 🧙‍♂️");
      expect(wizard?.description).toBe(
        "A wizard with émojis and spëcial characters"
      );
    });

    test("should handle very long wizard descriptions", async () => {
      const longDescription = "A".repeat(1000);

      const wizardId = await withAuth(t, "test-user-1").mutation(
        api.wizards.createWizard,
        {
          name: "Verbose Wizard",
          description: longDescription,
        }
      );

      const wizard = await withAuth(t, "test-user-1").query(
        api.wizards.getWizard,
        { wizardId }
      );

      expect(wizard?.description).toBe(longDescription);
    });
  });

  describe("Wizard Updates", () => {
    let wizardId: Id<"wizards">;

    beforeEach(async () => {
      wizardId = await withAuth(t, "test-user-1").mutation(
        api.wizards.createWizard,
        {
          name: "Updatable Wizard",
          description: "A wizard that can be updated",
        }
      );
    });

    test("should update wizard name and description", async () => {
      await withAuth(t, "test-user-1").mutation(api.wizards.updateWizard, {
        wizardId,
        name: "Updated Wizard",
        description: "An updated description",
      });

      const wizard = await withAuth(t, "test-user-1").query(
        api.wizards.getWizard,
        { wizardId }
      );

      expect(wizard?.name).toBe("Updated Wizard");
      expect(wizard?.description).toBe("An updated description");
    });

    test("should update only name", async () => {
      const originalWizard = await withAuth(t, "test-user-1").query(
        api.wizards.getWizard,
        { wizardId }
      );

      await withAuth(t, "test-user-1").mutation(api.wizards.updateWizard, {
        wizardId,
        name: "New Name Only",
      });

      const updatedWizard = await withAuth(t, "test-user-1").query(
        api.wizards.getWizard,
        { wizardId }
      );

      expect(updatedWizard?.name).toBe("New Name Only");
      expect(updatedWizard?.description).toBe(originalWizard?.description);
    });

    test("should update only description", async () => {
      const originalWizard = await withAuth(t, "test-user-1").query(
        api.wizards.getWizard,
        { wizardId }
      );

      await withAuth(t, "test-user-1").mutation(api.wizards.updateWizard, {
        wizardId,
        description: "New description only",
      });

      const updatedWizard = await withAuth(t, "test-user-1").query(
        api.wizards.getWizard,
        { wizardId }
      );

      expect(updatedWizard?.name).toBe(originalWizard?.name);
      expect(updatedWizard?.description).toBe("New description only");
    });

    test("should handle updating non-existent wizard", async () => {
      // Create a wizard and then delete it to get a valid but non-existent ID
      const tempId = await t.run(async (ctx) => {
        return await ctx.db.insert("wizards", {
          owner: "temp",
          name: "Temp",
          description: "Temp",
          wins: 0,
          losses: 0,
          isAIPowered: false,
        });
      });

      await t.run(async (ctx) => {
        await ctx.db.delete(tempId);
      });

      await expect(
        withAuth(t, "test-user-1").mutation(api.wizards.updateWizard, {
          wizardId: tempId,
          name: "Should not work",
        })
      ).rejects.toThrow("Wizard not found");
    });

    test("should prevent updating wizard owned by different user", async () => {
      // Create wizard with different user
      const otherUserWizardId = await withAuth(t, "test-user-2").mutation(
        api.wizards.createWizard,
        {
          name: "Other User Wizard",
          description: "Owned by different user",
        }
      );

      await expect(
        withAuth(t, "test-user-1").mutation(api.wizards.updateWizard, {
          wizardId: otherUserWizardId,
          name: "Hacked name",
        })
      ).rejects.toThrow("Not authorized to update this wizard");
    });
  });

  describe("Wizard Stats Management", () => {
    let wizardId: Id<"wizards">;

    beforeEach(async () => {
      wizardId = await withAuth(t, "test-user-1").mutation(
        api.wizards.createWizard,
        {
          name: "Stats Wizard",
          description: "A wizard for testing stats",
        }
      );
    });

    test("should update wizard stats", async () => {
      // Record 3 wins
      await withAuth(t, "test-user-1").mutation(api.wizards.updateWizardStats, {
        wizardId,
        won: true,
      });
      await withAuth(t, "test-user-1").mutation(api.wizards.updateWizardStats, {
        wizardId,
        won: true,
      });
      await withAuth(t, "test-user-1").mutation(api.wizards.updateWizardStats, {
        wizardId,
        won: true,
      });

      // Record 1 loss
      await withAuth(t, "test-user-1").mutation(api.wizards.updateWizardStats, {
        wizardId,
        won: false,
      });

      const wizard = await withAuth(t, "test-user-1").query(
        api.wizards.getWizard,
        { wizardId }
      );

      expect(wizard?.wins).toBe(3);
      expect(wizard?.losses).toBe(1);
    });

    test("should handle multiple stat updates", async () => {
      // Add 5 wins and 3 losses
      for (let i = 0; i < 5; i++) {
        await withAuth(t, "test-user-1").mutation(
          api.wizards.updateWizardStats,
          {
            wizardId,
            won: true,
          }
        );
      }
      for (let i = 0; i < 3; i++) {
        await withAuth(t, "test-user-1").mutation(
          api.wizards.updateWizardStats,
          {
            wizardId,
            won: false,
          }
        );
      }

      const wizard = await withAuth(t, "test-user-1").query(
        api.wizards.getWizard,
        { wizardId }
      );

      expect(wizard?.wins).toBe(5);
      expect(wizard?.losses).toBe(3);
    });

    test("should accumulate stats correctly", async () => {
      // Start with 0 wins and losses, add some wins
      await withAuth(t, "test-user-1").mutation(api.wizards.updateWizardStats, {
        wizardId,
        won: true,
      });
      await withAuth(t, "test-user-1").mutation(api.wizards.updateWizardStats, {
        wizardId,
        won: true,
      });

      const wizard = await withAuth(t, "test-user-1").query(
        api.wizards.getWizard,
        { wizardId }
      );

      expect(wizard?.wins).toBe(2);
      expect(wizard?.losses).toBe(0);
    });

    test("should handle updating stats for non-existent wizard", async () => {
      // Create a wizard and then delete it to get a valid but non-existent ID
      const tempId = await t.run(async (ctx) => {
        return await ctx.db.insert("wizards", {
          owner: "temp",
          name: "Temp",
          description: "Temp",
          wins: 0,
          losses: 0,
          isAIPowered: false,
        });
      });

      await t.run(async (ctx) => {
        await ctx.db.delete(tempId);
      });

      await expect(
        withAuth(t, "test-user-1").mutation(api.wizards.updateWizardStats, {
          wizardId: tempId,
          won: true,
        })
      ).rejects.toThrow("Wizard not found");
    });

    test("should prevent updating stats for wizard owned by different user", async () => {
      // Create wizard with different user
      const otherUserWizardId = await withAuth(t, "test-user-2").mutation(
        api.wizards.createWizard,
        {
          name: "Other User Wizard",
          description: "Owned by different user",
        }
      );

      await expect(
        withAuth(t, "test-user-1").mutation(api.wizards.updateWizardStats, {
          wizardId: otherUserWizardId,
          won: true,
        })
      ).rejects.toThrow("Not authorized to update this wizard");
    });
  });

  describe("Wizard Queries", () => {
    let user1Wizards: Id<"wizards">[];
    let user2Wizards: Id<"wizards">[];

    beforeEach(async () => {
      // Create wizards for user 1
      user1Wizards = await Promise.all([
        withAuth(t, "test-user-1").mutation(api.wizards.createWizard, {
          name: "Wizard A",
          description: "First wizard",
        }),
        withAuth(t, "test-user-1").mutation(api.wizards.createWizard, {
          name: "Wizard B",
          description: "Second wizard",
        }),
        withAuth(t, "test-user-1").mutation(api.wizards.createWizard, {
          name: "Wizard C",
          description: "Third wizard",
        }),
      ]);

      // Create wizards for user 2
      user2Wizards = await Promise.all([
        withAuth(t, "test-user-2").mutation(api.wizards.createWizard, {
          name: "Wizard X",
          description: "User2's first wizard",
        }),
        withAuth(t, "test-user-2").mutation(api.wizards.createWizard, {
          name: "Wizard Y",
          description: "User2's second wizard",
        }),
      ]);

      // Update some stats
      await t.run(async (ctx) => {
        await ctx.db.patch(user1Wizards[0], { wins: 10, losses: 2 });
        await ctx.db.patch(user1Wizards[1], {
          wins: 5,
          losses: 5,
          isAIPowered: true,
        });
        await ctx.db.patch(user1Wizards[2], { wins: 0, losses: 8 });
        await ctx.db.patch(user2Wizards[0], { wins: 15, losses: 1 });
        await ctx.db.patch(user2Wizards[1], {
          wins: 3,
          losses: 7,
          isAIPowered: true,
        });
      });
    });

    test("should get all wizards for user1", async () => {
      const wizards = await withAuth(t, "test-user-1").query(
        api.wizards.getUserWizards,
        {}
      );

      expect(wizards).toHaveLength(3);
      expect(wizards.map((w) => w._id)).toEqual(
        expect.arrayContaining(user1Wizards)
      );
      expect(wizards.every((w) => w.owner === "test-user-1")).toBe(true);
    });

    test("should get all wizards for user2", async () => {
      const wizards = await withAuth(t, "test-user-2").query(
        api.wizards.getUserWizards,
        {}
      );

      expect(wizards).toHaveLength(2);
      expect(wizards.map((w) => w._id)).toEqual(
        expect.arrayContaining(user2Wizards)
      );
      expect(wizards.every((w) => w.owner === "test-user-2")).toBe(true);
    });

    test("should return empty array for user with no wizards", async () => {
      const wizards = await withAuth(t, "test-user-3").query(
        api.wizards.getUserWizards,
        {}
      );

      expect(wizards).toEqual([]);
    });

    test("should get specific wizard by ID", async () => {
      const wizard = await withAuth(t, "test-user-1").query(
        api.wizards.getWizard,
        {
          wizardId: user1Wizards[0],
        }
      );

      expect(wizard?._id).toBe(user1Wizards[0]);
      expect(wizard?.name).toBe("Wizard A");
      expect(wizard?.owner).toBe("test-user-1");
    });

    test("should not return wizard owned by different user", async () => {
      await expect(
        withAuth(t, "test-user-1").query(api.wizards.getWizard, {
          wizardId: user2Wizards[0],
        })
      ).rejects.toThrow("Not authorized to access this wizard");
    });

    test("should verify wizard ownership isolation", async () => {
      const user1Wizards = await withAuth(t, "test-user-1").query(
        api.wizards.getUserWizards,
        {}
      );
      const user2Wizards = await withAuth(t, "test-user-2").query(
        api.wizards.getUserWizards,
        {}
      );

      const user1Ids = user1Wizards.map((w) => w._id);
      const user2Ids = user2Wizards.map((w) => w._id);

      expect(user1Ids.some((id) => user2Ids.includes(id))).toBe(false);
      expect(user2Ids.some((id) => user1Ids.includes(id))).toBe(false);
    });
  });

  describe("Wizard Deletion", () => {
    let wizardId: Id<"wizards">;

    beforeEach(async () => {
      wizardId = await withAuth(t, "test-user-1").mutation(
        api.wizards.createWizard,
        {
          name: "Deletable Wizard",
          description: "A wizard that can be deleted",
        }
      );
    });

    test("should delete wizard successfully", async () => {
      await withAuth(t, "test-user-1").mutation(api.wizards.deleteWizard, {
        wizardId,
      });

      const wizard = await withAuth(t, "test-user-1").query(
        api.wizards.getWizard,
        {
          wizardId,
        }
      );

      expect(wizard).toBeNull();
    });

    test("should handle deleting non-existent wizard gracefully", async () => {
      // Create a wizard and then delete it to get a valid but non-existent ID
      const tempId = await t.run(async (ctx) => {
        return await ctx.db.insert("wizards", {
          owner: "temp",
          name: "Temp",
          description: "Temp",
          wins: 0,
          losses: 0,
          isAIPowered: false,
        });
      });

      await t.run(async (ctx) => {
        await ctx.db.delete(tempId);
      });

      await expect(
        withAuth(t, "test-user-1").mutation(api.wizards.deleteWizard, {
          wizardId: tempId,
        })
      ).resolves.not.toThrow();
    });

    test("should prevent deleting wizard owned by different user", async () => {
      // Create wizard with different user
      const otherUserWizardId = await withAuth(t, "test-user-2").mutation(
        api.wizards.createWizard,
        {
          name: "Other User Wizard",
          description: "Owned by different user",
        }
      );

      await expect(
        withAuth(t, "test-user-1").mutation(api.wizards.deleteWizard, {
          wizardId: otherUserWizardId,
        })
      ).rejects.toThrow("Not authorized to delete this wizard");
    });
  });

  describe("Wizard Illustration Management", () => {
    let wizardId: Id<"wizards">;

    beforeEach(async () => {
      wizardId = await withAuth(t, "test-user-1").mutation(
        api.wizards.createWizard,
        {
          name: "Illustrated Wizard",
          description: "A wizard with illustrations",
        }
      );
    });

    test("should regenerate wizard illustration", async () => {
      const originalWizard = await withAuth(t, "test-user-1").query(
        api.wizards.getWizard,
        {
          wizardId,
        }
      );

      await withAuth(t, "test-user-1").mutation(
        api.wizards.regenerateIllustration,
        {
          wizardId,
        }
      );

      const updatedWizard = await withAuth(t, "test-user-1").query(
        api.wizards.getWizard,
        {
          wizardId,
        }
      );

      expect(updatedWizard?.illustrationVersion).toBeGreaterThan(
        originalWizard?.illustrationVersion || 0
      );
    });

    test("should handle regeneration for non-existent wizard", async () => {
      // Create a wizard and then delete it to get a valid but non-existent ID
      const tempId = await t.run(async (ctx) => {
        return await ctx.db.insert("wizards", {
          owner: "temp",
          name: "Temp",
          description: "Temp",
          wins: 0,
          losses: 0,
          isAIPowered: false,
        });
      });

      await t.run(async (ctx) => {
        await ctx.db.delete(tempId);
      });

      await expect(
        withAuth(t, "test-user-1").mutation(
          api.wizards.regenerateIllustration,
          {
            wizardId: tempId,
          }
        )
      ).rejects.toThrow("Wizard not found");
    });

    test("should prevent regenerating illustration for wizard owned by different user", async () => {
      // Create wizard with different user
      const otherUserWizardId = await withAuth(t, "test-user-2").mutation(
        api.wizards.createWizard,
        {
          name: "Other User Wizard",
          description: "Owned by different user",
        }
      );

      await expect(
        withAuth(t, "test-user-1").mutation(
          api.wizards.regenerateIllustration,
          {
            wizardId: otherUserWizardId,
          }
        )
      ).rejects.toThrow(
        "Not authorized to regenerate illustration for this wizard"
      );
    });
  });

  describe("Data Integrity", () => {
    test("should handle concurrent wizard creation", async () => {
      const wizardPromises = Array.from({ length: 5 }, (_, i) =>
        withAuth(t, "test-user-1").mutation(api.wizards.createWizard, {
          name: `Concurrent Wizard ${i}`,
          description: `Description ${i}`,
        })
      );

      const wizardIds = await Promise.all(wizardPromises);

      expect(wizardIds).toHaveLength(5);
      expect(new Set(wizardIds).size).toBe(5); // All IDs should be unique

      const wizards = await withAuth(t, "test-user-1").query(
        api.wizards.getUserWizards,
        {}
      );
      expect(wizards).toHaveLength(5);
    });

    test("should handle concurrent stat updates correctly", async () => {
      const wizardId = await withAuth(t, "test-user-1").mutation(
        api.wizards.createWizard,
        {
          name: "Concurrent Stats Wizard",
          description: "For testing concurrent updates",
        }
      );

      // Perform multiple concurrent stat updates
      const updatePromises = Array.from({ length: 10 }, () =>
        withAuth(t, "test-user-1").mutation(api.wizards.updateWizardStats, {
          wizardId,
          won: true,
        })
      );

      await Promise.all(updatePromises);

      const wizard = await withAuth(t, "test-user-1").query(
        api.wizards.getWizard,
        {
          wizardId,
        }
      );

      expect(wizard?.wins).toBe(10);
      expect(wizard?.losses).toBe(0);
    });

    test("should maintain data consistency during updates", async () => {
      const wizardId = await withAuth(t, "test-user-1").mutation(
        api.wizards.createWizard,
        {
          name: "Consistency Wizard",
          description: "For testing data consistency",
        }
      );

      // Perform mixed updates
      await withAuth(t, "test-user-1").mutation(api.wizards.updateWizard, {
        wizardId,
        name: "Updated Name",
      });

      // Add 5 wins and 2 losses
      for (let i = 0; i < 5; i++) {
        await withAuth(t, "test-user-1").mutation(
          api.wizards.updateWizardStats,
          {
            wizardId,
            won: true,
          }
        );
      }
      for (let i = 0; i < 2; i++) {
        await withAuth(t, "test-user-1").mutation(
          api.wizards.updateWizardStats,
          {
            wizardId,
            won: false,
          }
        );
      }

      await withAuth(t, "test-user-1").mutation(
        api.wizards.regenerateIllustration,
        {
          wizardId,
        }
      );

      const wizard = await withAuth(t, "test-user-1").query(
        api.wizards.getWizard,
        {
          wizardId,
        }
      );

      expect(wizard?.name).toBe("Updated Name");
      expect(wizard?.wins).toBe(5);
      expect(wizard?.losses).toBe(2);
      expect(wizard?.illustrationVersion).toBeGreaterThan(1);
    });
  });
});
