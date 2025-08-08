import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { Id } from "./_generated/dataModel";
import { generateTestId } from "./test_utils";

describe("Wizards - Advanced Tests", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema);
  });

  describe("Wizard Creation", () => {
    test("should create wizard with default values", async () => {
      const wizardId = await t.run(async (ctx) => {
        return await ctx.db.insert("wizards", {
          owner: "user123",
          name: "Test Wizard",
          description: "A test wizard",
          wins: 0,
          losses: 0,
          isAIPowered: false,
        });
      });

      const wizard = await t.query(api.wizards.getWizard, { wizardId });

      expect(wizard).toMatchObject({
        owner: "user123",
        name: "Test Wizard",
        description: "A test wizard",
        wins: 0,
        losses: 0,
        isAIPowered: false,
      });
      expect(wizard?.illustrationVersion).toBeUndefined();
      expect(wizard?.illustrationGeneratedAt).toBeUndefined();
    });

    test("should create AI-powered wizard", async () => {
      const wizardId = await t.run(async (ctx) => {
        return await ctx.db.insert("wizards", {
          owner: "ai-system",
          name: "AI Wizard",
          description: "An AI-generated wizard",
          wins: 0,
          losses: 0,
          isAIPowered: true,
        });
      });

      const wizard = await t.query(api.wizards.getWizard, { wizardId });
      expect(wizard?.isAIPowered).toBe(true);
    });

    test("should handle wizard with illustration data", async () => {
      const wizardId = await t.run(async (ctx) => {
        return await ctx.db.insert("wizards", {
          owner: "user123",
          name: "Illustrated Wizard",
          description: "A wizard with illustration",
          wins: 5,
          losses: 2,
          isAIPowered: false,
          illustration: "storage-id-123",
          illustrationURL: "https://example.com/wizard.png",
          illustrationVersion: 2,
          illustrationGeneratedAt: Date.now(),
          illustrations: ["storage-id-1", "storage-id-2"],
        });
      });

      const wizard = await t.query(api.wizards.getWizard, { wizardId });

      expect(wizard?.illustration).toBe("storage-id-123");
      expect(wizard?.illustrationURL).toBe("https://example.com/wizard.png");
      expect(wizard?.illustrationVersion).toBe(2);
      expect(wizard?.illustrationGeneratedAt).toBeDefined();
      expect(wizard?.illustrations).toEqual(["storage-id-1", "storage-id-2"]);
    });
  });

  describe("Wizard Updates", () => {
    let wizardId: Id<"wizards">;

    beforeEach(async () => {
      wizardId = await t.run(async (ctx) => {
        return await ctx.db.insert("wizards", {
          owner: "user123",
          name: "Original Name",
          description: "Original description",
          wins: 3,
          losses: 1,
          isAIPowered: false,
          illustrationVersion: 1,
        });
      });
    });

    test("should update wizard name only", async () => {
      await t.mutation(api.wizards.updateWizard, {
        wizardId,
        name: "Updated Name",
      });

      const wizard = await t.query(api.wizards.getWizard, { wizardId });
      expect(wizard?.name).toBe("Updated Name");
      expect(wizard?.description).toBe("Original description");
    });

    test("should update wizard description only", async () => {
      await t.mutation(api.wizards.updateWizard, {
        wizardId,
        description: "Updated description",
      });

      const wizard = await t.query(api.wizards.getWizard, { wizardId });
      expect(wizard?.name).toBe("Original Name");
      expect(wizard?.description).toBe("Updated description");
    });

    test("should update multiple fields simultaneously", async () => {
      await t.mutation(api.wizards.updateWizard, {
        wizardId,
        name: "New Name",
        description: "New description",
        isAIPowered: true,
        illustrationURL: "https://example.com/new.png",
      });

      const wizard = await t.query(api.wizards.getWizard, { wizardId });
      expect(wizard?.name).toBe("New Name");
      expect(wizard?.description).toBe("New description");
      expect(wizard?.isAIPowered).toBe(true);
      expect(wizard?.illustrationURL).toBe("https://example.com/new.png");
    });

    test("should increment illustration version when illustration is updated", async () => {
      await t.mutation(api.wizards.updateWizard, {
        wizardId,
        illustration: "new-storage-id",
      });

      const wizard = await t.query(api.wizards.getWizard, { wizardId });
      expect(wizard?.illustration).toBe("new-storage-id");
      expect(wizard?.illustrationVersion).toBe(2);
      expect(wizard?.illustrationGeneratedAt).toBeDefined();
    });

    test("should not change illustration version when other fields are updated", async () => {
      await t.mutation(api.wizards.updateWizard, {
        wizardId,
        name: "Different Name",
        isAIPowered: true,
      });

      const wizard = await t.query(api.wizards.getWizard, { wizardId });
      expect(wizard?.illustrationVersion).toBe(1);
    });

    test("should handle updating non-existent wizard", async () => {
      // Create and then delete a wizard to get a valid but non-existent ID
      const tempId = await t.run(async (ctx) => {
        return await ctx.db.insert("wizards", {
          owner: "temp",
          name: "Temp",
          description: "Temp wizard",
          wins: 0,
          losses: 0,
          isAIPowered: false,
        });
      });

      await t.run(async (ctx) => {
        await ctx.db.delete(tempId);
      });

      await expect(
        t.mutation(api.wizards.updateWizard, {
          wizardId: tempId,
          name: "New Name",
        })
      ).rejects.toThrow("Wizard not found");
    });
  });

  describe("Wizard Stats Management", () => {
    let wizardId: Id<"wizards">;

    beforeEach(async () => {
      wizardId = await t.run(async (ctx) => {
        return await ctx.db.insert("wizards", {
          owner: "user123",
          name: "Battle Wizard",
          description: "A wizard for battle testing",
          wins: 5,
          losses: 3,
          isAIPowered: false,
        });
      });
    });

    test("should increment wins correctly", async () => {
      await t.mutation(api.wizards.updateWizardStats, {
        wizardId,
        won: true,
      });

      const wizard = await t.query(api.wizards.getWizard, { wizardId });
      expect(wizard?.wins).toBe(6);
      expect(wizard?.losses).toBe(3);
    });

    test("should increment losses correctly", async () => {
      await t.mutation(api.wizards.updateWizardStats, {
        wizardId,
        won: false,
      });

      const wizard = await t.query(api.wizards.getWizard, { wizardId });
      expect(wizard?.wins).toBe(5);
      expect(wizard?.losses).toBe(4);
    });

    test("should handle multiple consecutive wins", async () => {
      await t.mutation(api.wizards.updateWizardStats, {
        wizardId,
        won: true,
      });
      await t.mutation(api.wizards.updateWizardStats, {
        wizardId,
        won: true,
      });
      await t.mutation(api.wizards.updateWizardStats, {
        wizardId,
        won: true,
      });

      const wizard = await t.query(api.wizards.getWizard, { wizardId });
      expect(wizard?.wins).toBe(8);
      expect(wizard?.losses).toBe(3);
    });

    test("should handle multiple consecutive losses", async () => {
      await t.mutation(api.wizards.updateWizardStats, {
        wizardId,
        won: false,
      });
      await t.mutation(api.wizards.updateWizardStats, {
        wizardId,
        won: false,
      });

      const wizard = await t.query(api.wizards.getWizard, { wizardId });
      expect(wizard?.wins).toBe(5);
      expect(wizard?.losses).toBe(5);
    });

    test("should handle mixed win/loss sequence", async () => {
      await t.mutation(api.wizards.updateWizardStats, {
        wizardId,
        won: true,
      });
      await t.mutation(api.wizards.updateWizardStats, {
        wizardId,
        won: false,
      });
      await t.mutation(api.wizards.updateWizardStats, {
        wizardId,
        won: true,
      });
      await t.mutation(api.wizards.updateWizardStats, {
        wizardId,
        won: false,
      });

      const wizard = await t.query(api.wizards.getWizard, { wizardId });
      expect(wizard?.wins).toBe(7);
      expect(wizard?.losses).toBe(5);
    });

    test("should handle wizard with undefined stats", async () => {
      const newWizardId = await t.run(async (ctx) => {
        return await ctx.db.insert("wizards", {
          owner: "user456",
          name: "New Wizard",
          description: "A fresh wizard",
          isAIPowered: false,
          // wins and losses are undefined
        });
      });

      await t.mutation(api.wizards.updateWizardStats, {
        wizardId: newWizardId,
        won: true,
      });

      const wizard = await t.query(api.wizards.getWizard, {
        wizardId: newWizardId,
      });
      expect(wizard?.wins).toBe(1);
      expect(wizard?.losses).toBe(0);
    });

    test("should handle updating stats for non-existent wizard", async () => {
      // Create and then delete a wizard to get a valid but non-existent ID
      const tempId = await t.run(async (ctx) => {
        return await ctx.db.insert("wizards", {
          owner: "temp",
          name: "Temp",
          description: "Temp wizard",
          wins: 0,
          losses: 0,
          isAIPowered: false,
        });
      });

      await t.run(async (ctx) => {
        await ctx.db.delete(tempId);
      });

      await expect(
        t.mutation(api.wizards.updateWizardStats, {
          wizardId: tempId,
          won: true,
        })
      ).rejects.toThrow("Wizard not found");
    });
  });

  describe("Wizard Queries", () => {
    let user1Wizards: Id<"wizards">[];
    let user2Wizards: Id<"wizards">[];

    beforeEach(async () => {
      // Create wizards for user1
      user1Wizards = await Promise.all([
        t.run(async (ctx) =>
          ctx.db.insert("wizards", {
            owner: "user1",
            name: "Wizard A",
            description: "First wizard",
            wins: 10,
            losses: 2,
            isAIPowered: false,
          })
        ),
        t.run(async (ctx) =>
          ctx.db.insert("wizards", {
            owner: "user1",
            name: "Wizard B",
            description: "Second wizard",
            wins: 5,
            losses: 5,
            isAIPowered: true,
          })
        ),
        t.run(async (ctx) =>
          ctx.db.insert("wizards", {
            owner: "user1",
            name: "Wizard C",
            description: "Third wizard",
            wins: 0,
            losses: 8,
            isAIPowered: false,
          })
        ),
      ]);

      // Create wizards for user2
      user2Wizards = await Promise.all([
        t.run(async (ctx) =>
          ctx.db.insert("wizards", {
            owner: "user2",
            name: "Wizard X",
            description: "User2's first wizard",
            wins: 15,
            losses: 1,
            isAIPowered: false,
          })
        ),
        t.run(async (ctx) =>
          ctx.db.insert("wizards", {
            owner: "user2",
            name: "Wizard Y",
            description: "User2's second wizard",
            wins: 3,
            losses: 7,
            isAIPowered: true,
          })
        ),
      ]);
    });

    test("should get all wizards for user1", async () => {
      const wizards = await t.query(api.wizards.getUserWizards, {
        userId: "user1",
      });

      expect(wizards).toHaveLength(3);
      expect(wizards.map((w) => w._id)).toEqual(
        expect.arrayContaining(user1Wizards)
      );
      expect(wizards.map((w) => w.name)).toEqual(
        expect.arrayContaining(["Wizard A", "Wizard B", "Wizard C"])
      );
    });

    test("should get all wizards for user2", async () => {
      const wizards = await t.query(api.wizards.getUserWizards, {
        userId: "user2",
      });

      expect(wizards).toHaveLength(2);
      expect(wizards.map((w) => w._id)).toEqual(
        expect.arrayContaining(user2Wizards)
      );
      expect(wizards.map((w) => w.name)).toEqual(
        expect.arrayContaining(["Wizard X", "Wizard Y"])
      );
    });

    test("should return empty array for user with no wizards", async () => {
      const wizards = await t.query(api.wizards.getUserWizards, {
        userId: "user-with-no-wizards",
      });

      expect(wizards).toEqual([]);
    });

    test("should get specific wizard by ID", async () => {
      const wizard = await t.query(api.wizards.getWizard, {
        wizardId: user1Wizards[0],
      });

      expect(wizard).toMatchObject({
        _id: user1Wizards[0],
        owner: "user1",
        name: "Wizard A",
        description: "First wizard",
        wins: 10,
        losses: 2,
        isAIPowered: false,
      });
    });

    test("should return null for non-existent wizard", async () => {
      // Create and then delete a wizard to get a valid but non-existent ID
      const tempId = await t.run(async (ctx) => {
        return await ctx.db.insert("wizards", {
          owner: "temp",
          name: "Temp",
          description: "Temp wizard",
          wins: 0,
          losses: 0,
          isAIPowered: false,
        });
      });

      await t.run(async (ctx) => {
        await ctx.db.delete(tempId);
      });

      const wizard = await t.query(api.wizards.getWizard, {
        wizardId: tempId,
      });

      expect(wizard).toBeNull();
    });

    test("should verify wizard ownership isolation", async () => {
      const user1Wizards = await t.query(api.wizards.getUserWizards, {
        userId: "user1",
      });
      const user2Wizards = await t.query(api.wizards.getUserWizards, {
        userId: "user2",
      });

      // Ensure no overlap between users' wizards
      const user1Ids = user1Wizards.map((w) => w._id);
      const user2Ids = user2Wizards.map((w) => w._id);

      expect(user1Ids.some((id) => user2Ids.includes(id))).toBe(false);
      expect(user2Ids.some((id) => user1Ids.includes(id))).toBe(false);
    });
  });

  describe("Wizard Deletion", () => {
    let wizardId: Id<"wizards">;

    beforeEach(async () => {
      wizardId = await t.run(async (ctx) => {
        return await ctx.db.insert("wizards", {
          owner: "user123",
          name: "Doomed Wizard",
          description: "A wizard to be deleted",
          wins: 2,
          losses: 1,
          isAIPowered: false,
        });
      });
    });

    test("should successfully delete a wizard", async () => {
      // Verify wizard exists
      let wizard = await t.query(api.wizards.getWizard, { wizardId });
      expect(wizard).toBeTruthy();

      // Delete wizard
      await t.mutation(api.wizards.deleteWizard, { wizardId });

      // Verify wizard is deleted
      wizard = await t.query(api.wizards.getWizard, { wizardId });
      expect(wizard).toBeNull();
    });

    test("should remove wizard from user's wizard list after deletion", async () => {
      // Create another wizard for the same user
      const otherWizardId = await t.run(async (ctx) => {
        return await ctx.db.insert("wizards", {
          owner: "user123",
          name: "Surviving Wizard",
          description: "A wizard that will survive",
          wins: 1,
          losses: 0,
          isAIPowered: false,
        });
      });

      // Verify both wizards exist in user's list
      let userWizards = await t.query(api.wizards.getUserWizards, {
        userId: "user123",
      });
      expect(userWizards).toHaveLength(2);
      expect(userWizards.map((w) => w._id)).toContain(wizardId);
      expect(userWizards.map((w) => w._id)).toContain(otherWizardId);

      // Delete one wizard
      await t.mutation(api.wizards.deleteWizard, { wizardId });

      // Verify only one wizard remains
      userWizards = await t.query(api.wizards.getUserWizards, {
        userId: "user123",
      });
      expect(userWizards).toHaveLength(1);
      expect(userWizards[0]._id).toBe(otherWizardId);
    });

    test("should handle deleting non-existent wizard gracefully", async () => {
      // Create and then delete a wizard to get a valid but non-existent ID
      const tempId = await t.run(async (ctx) => {
        return await ctx.db.insert("wizards", {
          owner: "temp",
          name: "Temp",
          description: "Temp wizard",
          wins: 0,
          losses: 0,
          isAIPowered: false,
        });
      });

      await t.run(async (ctx) => {
        await ctx.db.delete(tempId);
      });

      // This should not throw an error (Convex delete is idempotent)
      await expect(
        t.mutation(api.wizards.deleteWizard, { wizardId: tempId })
      ).resolves.not.toThrow();
    });
  });

  describe("Wizard Illustration Management", () => {
    let wizardId: Id<"wizards">;

    beforeEach(async () => {
      wizardId = await t.run(async (ctx) => {
        return await ctx.db.insert("wizards", {
          owner: "user123",
          name: "Illustrated Wizard",
          description: "A wizard with illustrations",
          wins: 0,
          losses: 0,
          isAIPowered: false,
          illustrationVersion: 1,
        });
      });
    });

    test("should trigger regeneration when requested", async () => {
      const result = await t.mutation(api.wizards.regenerateIllustration, {
        wizardId,
      });

      expect(result).toEqual({ success: true });
      // Note: The actual illustration generation is scheduled and would happen asynchronously
    });

    test("should handle regeneration for non-existent wizard", async () => {
      // Create and then delete a wizard to get a valid but non-existent ID
      const tempId = await t.run(async (ctx) => {
        return await ctx.db.insert("wizards", {
          owner: "temp",
          name: "Temp",
          description: "Temp wizard",
          wins: 0,
          losses: 0,
          isAIPowered: false,
        });
      });

      await t.run(async (ctx) => {
        await ctx.db.delete(tempId);
      });

      await expect(
        t.mutation(api.wizards.regenerateIllustration, {
          wizardId: tempId,
        })
      ).rejects.toThrow("Wizard not found");
    });

    test("should handle illustration URL retrieval", async () => {
      // This test would require mocking the storage system
      // For now, we just test that the query exists and accepts the right parameters
      const storageId = "test-storage-id";

      // The actual URL retrieval would depend on Convex storage being available
      // In a real test environment, this would return a URL or null
      const result = await t.query(api.wizards.getIllustrationUrl, {
        storageId,
      });

      // In the test environment, this will likely return null since storage isn't mocked
      expect(result).toBeNull();
    });
  });

  describe("Data Integrity", () => {
    test("should maintain data consistency across operations", async () => {
      const wizardId = await t.run(async (ctx) => {
        return await ctx.db.insert("wizards", {
          owner: "user123",
          name: "Consistency Test",
          description: "Testing data consistency",
          wins: 0,
          losses: 0,
          isAIPowered: false,
        });
      });

      // Perform multiple operations
      await t.mutation(api.wizards.updateWizardStats, {
        wizardId,
        won: true,
      });

      await t.mutation(api.wizards.updateWizard, {
        wizardId,
        name: "Updated Name",
        description: "Updated description",
      });

      await t.mutation(api.wizards.updateWizardStats, {
        wizardId,
        won: false,
      });

      // Verify final state
      const wizard = await t.query(api.wizards.getWizard, { wizardId });
      expect(wizard).toMatchObject({
        name: "Updated Name",
        description: "Updated description",
        wins: 1,
        losses: 1,
        owner: "user123",
        isAIPowered: false,
      });
    });

    test("should handle concurrent stat updates correctly", async () => {
      const wizardId = await t.run(async (ctx) => {
        return await ctx.db.insert("wizards", {
          owner: "user123",
          name: "Concurrent Test",
          description: "Testing concurrent updates",
          wins: 5,
          losses: 3,
          isAIPowered: false,
        });
      });

      // Simulate concurrent updates
      await Promise.all([
        t.mutation(api.wizards.updateWizardStats, {
          wizardId,
          won: true,
        }),
        t.mutation(api.wizards.updateWizardStats, {
          wizardId,
          won: true,
        }),
        t.mutation(api.wizards.updateWizardStats, {
          wizardId,
          won: false,
        }),
      ]);

      const wizard = await t.query(api.wizards.getWizard, { wizardId });
      expect(wizard?.wins).toBe(7); // 5 + 2 wins
      expect(wizard?.losses).toBe(4); // 3 + 1 loss
    });
  });

  describe("Edge Cases", () => {
    test("should handle wizards with very long names and descriptions", async () => {
      const longName = "A".repeat(1000);
      const longDescription = "B".repeat(5000);

      const wizardId = await t.run(async (ctx) => {
        return await ctx.db.insert("wizards", {
          owner: "user123",
          name: longName,
          description: longDescription,
          wins: 0,
          losses: 0,
          isAIPowered: false,
        });
      });

      const wizard = await t.query(api.wizards.getWizard, { wizardId });
      expect(wizard?.name).toBe(longName);
      expect(wizard?.description).toBe(longDescription);
    });

    test("should handle wizards with special characters in names", async () => {
      const specialName = "Wizard™ 🧙‍♂️ with émojis & spëcial chars!";
      const specialDescription = "A wizard with ñoñ-ASCII characters: αβγδε";

      const wizardId = await t.run(async (ctx) => {
        return await ctx.db.insert("wizards", {
          owner: "user123",
          name: specialName,
          description: specialDescription,
          wins: 0,
          losses: 0,
          isAIPowered: false,
        });
      });

      const wizard = await t.query(api.wizards.getWizard, { wizardId });
      expect(wizard?.name).toBe(specialName);
      expect(wizard?.description).toBe(specialDescription);
    });

    test("should handle wizards with extreme stat values", async () => {
      const wizardId = await t.run(async (ctx) => {
        return await ctx.db.insert("wizards", {
          owner: "user123",
          name: "Extreme Stats",
          description: "A wizard with extreme stats",
          wins: 999999,
          losses: 0,
          isAIPowered: false,
        });
      });

      // Add more wins
      await t.mutation(api.wizards.updateWizardStats, {
        wizardId,
        won: true,
      });

      const wizard = await t.query(api.wizards.getWizard, { wizardId });
      expect(wizard?.wins).toBe(1000000);
      expect(wizard?.losses).toBe(0);
    });
  });
});
