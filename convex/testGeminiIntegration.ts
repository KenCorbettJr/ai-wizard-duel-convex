import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Test action to verify Gemini integration is working
export const testGeminiIntegration = action({
  args: {
    testPrompt: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    hasGeminiKey: v.boolean(),
    useGemini: v.boolean(),
  }),
  handler: async (
    ctx,
    { testPrompt = "A magical wizard in a fantasy arena" },
  ): Promise<{
    success: boolean;
    message: string;
    hasGeminiKey: boolean;
    useGemini: boolean;
  }> => {
    try {
      // Check configuration
      const hasGeminiKey = !!process.env.GOOGLE_API_KEY;
      const useGemini = process.env.USE_GEMINI_FOR_IMAGES === "true";

      console.log("🧪 Testing Gemini integration...");
      console.log(`Has Gemini API Key: ${hasGeminiKey}`);
      console.log(`Use Gemini setting: ${useGemini}`);

      if (!hasGeminiKey) {
        return {
          success: false,
          message:
            "GOOGLE_API_KEY not configured. Add it to your .env.local file.",
          hasGeminiKey: false,
          useGemini: false,
        };
      }

      if (!useGemini) {
        return {
          success: true,
          message:
            "Gemini integration is configured but disabled. Set USE_GEMINI_FOR_IMAGES=true to enable.",
          hasGeminiKey: true,
          useGemini: false,
        };
      }

      // Test image generation (this will fallback to FAL if Gemini fails)
      try {
        const imageBuffer: ArrayBuffer = await ctx.runAction(
          api.generateImageWithGemini.generateImageWithGemini,
          {
            prompt: testPrompt,
            useGemini: true,
            // Note: For introduction round, you would pass:
            // wizardImages: ["storage_id_1", "storage_id_2"],
            // For subsequent rounds, you would pass:
            // previousImage: "previous_round_storage_id",
            // wizardDescriptions: [{ name: "Gandalf", description: "..." }, { name: "Saruman", description: "..." }],
          },
        );

        if (imageBuffer && imageBuffer.byteLength > 0) {
          return {
            success: true,
            message: `Gemini integration test successful! Generated image of ${imageBuffer.byteLength} bytes.`,
            hasGeminiKey: true,
            useGemini: true,
          };
        } else {
          return {
            success: false,
            message: "Image generation returned empty result.",
            hasGeminiKey: true,
            useGemini: true,
          };
        }
      } catch (error) {
        return {
          success: false,
          message: `Image generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          hasGeminiKey: true,
          useGemini: true,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        hasGeminiKey: !!process.env.GOOGLE_API_KEY,
        useGemini: process.env.USE_GEMINI_FOR_IMAGES === "true",
      };
    }
  },
});
