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
    try {
      // Create a detailed illustration prompt
      const illustrationPrompt = `Create a very detailed image prompt for a low poly illustration of a wizard named "${name}" in an action pose that would fit this type of wizard. The wizard has this description: ${description}. Use Dynamic lighting and emphasize the wizard's power with magical particles and spell effects surrounding them. If it makes sense, have them holding a magical implement or familiar. Match the background to the wizard's theme. Only give me the image prompt, no other text.`;

      // For now, we'll use the description directly as the prompt
      // In a production app, you might want to use an AI service to enhance the prompt
      const enhancedPrompt = `Low poly illustration of a wizard named ${name}: ${description}. Dynamic lighting, magical particles, spell effects, action pose, magical implement, thematic background.`;

      console.log("Generating illustration with prompt:", enhancedPrompt);

      // Get FAL API key from environment
      const falKey = process.env.FAL_KEY;
      if (!falKey) {
        throw new Error("FAL_KEY environment variable is not set");
      }

      // Generate the image using Fal
      const imageBuffer = await generateImage(enhancedPrompt, falKey);

      // Store the image in Convex File Storage
      const storageId = await ctx.storage.store(new Blob([imageBuffer], { type: "image/webp" }));

      // Update the wizard with the new illustration
      await ctx.runMutation(api.wizards.updateWizard, {
        wizardId,
        illustration: storageId,
      });

      console.log(`Successfully generated illustration for wizard ${wizardId}`);
      return { success: true, storageId };

    } catch (error) {
      console.error(`Error generating illustration for wizard ${wizardId}:`, error);
      throw new Error(`Failed to generate wizard illustration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});