import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Test action to verify image generation is working (Gemini, then BFL as fallback)
export const testGeminiIntegration = action({
  args: {
    testPrompt: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    hasGeminiKey: v.boolean(),
  }),
  handler: async (
    ctx,
    { testPrompt = "A magical wizard in a fantasy arena" },
  ): Promise<{
    success: boolean;
    message: string;
    hasGeminiKey: boolean;
  }> => {
    const hasGeminiKey = !!process.env.GOOGLE_API_KEY;
    console.log("🧪 Testing image generation...");
    console.log(`Has Gemini API Key: ${hasGeminiKey}`);

    if (!hasGeminiKey) {
      return {
        success: false,
        message:
          "GOOGLE_API_KEY not configured. Add it to your .env.local file.",
        hasGeminiKey: false,
      };
    }

    try {
      const imageBuffer: ArrayBuffer = await ctx.runAction(
        api.generateImageWithGemini.generateImageWithGemini,
        { prompt: testPrompt },
      );

      if (imageBuffer && imageBuffer.byteLength > 0) {
        return {
          success: true,
          message: `Image generation test successful! Generated image of ${imageBuffer.byteLength} bytes.`,
          hasGeminiKey: true,
        };
      }
      return {
        success: false,
        message: "Image generation returned empty result.",
        hasGeminiKey: true,
      };
    } catch (error) {
      return {
        success: false,
        message: `Image generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        hasGeminiKey: true,
      };
    }
  },
});
