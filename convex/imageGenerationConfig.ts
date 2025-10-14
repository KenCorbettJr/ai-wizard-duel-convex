import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Simple configuration for image generation preferences
// This could be expanded to be user-specific in the future

export const getImageGenerationConfig = query({
  args: {},
  returns: v.object({
    useGemini: v.boolean(),
    hasGeminiApiKey: v.boolean(),
    hasFalApiKey: v.boolean(),
  }),
  handler: async () => {
    return {
      useGemini: process.env.USE_GEMINI_FOR_IMAGES === "true",
      hasGeminiApiKey: !!process.env.GOOGLE_API_KEY,
      hasFalApiKey: !!process.env.FAL_KEY,
    };
  },
});

// For testing purposes - allows toggling the image generation method
export const toggleImageGenerationMethod = mutation({
  args: { useGemini: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { useGemini }) => {
    // In a real implementation, you might want to store this in the database
    // or make it user-specific. For now, this is just for demonstration.
    console.log(
      `Image generation method toggled to: ${useGemini ? "Gemini Nano Banana" : "FAL"}`,
    );

    // Note: This doesn't actually change the environment variable at runtime
    // You would need to restart the server with the new environment variable
    // or implement a more sophisticated configuration system

    return null;
  },
});
