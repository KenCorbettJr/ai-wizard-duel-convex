"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import * as fal from "@fal-ai/serverless-client";

export const generateImage = action({
  args: { prompt: v.string() },
  returns: v.bytes(),
  handler: async (_ctx, { prompt }): Promise<ArrayBuffer> => {
    try {
      // Get FAL API key from environment
      const falKey = process.env.FAL_KEY;
      if (!falKey) {
        console.error("FAL_KEY environment variable is not set");
        throw new Error(
          "FAL_KEY environment variable is not set. Please add it to your environment variables.",
        );
      }

      // Configure fal client with API key
      fal.config({
        credentials: falKey,
      });

      interface FalImageResult {
        images?: Array<{
          url?: string;
        }>;
      }

      const result: FalImageResult = await fal.subscribe(
        "fal-ai/flux/schnell",
        {
          input: {
            prompt: prompt,
            image_size: "square_hd", // 1024x1024
            num_inference_steps: 4,
            num_images: 1,
            enable_safety_checker: true,
          },
        },
      );

      // Get the image URL from the result
      const imageUrl = result.images?.[0]?.url;
      if (!imageUrl) {
        throw new Error("No image generated from Fal service");
      }

      // Fetch the image data
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch generated image: ${response.statusText}`,
        );
      }

      const imageBuffer = await response.arrayBuffer();

      return imageBuffer;
    } catch (error) {
      console.error(error);
      throw new Error(
        `Image generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  },
});
