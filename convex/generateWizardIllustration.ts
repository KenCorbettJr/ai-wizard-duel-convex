"use node";

import { action, ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import {
  generateText,
  type AIObservabilityContext,
} from "./aiTextGeneration";

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
      `Starting illustration generation for wizard ${wizardId} (${name})`,
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
          },
        );

        if (!hasCredits) {
          throw new Error(
            "Insufficient image credits for wizard illustration generation",
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
          },
        );

        if (!creditConsumed) {
          throw new Error("Failed to consume image credit");
        }

        console.log(
          `Consumed 1 image credit for user ${userId} for wizard ${wizardId}`,
        );
      }
      const useGemini = process.env.USE_GEMINI_FOR_IMAGES === "true";
      const observabilityContext: AIObservabilityContext = {
        sessionId: `wizard-${wizardId}`,
        traceId: crypto.randomUUID(),
        distinctId: userId,
      };

      // Step 1: the character on a plain background. This image is the
      // canonical look of the wizard and is handed to every later scene.
      const plainPromptRequest = `Create a very detailed image prompt for a low poly illustration of a wizard named "${name}" that would fit this type of wizard. The wizard has this description: ${description}. Show the full body, centered, in a neutral standing pose facing the viewer, with all clothing, face, hair, colors, and any magical implement or familiar clearly visible. The background must be a completely plain solid white background with no scenery, no ground, no shadows cast on the background, and no spell effects or particles that extend into the background. Only give me the image prompt, no other text.`;
      const plainPrompt =
        (await generateText(
          plainPromptRequest,
          undefined,
          {},
          { ...observabilityContext, spanName: "generate_wizard_plain_prompt" },
        )) +
        " Plain solid white background, isolated character, full body, centered, no environment.";
      console.log("Generated plain illustration prompt:", plainPrompt);

      const plainBuffer = await generateAndCompress(ctx, plainPrompt, {
        useGemini,
      });
      const plainStorageId = await ctx.storage.store(
        new Blob([plainBuffer], { type: "image/webp" }),
      );

      // Step 2: the same wizard placed into a themed scene for display.
      let illustrationStorageId: string = plainStorageId;
      try {
        const themedPromptRequest = `Create a very detailed image prompt for a low poly illustration of a wizard named "${name}" in an action pose that would fit this type of wizard. The wizard has this description: ${description}. Use dynamic lighting and emphasize the wizard's power with magical particles and spell effects surrounding them. Set the wizard in a dramatic background that matches the wizard's theme. Only give me the image prompt, no other text.`;
        const themedPrompt = await generateText(
          themedPromptRequest,
          undefined,
          {},
          { ...observabilityContext, spanName: "generate_wizard_themed_prompt" },
        );
        console.log("Generated themed illustration prompt:", themedPrompt);

        const themedBuffer = await generateAndCompress(ctx, themedPrompt, {
          useGemini,
          referenceStorageId: plainStorageId,
          referenceLabel: name,
        });
        illustrationStorageId = await ctx.storage.store(
          new Blob([themedBuffer], { type: "image/webp" }),
        );
      } catch (themedError) {
        // The plain image is still a valid illustration, so don't fail the wizard.
        console.warn(
          "Themed wizard illustration failed, using plain image:",
          themedError,
        );
      }

      // Update the wizard with both images using internal mutation
      await ctx.runMutation(internal.wizards.updateWizardInternal, {
        wizardId,
        illustration: illustrationStorageId,
        plainIllustration: plainStorageId,
      });
      const storageId = illustrationStorageId;

      console.log(`Successfully generated illustration for wizard ${wizardId}`);
      return { success: true, storageId };
    } catch (error) {
      console.error(
        `Error generating illustration for wizard ${wizardId}:`,
        error,
      );

      // If it's an environment variable issue, provide helpful guidance
      if (error instanceof Error && error.message.includes("FAL_KEY")) {
        throw new Error(
          "Image generation is not configured. Please add your FAL_KEY to the environment variables.",
        );
      }

      throw new Error(
        `Failed to generate wizard illustration: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  },
});

// Generate one image (Gemini with an optional reference, otherwise FAL) and compress it.
async function generateAndCompress(
  ctx: ActionCtx,
  prompt: string,
  options: {
    useGemini: boolean;
    referenceStorageId?: string;
    referenceLabel?: string;
  },
): Promise<ArrayBuffer> {
  const { useGemini, referenceStorageId, referenceLabel } = options;

  let imageBuffer: ArrayBuffer;
  if (useGemini) {
    imageBuffer = await ctx.runAction(
      api.generateImageWithGemini.generateImageWithGemini,
      {
        prompt,
        useGemini: true,
        ...(referenceStorageId
          ? {
              wizardImages: [referenceStorageId],
              wizardImageLabels: referenceLabel ? [referenceLabel] : undefined,
            }
          : {}),
      },
    );
  } else {
    // FAL (flux schnell) has no reference-image input, so the themed image is
    // text-only on this path.
    imageBuffer = await ctx.runAction(api.generateImage.generateImage, {
      prompt,
      skipResize: process.env.NODE_ENV === "test", // Skip resize during tests
    });
  }

  if (process.env.NODE_ENV === "test") return imageBuffer;

  try {
    return await ctx.runAction(api.imageCompressionService.compressImage, {
      imageBuffer,
    });
  } catch (resizeError) {
    console.warn(
      "Wizard illustration compression failed, using original:",
      resizeError,
    );
    return imageBuffer;
  }
}
