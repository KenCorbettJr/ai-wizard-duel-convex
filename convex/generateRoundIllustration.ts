"use node";

import { internalAction, ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { withDuelNames } from "./lib/duelWizardNames";
import { Id } from "./_generated/dataModel";
import { DUEL_SCENE_ASPECT_RATIO } from "./lib/imageProvider";

export const generateRoundIllustration = internalAction({
  args: {
    illustrationPrompt: v.string(),
    duelId: v.id("duels"),
    roundNumber: v.string(), // Can be "0" for introduction or actual round number
    // Ignored. Still accepted so jobs scheduled before it was removed run.
    useGemini: v.optional(v.boolean()),
    userId: v.optional(v.string()), // User ID for credit consumption
    skipImageGeneration: v.optional(v.boolean()), // Skip image generation for text-only mode
  },
  handler: async (
    ctx,
    {
      illustrationPrompt,
      duelId,
      roundNumber,
      userId,
      skipImageGeneration = false,
    },
  ) => {
    const setStatus = (status: "PENDING" | "FAILED" | null) =>
      ctx.runMutation(internal.roundMedia.setRoundIllustrationStatus, {
        duelId,
        roundNumber: Number(roundNumber),
        status,
      });

    console.log(
      `Starting illustration generation for duel ${duelId}, round ${roundNumber} ${skipImageGeneration ? "(text-only mode)" : ""}`,
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
          `Skipping image generation for duel ${duelId}, round ${roundNumber} (text-only mode)`,
        );
        return { success: true, textOnlyMode: true };
      }

      await setStatus("PENDING");

      // Players already paid a token when the duel started, so there is no
      // per-image credit check here.

      let imageBuffer: ArrayBuffer;
      let previousImage: string | undefined;

      // Every round gets the plain-background wizard images as character
      // references. Later rounds also get the previous scene for continuity.
      const wizardRefs = await getWizardReferences(ctx, duel.wizards);

      if (roundNumber === "0") {
        imageBuffer = await ctx.runAction(
          api.generateImageWithGemini.generateImageWithGemini,
          {
            prompt: illustrationPrompt,
            wizardImages: wizardRefs.storageIds,
            wizardImageLabels: wizardRefs.labels,
            userId,
            sessionId: `duel-${duelId}`,
            feature: "generate_duel_illustration",
            aspectRatio: DUEL_SCENE_ASPECT_RATIO,
            referenceStyle: "scene",
          },
        );
      } else {
        previousImage = await getPreviousRoundIllustration(
          ctx,
          duelId,
          parseInt(roundNumber),
        );

        const wizardDescriptions = await getWizardDescriptions(
          ctx,
          duel.wizards,
        );

        imageBuffer = await ctx.runAction(
          api.generateImageWithGemini.generateImageWithGemini,
          {
            prompt: illustrationPrompt,
            previousImage,
            wizardImages: wizardRefs.storageIds,
            wizardImageLabels: wizardRefs.labels,
            wizardDescriptions,
            userId,
            sessionId: `duel-${duelId}`,
            feature: "generate_duel_illustration",
            aspectRatio: DUEL_SCENE_ASPECT_RATIO,
            referenceStyle: "scene",
          },
        );
      }

      // Apply additional resizing specifically for duel round illustrations (skip during tests)
      let finalImageBuffer = imageBuffer;

      if (process.env.NODE_ENV !== "test") {
        try {
          finalImageBuffer = await ctx.runAction(
            api.imageCompressionService.compressImage,
            {
              imageBuffer,
            },
          );
        } catch (resizeError) {
          console.warn(
            "Duel round illustration resize failed, using original:",
            resizeError,
          );
          // Use original image if resize fails
        }
      }

      // Store the image in Convex File Storage
      const storageId = await ctx.storage.store(
        new Blob([finalImageBuffer], { type: "image/webp" }),
      );

      // Find the round to update
      const rounds = await ctx.runQuery(api.duels.getDuelRounds, { duelId });
      const targetRound = rounds.find(
        (round: { roundNumber: number }) =>
          round.roundNumber.toString() === roundNumber,
      );

      if (targetRound) {
        // Update the round with the illustration
        await ctx.runMutation(internal.duels.updateRoundIllustration, {
          roundId: targetRound._id,
          illustration: storageId,
        });
        // updateRoundIllustration also refreshes the duel's featured image
        await setStatus(null);
      }

      console.log(
        `Successfully generated illustration for duel ${duelId}, round ${roundNumber}`,
      );
      return { success: true, storageId, textOnlyMode: false };
    } catch (error) {
      console.error(
        `Error generating illustration for duel ${duelId}, round ${roundNumber}:`,
        error,
      );

      // Mark the round so the duelists can retry it from the duel page.
      try {
        await setStatus("FAILED");
      } catch (statusError) {
        console.error("Could not mark illustration as failed:", statusError);
      }

      // If image generation fails, fall back to text-only mode instead of throwing error
      console.log(
        `Falling back to text-only mode for duel ${duelId}, round ${roundNumber} due to image generation error`,
      );
      return {
        success: true,
        textOnlyMode: true,
        reason: "image_generation_failed",
      };
    }
  },
});

// Get the character reference image for each wizard. Prefers the plain-background
// image; falls back to the display illustration for wizards created before it existed.
async function getWizardReferences(
  ctx: ActionCtx,
  wizardIds: Id<"wizards">[],
): Promise<{ storageIds: string[]; labels: string[] }> {
  const storageIds: string[] = [];
  const labels: string[] = [];
  try {
    const wizards = await withDuelNames(
      ctx,
      await Promise.all(
        wizardIds.map((wizardId) =>
          ctx.runQuery(internal.wizards.getWizardInternal, { wizardId }),
        ),
      ),
    );
    for (const wizard of wizards) {
      const storageId = wizard?.plainIllustration ?? wizard?.illustration;
      if (wizard && storageId) {
        storageIds.push(storageId);
        labels.push(wizard.name);
      }
    }
  } catch (error) {
    console.warn("Could not get wizard reference images:", error);
  }
  return { storageIds, labels };
}

// Helper function to get wizard descriptions for context in subsequent rounds
async function getWizardDescriptions(
  ctx: ActionCtx,
  wizardIds: Id<"wizards">[],
): Promise<Array<{ name: string; description: string }>> {
  try {
    // Get wizard data (using internal query to handle both regular wizards and campaign opponents)
    const wizards = await withDuelNames(
      ctx,
      await Promise.all(
        wizardIds.map((wizardId) =>
          ctx.runQuery(internal.wizards.getWizardInternal, { wizardId }),
        ),
      ),
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
  currentRoundNumber: number,
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
