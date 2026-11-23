"use node";

import { action, ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { generateText, type AIObservabilityContext } from "./aiTextGeneration";
import { ORIGINAL_CHARACTER_RULE } from "./lib/contentStandards";

export const generateWizardIllustration = action({
  args: {
    wizardId: v.id("wizards"),
    name: v.string(),
    description: v.string(),
    userId: v.optional(v.string()), // Owner, for cost tracking
    refundTokenOnFailure: v.optional(v.boolean()), // A token was charged for this run; refund it if generation fails
  },
  returns: v.object({
    success: v.boolean(),
    storageId: v.string(),
  }),
  handler: async (
    ctx,
    { wizardId, name, description, userId, refundTokenOnFailure },
  ) => {
    console.log(
      `Starting illustration generation for wizard ${wizardId} (${name})`,
    );

    try {
      // Tokens are charged by the mutation that scheduled this action (the
      // first illustration is free). userId is only used for cost tracking.
      const observabilityContext: AIObservabilityContext = {
        sessionId: `wizard-${wizardId}`,
        traceId: crypto.randomUUID(),
        distinctId: userId,
        usageCtx: ctx,
      };

      // Step 1: the character on a plain background. This image is the
      // canonical look of the wizard and is handed to every later scene.
      const plainPromptRequest = `Create a very detailed image prompt for a low poly illustration of a wizard named "${name}" that would fit this type of wizard. The wizard has this description: ${description}. Show the full body, centered, in a neutral standing pose facing the viewer, with all clothing, face, hair, colors, and any magical implement or familiar clearly visible. The background must be a completely plain solid white background with no scenery, no ground, no shadows cast on the background, and no spell effects or particles that extend into the background. ${ORIGINAL_CHARACTER_RULE} Only give me the image prompt, no other text.`;
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
        usage: { userId, sessionId: `wizard-${wizardId}` },
      });
      const plainStorageId = await ctx.storage.store(
        new Blob([plainBuffer], { type: "image/webp" }),
      );
      // Let the UI move from "sketching" to "painting the scene".
      await ctx.runMutation(internal.wizards.setIllustrationStatus, {
        wizardId,
        status: "painting",
      });

      // Step 2: the same wizard placed into a themed scene for display.
      let illustrationStorageId: string = plainStorageId;
      try {
        const themedPromptRequest = `Create a very detailed image prompt for a low poly illustration of a wizard named "${name}" in an action pose that would fit this type of wizard. The wizard has this description: ${description}. Use dynamic lighting and emphasize the wizard's power with magical particles and spell effects surrounding them. Set the wizard in a dramatic background that matches the wizard's theme. ${ORIGINAL_CHARACTER_RULE} Only give me the image prompt, no other text.`;
        const themedPrompt = await generateText(
          themedPromptRequest,
          undefined,
          {},
          {
            ...observabilityContext,
            spanName: "generate_wizard_themed_prompt",
          },
        );
        console.log("Generated themed illustration prompt:", themedPrompt);

        const themedBuffer = await generateAndCompress(ctx, themedPrompt, {
          referenceStorageId: plainStorageId,
          referenceLabel: name,
          usage: { userId, sessionId: `wizard-${wizardId}` },
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

      try {
        await ctx.runMutation(internal.wizards.setIllustrationStatus, {
          wizardId,
          status: "failed",
        });
      } catch (statusError) {
        console.error("Failed to mark illustration as failed:", statusError);
      }

      if (refundTokenOnFailure && userId) {
        try {
          await ctx.runMutation(
            internal.imageCreditService.refundWizardImageToken,
            {
              userId,
              wizardId,
            },
          );
        } catch (refundError) {
          console.error("Failed to refund wizard image token:", refundError);
        }
      }

      throw new Error(
        `Failed to generate wizard illustration: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  },
});

// Generate one image, with an optional character reference, and compress it.
async function generateAndCompress(
  ctx: ActionCtx,
  prompt: string,
  options: {
    referenceStorageId?: string;
    referenceLabel?: string;
    usage: { userId?: string; sessionId?: string };
  },
): Promise<ArrayBuffer> {
  const { referenceStorageId, referenceLabel, usage } = options;

  const imageBuffer: ArrayBuffer = await ctx.runAction(
    api.generateImageWithGemini.generateImageWithGemini,
    {
      prompt,
      ...usage,
      ...(referenceStorageId
        ? {
            wizardImages: [referenceStorageId],
            wizardImageLabels: referenceLabel ? [referenceLabel] : undefined,
          }
        : {}),
    },
  );

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
