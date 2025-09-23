"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { generateText } from "./aiTextGeneration";

export const generateWizardIllustration = action({
  args: {
    wizardId: v.id("wizards"),
    name: v.string(),
    description: v.string(),
  },
  handler: async (ctx, { wizardId, name, description }) => {
    console.log(
      `Starting illustration generation for wizard ${wizardId} (${name})`
    );

    try {
      // Use AI to create a detailed illustration prompt
      const illustrationPrompt = `Create a very detailed image prompt for a low poly illustration of a wizard named "${name}" in an action pose that would fit this type of wizard. The wizard has this description: ${description}. Use Dynamic lighting and emphasize the wizard's power with magical particles and spell effects surrounding them. If it makes sense, have them holding a magical implement or familiar. Match the background to the wizard's theme. Only give me the image prompt, no other text.`;

      console.log("Generating enhanced prompt with AI...");
      const enhancedPrompt = await generateText(illustrationPrompt);

      console.log("Generated illustration text:", enhancedPrompt);

      // Generate the image using Fal with the AI-enhanced prompt
      const imageBuffer = await ctx.runAction(api.generateImage.generateImage, {
        prompt: enhancedPrompt,
      });

      // Store the image in Convex File Storage (Fal AI typically returns PNG)
      const storageId = await ctx.storage.store(
        new Blob([imageBuffer], { type: "image/png" })
      );

      // Update the wizard with the new illustration using internal mutation
      await ctx.runMutation(api.wizards.updateWizardInternal, {
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
