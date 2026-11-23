import { query } from "./_generated/server";
import { v } from "convex/values";
import { isBflEnabled, isGeminiImageEnabled } from "./lib/imageProvider";

// Which image providers are available. Gemini is the default and Black
// Forest Labs is the fallback (see lib/imageProvider.ts).
export const getImageGenerationConfig = query({
  args: {},
  returns: v.object({
    hasGeminiApiKey: v.boolean(),
    hasBflApiKey: v.boolean(),
  }),
  handler: async () => {
    return {
      hasGeminiApiKey: isGeminiImageEnabled(),
      hasBflApiKey: isBflEnabled(),
    };
  },
});
