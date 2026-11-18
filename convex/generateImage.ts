"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import * as fal from "@fal-ai/serverless-client";
import { api } from "./_generated/api";
import { captureServerEvent } from "./lib/posthog";

export const generateImage = action({
  args: {
    prompt: v.string(),
    skipResize: v.optional(v.boolean()), // Skip resizing for tests or when not needed
    referenceImageUrls: v.optional(v.array(v.string())), // Character/scene references; switches to a reference-image model
  },
  returns: v.bytes(),
  handler: async (
    ctx,
    { prompt, skipResize = false, referenceImageUrls },
  ): Promise<ArrayBuffer> => {
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

      const hasReferences = !!referenceImageUrls?.length;
      // With references, use FLUX Kontext (multi-image) to keep characters
      // consistent. Otherwise use the fast text-to-image model.
      const result: FalImageResult = hasReferences
        ? await fal.subscribe("fal-ai/flux-pro/kontext/multi", {
            input: {
              prompt: prompt,
              image_urls: referenceImageUrls,
              aspect_ratio: "1:1",
              num_images: 1,
              output_format: "png",
              safety_tolerance: "5",
            },
          })
        : await fal.subscribe("fal-ai/flux/schnell", {
            input: {
              prompt: prompt,
              image_size: "square_hd", // 1024x1024
              num_inference_steps: 4,
              num_images: 1,
              enable_safety_checker: true,
            },
          });

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

      // Optionally resize the image to a smaller size to reduce storage and bandwidth
      if (!skipResize) {
        try {
          const resizedImageBuffer = await ctx.runAction(
            api.imageCompressionService.compressImage,
            {
              imageBuffer,
            },
          );
          return resizedImageBuffer;
        } catch (resizeError) {
          console.warn(
            "Image resize failed, returning original image:",
            resizeError,
          );
          // Fall back to original image if resize fails
          return imageBuffer;
        }
      }

      return imageBuffer;
    } catch (error) {
      console.error(error);
      const apiError = error as { status?: number; body?: { detail?: string } };
      const status = apiError?.status;
      const isBilling =
        status === 402 ||
        status === 403 ||
        /balance|locked|billing/i.test(apiError?.body?.detail ?? "");
      await captureServerEvent(
        isBilling ? "fal_billing_error" : "image_generation_failed",
        {
          provider: "fal",
          status,
          detail: apiError?.body?.detail,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw new Error(
        `Image generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  },
});
