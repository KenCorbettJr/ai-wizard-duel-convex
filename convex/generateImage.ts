"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import * as fal from "@fal-ai/serverless-client";
import { api } from "./_generated/api";
import { captureServerEvent } from "./lib/posthog";
import { estimateImageCostUsd } from "./lib/aiPricing";
import { recordAIUsage } from "./lib/recordAIUsage";
import { imageAspectRatioValidator } from "./lib/imageProvider";

// flux/schnell takes a size rather than a ratio.
const SCHNELL_SIZES = {
  "1:1": "square_hd", // 1024x1024
  "3:2": { width: 1152, height: 768 },
} as const;

export const generateImage = action({
  args: {
    prompt: v.string(),
    skipResize: v.optional(v.boolean()), // Skip resizing for tests or when not needed
    referenceImageUrls: v.optional(v.array(v.string())), // Character/scene references; switches to a reference-image model
    userId: v.optional(v.string()), // For cost tracking
    sessionId: v.optional(v.string()), // For cost tracking
    aspectRatio: v.optional(imageAspectRatioValidator), // Default 1:1
  },
  returns: v.bytes(),
  handler: async (
    ctx,
    {
      prompt,
      skipResize = false,
      referenceImageUrls,
      userId,
      sessionId,
      aspectRatio = "1:1",
    },
  ): Promise<ArrayBuffer> => {
    const hasReferences = !!referenceImageUrls?.length;
    const model = hasReferences
      ? "fal-ai/flux-pro/kontext/multi"
      : "fal-ai/flux/schnell";
    let generated = false;
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

      // With references, use FLUX Kontext (multi-image) to keep characters
      // consistent. Otherwise use the fast text-to-image model.
      const result: FalImageResult = hasReferences
        ? await fal.subscribe("fal-ai/flux-pro/kontext/multi", {
            input: {
              prompt: prompt,
              image_urls: referenceImageUrls,
              aspect_ratio: aspectRatio,
              num_images: 1,
              output_format: "png",
              safety_tolerance: "5",
            },
          })
        : await fal.subscribe("fal-ai/flux/schnell", {
            input: {
              prompt: prompt,
              image_size: SCHNELL_SIZES[aspectRatio],
              num_inference_steps: 4,
              num_images: 1,
              enable_safety_checker: true,
            },
          });

      generated = true;

      // Get the image URL from the result
      const imageUrl = result.images?.[0]?.url;
      await recordAIUsage(ctx, {
        feature: "generate_image_fal",
        provider: "fal",
        model,
        kind: "image",
        imageCount: imageUrl ? 1 : 0,
        costUsd: imageUrl ? estimateImageCostUsd(model, 1) : 0,
        userId,
        sessionId,
        success: !!imageUrl,
      });
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
      if (!generated) {
        await recordAIUsage(ctx, {
          feature: "generate_image_fal",
          provider: "fal",
          model,
          kind: "image",
          imageCount: 0,
          costUsd: 0,
          userId,
          sessionId,
          success: false,
        });
      }
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
