"use node";

"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { generateText } from "./aiTextGeneration";
import { getImageSizeConfig } from "./imageConfig";

export const generateWizardIllustration = action({
  args: {
    wizardId: v.id("wizards"),
    name: v.string(),
    description: v.string(),
    userId: v.optional(v.string()), // User ID for credit consumption
  },
  returns: v.object({
    success: v.boolean(),
    storageId: v.string(),
  }),
  handler: async (ctx, { wizardId, name, description, userId }) => {
    console.log(
      `Starting illustration generation for wizard ${wizardId} (${name})`
    );

    try {
      // Check and consume image credits if userId is provided
      // Note: Wizard illustrations are generated independently and still consume individual credits
      // Only duel-related images (round illustrations) use the duel-level credit system
      if (userId) {
        const hasCredits = await ctx.runQuery(
          api.imageCreditService.hasImageCreditsForDuel,
          {
            userId,
          }
        );

        if (!hasCredits) {
          throw new Error(
            "Insufficient image credits for wizard illustration generation"
          );
        }

        // Consume one credit for image generation
        const creditConsumed = await ctx.runMutation(
          api.imageCreditService.consumeImageCredit,
          {
            userId,
            metadata: {
              wizardId,
              purpose: "wizard_illustration",
            },
          }
        );

        if (!creditConsumed) {
          throw new Error("Failed to consume image credit");
        }

        console.log(
          `Consumed 1 image credit for user ${userId} for wizard ${wizardId}`
        );
      }
      // Use AI to create a detailed illustration prompt
      const illustrationPrompt = `Create a very detailed image prompt for a low poly illustration of a wizard named "${name}" in an action pose that would fit this type of wizard. The wizard has this description: ${description}. Use Dynamic lighting and emphasize the wizard's power with magical particles and spell effects surrounding them. If it makes sense, have them holding a magical implement or familiar. Match the background to the wizard's theme. Only give me the image prompt, no other text.`;

      console.log("Generating enhanced prompt with AI...");
      const enhancedPrompt = await generateText(illustrationPrompt);

      console.log("Generated illustration text:", enhancedPrompt);

      // Check if we should use Gemini or FAL for image generation
      const useGemini = process.env.USE_GEMINI_FOR_IMAGES === "true";

      let imageBuffer: ArrayBuffer;
      if (useGemini) {
        // Use Gemini for image generation
        imageBuffer = await ctx.runAction(
          api.generateImageWithGemini.generateImageWithGemini,
          {
            prompt: enhancedPrompt,
            useGemini: true,
          }
        );
      } else {
        // Use FAL for image generation
        imageBuffer = await ctx.runAction(api.generateImage.generateImage, {
          prompt: enhancedPrompt,
          skipResize: process.env.NODE_ENV === "test", // Skip resize during tests
        });
      }

      // Apply additional resizing specifically for wizard illustrations (skip during tests)
      let finalImageBuffer = imageBuffer;
      const wizardConfig = getImageSizeConfig("WIZARD_ILLUSTRATION");

      if (process.env.NODE_ENV !== "test") {
        try {
          finalImageBuffer = await ctx.runAction(
            api.imageResizeService.resizeImage,
            {
              imageBuffer,
              width: wizardConfig.width,
              height: wizardConfig.height,
              quality: wizardConfig.quality,
              format: wizardConfig.format,
            }
          );
        } catch (resizeError) {
          console.warn(
            "Wizard illustration resize failed, using original:",
            resizeError
          );
          // Use original image if resize fails
        }
      }

      // Store the resized image in Convex File Storage
      const storageId = await ctx.storage.store(
        new Blob([finalImageBuffer], { type: `image/${wizardConfig.format}` })
      );

      // Update the wizard with the new illustration using internal mutation
      await ctx.runMutation(internal.wizards.updateWizardInternal, {
        wizardId,
        illustration: storageId,
      });

      console.log(`Successfully generated illustration for wizard ${wizardId}`);
      return { success: true, storageId };
    } catch (error) {
      console.error(
        `Error generating illustration for wizard ${wizardId}:`,
        error
      );

      // If it's an environment variable issue, provide helpful guidance
      if (error instanceof Error && error.message.includes("FAL_KEY")) {
        throw new Error(
          "Image generation is not configured. Please add your FAL_KEY to the environment variables."
        );
      }

      throw new Error(
        `Failed to generate wizard illustration: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
});
