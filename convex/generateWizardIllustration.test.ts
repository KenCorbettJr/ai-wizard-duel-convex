import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import schema from "./schema";
import { withAuth, generateTestId } from "./test_utils";

describe("generateWizardIllustration", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema);
  });

  it("should generate enhanced prompt and illustration for wizard", async () => {
    // Create a test wizard first with authentication
    const wizardId = await withAuth(t).mutation(api.wizards.createWizard, {
      name: "Flame Master Zara",
      description:
        "A powerful fire wizard with crimson robes and a phoenix familiar",
    });

    // Test the illustration generation
    const result = await withAuth(t).action(
      api.generateWizardIllustration.generateWizardIllustration,
      {
        wizardId,
        name: "Flame Master Zara",
        description:
          "A powerful fire wizard with crimson robes and a phoenix familiar",
      }
    );

    expect(result.success).toBe(true);
    expect(result.storageId).toBeDefined();

    // Verify the wizard was updated with the illustration
    const updatedWizard = await withAuth(t).query(api.wizards.getWizard, {
      wizardId,
    });
    expect(updatedWizard?.illustration).toBe(result.storageId);
    expect(updatedWizard?.illustrationVersion).toBeGreaterThan(1);
  });

  it("should handle different wizard types with enhanced prompts", async () => {
    // Test with different wizard types to ensure AI generates varied prompts
    const wizardTypes = [
      {
        name: "Frost Sage Elara",
        description:
          "An ice wizard with crystalline staff and snow owl companion",
      },
      {
        name: "Shadow Weaver Malachar",
        description: "A dark necromancer with bone staff and raven familiar",
      },
    ];

    for (const wizard of wizardTypes) {
      const wizardId = await withAuth(t).mutation(api.wizards.createWizard, {
        name: wizard.name,
        description: wizard.description,
      });

      const result = await withAuth(t).action(
        api.generateWizardIllustration.generateWizardIllustration,
        {
          wizardId,
          name: wizard.name,
          description: wizard.description,
        }
      );

      expect(result.success).toBe(true);
      expect(result.storageId).toBeDefined();
    }
  });

  it("should handle errors gracefully", async () => {
    // Test with invalid wizard ID
    const invalidWizardId = generateTestId("wizards");
    await expect(
      withAuth(t).action(
        api.generateWizardIllustration.generateWizardIllustration,
        {
          wizardId: invalidWizardId,
          name: "Test Wizard",
          description: "Test description",
        }
      )
    ).rejects.toThrow();
  });
});
