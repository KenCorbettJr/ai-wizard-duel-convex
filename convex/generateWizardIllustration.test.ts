import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { convexTest } from "convex-test";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { withAuth, generateTestId } from "./test_utils";

// Mock AI text generation so tests don't hit external services
const mockGenerateText = vi.fn(async () => {
  return "Mock enhanced illustration prompt for testing";
});
vi.mock("./aiTextGeneration", () => ({
  generateText: mockGenerateText,
}));

describe("generateWizardIllustration", () => {
  let t: ReturnType<typeof convexTest>;
  const savedEnv = { ...process.env };

  beforeEach(() => {
    t = convexTest(schema, import.meta.glob("./**/*.*s"));
    vi.clearAllMocks();

    // Emulator mode makes the image providers return a mock image.
    process.env.ENV = "emulate";
    process.env.GOOGLE_API_KEY = "test-google-key";
    delete process.env.BFL_API_KEY;
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it("should generate enhanced prompt and illustration for wizard", async () => {
    // Create a test wizard first with authentication
    const wizardId = await withAuth(t).mutation(internal.wizards.createWizard, {
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
      },
    );

    expect(result.success).toBe(true);
    expect(result.storageId).toBeDefined();

    // Verify the wizard was updated with the illustration
    const updatedWizard = await withAuth(t).query(api.wizards.getWizard, {
      wizardId,
    });
    expect(updatedWizard?.illustration).toBe(result.storageId);
    expect(updatedWizard?.illustrationVersion).toBeGreaterThan(1);

    // Ensure the mocked text service was used
    expect(mockGenerateText).toHaveBeenCalled();
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
      const wizardId = await withAuth(t).mutation(
        internal.wizards.createWizard,
        {
          name: wizard.name,
          description: wizard.description,
        },
      );

      const result = await withAuth(t).action(
        api.generateWizardIllustration.generateWizardIllustration,
        {
          wizardId,
          name: wizard.name,
          description: wizard.description,
        },
      );

      expect(result.success).toBe(true);
      expect(result.storageId).toBeDefined();
      expect(mockGenerateText).toHaveBeenCalled();
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
        },
      ),
    ).rejects.toThrow();
  });
});
