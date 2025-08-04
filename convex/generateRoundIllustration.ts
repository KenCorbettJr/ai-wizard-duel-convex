"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { generateImage } from "./generateImage";
import { api } from "./_generated/api";

export const generateRoundIllustration = action({
  args: {
    illustrationPrompt: v.string(),
    duelId: v.id("duels"),
    roundNumber: v.string(), // Can be "0" for introduction or actual round number
  },
  handler: async (ctx, { illustrationPrompt, duelId, roundNumber }) => {
    console.log(
      `Starting illustration generation for duel ${duelId}, round ${roundNumber}`,
    );

    try {
      // Generate the image using Fal
      const imageBuffer = await generateImage(illustrationPrompt);

      // Store the image in Convex File Storage
      const storageId = await ctx.storage.store(
        new Blob([imageBuffer], { type: "image/png" }),
      );

      // Find the round to update
      const rounds = await ctx.runQuery(api.duels.getDuelRounds, { duelId });
      const targetRound = rounds.find(
        (round) => round.roundNumber.toString() === roundNumber,
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
        `Successfully generated illustration for duel ${duelId}, round ${roundNumber}`,
      );
      return { success: true, storageId };
    } catch (error) {
      console.error(
        `Error generating illustration for duel ${duelId}, round ${roundNumber}:`,
        error,
      );
      throw new Error(
        `Failed to generate round illustration: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  },
});
