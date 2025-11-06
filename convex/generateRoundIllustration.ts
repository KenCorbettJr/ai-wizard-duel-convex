"use node";

import { action, ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

export const generateRoundIllustration = action({
  args: {
    illustrationPrompt: v.string(),
    duelId: v.id("duels"),
    roundNumber: v.string(), // Can be "0" for introduction or actual round number
    useGemini: v.optional(v.boolean()), // Whether to use Gemini Nano Banana
    userId: v.optional(v.string()), // User ID for credit consumption
    skipImageGeneration: v.optional(v.boolean()), // Skip image generation for text-only mode
  },
  handler: async (
    ctx,
    {
      illustrationPrompt,
      duelId,
      roundNumber,
      useGemini = false,
      userId,
      skipImageGeneration = false,
    }
  ) => {
    console.log(
      `Starting illustration generation for duel ${duelId}, round ${roundNumber} ${useGemini ? "with Gemini Nano Banana" : "with FAL"} ${skipImageGeneration ? "(text-only mode)" : ""}`
    );

    try {
      // Get duel and wizard information
      const duel = await ctx.runQuery(api.duels.getDuel, { duelId });
      if (!duel) {
        throw new Error("Duel not found");
      }

      // If skipImageGeneration is true, just return success without generating image
      if (skipImageGeneration) {
        console.log(
          `Skipping image generation for duel ${duelId}, round ${roundNumber} (text-only mode)`
        );
        return { success: true, textOnlyMode: true };
      }

      // Check and consume image credits if userId is provided (only once per duel)
      if (userId) {
        const creditResult = await ctx.runMutation(
          api.imageCreditService.consumeImageCreditForDuel,
          {
            userId,
            duelId,
            metadata: {
              roundNumber,
              purpose: "duel_illustration",
            },
          }
        );

        if (!creditResult.success) {
          console.log(
            `User ${userId} has insufficient image credits for duel ${duelId} round ${roundNumber}, falling back to text-only mode. Reason: ${creditResult.reason}`
          );
          return {
            success: true,
            textOnlyMode: true,
            reason: "insufficient_credits",
          };
        }

        if (creditResult.alreadyConsumed) {
          console.log(
            `Image credit already consumed for duel ${duelId} (${creditResult.reason}), proceeding with image generation`
          );
        } else {
          console.log(
            `Consumed 1 image credit for user ${userId} for duel ${duelId} (covers all images in this duel)`
          );
        }
      }

      let imageBuffer: ArrayBuffer;
      let previousImage: string | undefined;

      if (useGemini) {
        // For Gemini Nano Banana, we need to handle different scenarios
        if (roundNumber === "0") {
          // Introduction round only: get both wizard illustrations
          const wizardImages = await getAllWizardIllustrations(
            ctx,
            duel.wizards
          );

          // Generate with Gemini Nano Banana using wizard images
          imageBuffer = await ctx.runAction(
            api.generateImageWithGemini.generateImageWithGemini,
            {
              prompt: illustrationPrompt,
              wizardImages,
              useGemini: true,
            }
          );
        } else {
          // All subsequent rounds: use previous round's illustration + wizard context
          previousImage = await getPreviousRoundIllustration(
            ctx,
            duelId,
            parseInt(roundNumber)
          );

          // Get wizard descriptions for context
          const wizardDescriptions = await getWizardDescriptions(
            ctx,
            duel.wizards
          );

          // Generate with Gemini Nano Banana using previous image and wizard context
          imageBuffer = await ctx.runAction(
            api.generateImageWithGemini.generateImageWithGemini,
            {
              prompt: illustrationPrompt,
              previousImage,
              wizardDescriptions,
              useGemini: true,
            }
          );
        }
      } else {
        // Use FAL (original approach)
        imageBuffer = await ctx.runAction(api.generateImage.generateImage, {
          prompt: illustrationPrompt,
          skipResize: process.env.NODE_ENV === "test", // Skip resize during tests
        });
      }

      // Apply additional resizing specifically for duel round illustrations (skip during tests)
      let finalImageBuffer = imageBuffer;

      if (process.env.NODE_ENV !== "test") {
        try {
          finalImageBuffer = await ctx.runAction(
            api.imageCompressionService.compressImage,
            {
              imageBuffer,
            }
          );
        } catch (resizeError) {
          console.warn(
            "Duel round illustration resize failed, using original:",
            resizeError
          );
          // Use original image if resize fails
        }
      }

      // Store the image in Convex File Storage
      const storageId = await ctx.storage.store(
        new Blob([finalImageBuffer], { type: "image/webp" })
      );

      // Find the round to update
      const rounds = await ctx.runQuery(api.duels.getDuelRounds, { duelId });
      const targetRound = rounds.find(
        (round: { roundNumber: number }) =>
          round.roundNumber.toString() === roundNumber
      );

      if (targetRound) {
        // Update the round with the illustration
        await ctx.runMutation(api.duels.updateRoundIllustration, {
          roundId: targetRound._id,
          illustration: storageId,
        });

        // If this is the introduction round, also set it as the featured illustration
        if (roundNumber === "0") {
          await ctx.runMutation(api.duels.updateFeaturedIllustration, {
            duelId,
            illustration: storageId,
          });
        }
      }

      console.log(
        `Successfully generated illustration for duel ${duelId}, round ${roundNumber}`
      );
      return { success: true, storageId, textOnlyMode: false };
    } catch (error) {
      console.error(
        `Error generating illustration for duel ${duelId}, round ${roundNumber}:`,
        error
      );

      // If image generation fails, fall back to text-only mode instead of throwing error
      console.log(
        `Falling back to text-only mode for duel ${duelId}, round ${roundNumber} due to image generation error`
      );
      return {
        success: true,
        textOnlyMode: true,
        reason: "image_generation_failed",
      };
    }
  },
});

// Helper function to get all wizard illustrations for the first round
async function getAllWizardIllustrations(
  ctx: ActionCtx,
  wizardIds: Id<"wizards">[]
): Promise<string[]> {
  try {
    // Get wizard data (using internal query to handle both regular wizards and campaign opponents)
    const wizards = await Promise.all(
      wizardIds.map((wizardId) =>
        ctx.runQuery(internal.wizards.getWizardInternal, { wizardId })
      )
    );

    // Extract all available wizard illustrations
    const illustrations: string[] = [];

    for (const wizard of wizards) {
      if (
        wizard &&
        typeof wizard === "object" &&
        "illustration" in wizard &&
        wizard.illustration
      ) {
        const w = wizard as { illustration: string };
        illustrations.push(w.illustration);
      }
    }

    return illustrations;
  } catch (error) {
    console.warn("Could not get wizard illustrations:", error);
    return [];
  }
}

// Helper function to get wizard descriptions for context in subsequent rounds
async function getWizardDescriptions(
  ctx: ActionCtx,
  wizardIds: Id<"wizards">[]
): Promise<Array<{ name: string; description: string }>> {
  try {
    // Get wizard data (using internal query to handle both regular wizards and campaign opponents)
    const wizards = await Promise.all(
      wizardIds.map((wizardId) =>
        ctx.runQuery(internal.wizards.getWizardInternal, { wizardId })
      )
    );

    // Extract wizard names and descriptions
    const descriptions: Array<{ name: string; description: string }> = [];

    for (const wizard of wizards) {
      if (
        wizard &&
        typeof wizard === "object" &&
        "name" in wizard &&
        "description" in wizard
      ) {
        const w = wizard as { name: string; description: string };
        descriptions.push({
          name: w.name,
          description: w.description,
        });
      }
    }

    return descriptions;
  } catch (error) {
    console.warn("Could not get wizard descriptions:", error);
    return [];
  }
}

// Helper function to get the previous round's illustration
async function getPreviousRoundIllustration(
  ctx: ActionCtx,
  duelId: Id<"duels">,
  currentRoundNumber: number
): Promise<string | undefined> {
  try {
    const rounds = (await ctx.runQuery(api.duels.getDuelRounds, {
      duelId,
    })) as unknown[];

    // Find the most recent completed round before the current one
    const previousRounds = rounds
      .filter((round: unknown) => {
        if (!round || typeof round !== "object") return false;
        const r = round as {
          roundNumber: number;
          status: string;
          outcome?: { illustration?: string };
        };
        return (
          r.roundNumber < currentRoundNumber &&
          r.status === "COMPLETED" &&
          r.outcome?.illustration
        );
      })
      .sort((a: unknown, b: unknown) => {
        const roundA = a as { roundNumber: number };
        const roundB = b as { roundNumber: number };
        return roundB.roundNumber - roundA.roundNumber;
      });

    if (previousRounds.length > 0) {
      const firstRound = previousRounds[0] as {
        outcome?: { illustration?: string };
      };
      return firstRound.outcome?.illustration;
    }

    return undefined;
  } catch (error) {
    console.warn("Could not get previous round illustration:", error);
    return undefined;
  }
}
