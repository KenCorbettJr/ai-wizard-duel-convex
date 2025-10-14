import { describe, it, expect, beforeEach, vi } from "vitest";
import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import schema from "./schema";
import { withAuth, generateTestId } from "./test_utils";

// Mock AI text generation so tests don't hit external services
const mockGenerateText = vi.fn(async (_prompt: string) => {
  return "Mock enhanced illustration prompt for testing";
});
vi.mock("./aiTextGeneration", () => ({
  generateText: mockGenerateText,
}));

// Mock the Fal client (used inside the real generateImage action)
const mockSubscribe = vi.fn();
vi.mock("@fal-ai/serverless-client", () => ({
  subscribe: mockSubscribe,
  config: vi.fn(),
}));

// Provide a fetch mock used by generateImage to fetch the generated image
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("generateWizardIllustration", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema);

    // Ensure env is set as tests expect
    process.env.FAL_KEY = "test-fal-key";

    // Clear mocks' history/implementations and then reconfigure their resolved values
    vi.clearAllMocks();

    // Default mock Fal response & image bytes used by tests
    const mockImageData = new Uint8Array([137, 80, 78, 71]); // small PNG-like header bytes
    const mockImageUrl = "https://example.com/image.png";

    // Provide a resolved value shape matching generateImage.ts expectations
    mockSubscribe.mockResolvedValue({
      images: [{ url: mockImageUrl }],
    });

    // Configure fetch to return the ArrayBuffer for the above URL
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(mockImageData.buffer),
    });

    // Re-assign fetch to ensure the runtime uses the mock after clearing
    global.fetch = mockFetch;
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

    // Ensure the mocked services were used
    expect(mockGenerateText).toHaveBeenCalled();
    expect(mockSubscribe).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalled();
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
        },
      );

      expect(result.success).toBe(true);
      expect(result.storageId).toBeDefined();
      expect(mockGenerateText).toHaveBeenCalled();
      expect(mockSubscribe).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalled();
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
