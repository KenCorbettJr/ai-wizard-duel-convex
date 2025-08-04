"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { generateImage } from "./generateImage";
import { api } from "./_generated/api";

export const generateWizardIllustration = action({
  args: {
    wizardId: v.id("wizards"),
    name: v.string(),
    description: v.string(),
  },
  handler: async (ctx, { wizardId, name, description }) => {
    console.log(`Starting illustration generation for wizard ${wizardId} (${name})`);
    
    try {
      // Create a detailed illustration prompt
      const enhancedPrompt = `Low poly illustration of a wizard named ${name}: ${description}. Dynamic lighting, magical particles, spell effects, action pose, magical implement, thematic background.`;

      console.log("Generating illustration with prompt:", enhancedPrompt);

      // Generate the image using Fal
      const imageBuffer = await generateImage(enhancedPrompt);

      // Store the image in Convex File Storage (Fal AI typically returns PNG)
      const storageId = await ctx.storage.store(new Blob([imageBuffer], { type: "image/png" }));

      // Update the wizard with the new illustration
      await ctx.runMutation(api.wizards.updateWizard, {
        wizardId,
        illustration: storageId,
      });

      console.log(`Successfully generated illustration for wizard ${wizardId}`);
      return { success: true, storageId };

    } catch (error) {
      console.error(`Error generating illustration for wizard ${wizardId}:`, error);
      
      // If it's an environment variable issue, provide helpful guidance
      if (error instanceof Error && error.message.includes("FAL_KEY")) {
        throw new Error("Image generation is not configured. Please add your FAL_KEY to the environment variables.");
      }
      
      throw new Error(`Failed to generate wizard illustration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});