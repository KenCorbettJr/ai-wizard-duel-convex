"use node";

import { action, ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { getGeminiImageAI } from "./ai/getAI";
import { isEmulatorMode } from "./mocks/mockServices";

export const generateImageWithGemini = action({
  args: {
    prompt: v.string(),
    previousImage: v.optional(v.string()), // Storage ID of previous image
    wizardImages: v.optional(v.array(v.string())), // Storage IDs of plain-background wizard images (character references)
    wizardImageLabels: v.optional(v.array(v.string())), // Wizard names, parallel to wizardImages
    wizardDescriptions: v.optional(
      v.array(
        v.object({
          name: v.string(),
          description: v.string(),
        }),
      ),
    ), // Wizard descriptions for context in subsequent rounds
    useGemini: v.optional(v.boolean()), // Whether to use Gemini Nano Banana
  },
  returns: v.bytes(),
  handler: async (
    ctx,
    {
      prompt,
      previousImage,
      wizardImages,
      wizardImageLabels,
      wizardDescriptions,
      useGemini = false,
    },
  ): Promise<ArrayBuffer> => {
    try {
      if (useGemini && process.env.GOOGLE_API_KEY) {
        return await generateWithGeminiFlash(
          ctx,
          prompt,
          previousImage,
          wizardImages,
          wizardDescriptions,
          wizardImageLabels,
        );
      } else {
        // Fallback to FAL
        return await ctx.runAction(api.generateImage.generateImage, {
          prompt,
          skipResize: process.env.NODE_ENV === "test", // Skip resize during tests
        });
      }
    } catch (error) {
      console.error("Image generation failed:", error);
      // Fallback to FAL if Gemini fails
      if (useGemini) {
        console.log("Falling back to FAL after Gemini failure");
        return await ctx.runAction(api.generateImage.generateImage, {
          prompt,
          skipResize: process.env.NODE_ENV === "test", // Skip resize during tests
        });
      }
      throw error;
    }
  },
});

async function generateWithGeminiFlash(
  ctx: ActionCtx,
  prompt: string,
  previousImage?: string,
  wizardImages?: string[],
  wizardDescriptions?: Array<{ name: string; description: string }>,
  wizardImageLabels?: string[],
): Promise<ArrayBuffer> {
  // Check if we're in emulator mode
  if (isEmulatorMode()) {
    console.log("🎭 Using mock Gemini image generation (emulator mode)");
    return generateMockImageBuffer();
  }

  try {
    const ai = getGeminiImageAI();

    // Build the multimodal prompt. Gemini only sees images that are passed as
    // media parts, so every reference is loaded from storage and sent inline.
    type PromptPart =
      { text: string } | { media: { url: string; contentType: string } };
    const parts: PromptPart[] = [];

    // Character references: each wizard on a plain background
    const hasWizardRefs = !!wizardImages && wizardImages.length > 0;
    if (hasWizardRefs) {
      for (let i = 0; i < wizardImages.length; i++) {
        const media = await loadStorageImageAsMedia(ctx, wizardImages[i]);
        if (!media) continue;
        const label = wizardImageLabels?.[i] ?? `Wizard ${i + 1}`;
        parts.push({
          text: `Appearance reference for ${label}. Use it only to copy the character's look:`,
        });
        parts.push({ media });
      }
    }

    // Scene continuity: previous round image
    let hasPreviousScene = false;
    if (previousImage) {
      const media = await loadStorageImageAsMedia(ctx, previousImage);
      if (media) {
        hasPreviousScene = true;
        parts.push({ text: "Previous scene of the duel:" });
        parts.push({ media });
      }
    }

    let enhancedPrompt = prompt;
    if (parts.length > 0) {
      const instructions: string[] = [prompt];
      if (hasWizardRefs) {
        instructions.push(
          "Create ONE single full-frame illustration of ONE scene, as described above, with the wizard(s) drawn from the appearance reference image(s). Keep each wizard's face, fur or skin, hair, clothing, colors, props and overall design exactly as in their reference. Change only the pose, lighting and surroundings. The reference images only show what the character looks like: do NOT reproduce their layout, white or gray background, or framing. Do NOT make a character sheet, turnaround, multiple views, panels, collage, labels, or any text. The scene background must fill the entire image edge to edge.",
        );
      }
      if (hasPreviousScene) {
        instructions.push(
          "Continue the arena setting and positions from the previous scene while showing the new magical effects.",
        );
      }
      if (wizardDescriptions && wizardDescriptions.length > 0) {
        const wizardContext = wizardDescriptions
          .map((w) => `${w.name}: ${w.description}`)
          .join(". ");
        instructions.push(`The wizards are: ${wizardContext}.`);
      }
      instructions.push("Generate a new image in low poly art style.");
      enhancedPrompt = instructions.join(" ");
    }

    const response = await ai.generate({
      prompt:
        parts.length > 0
          ? [...parts, { text: enhancedPrompt }]
          : enhancedPrompt,
      config: {
        temperature: 0.8,
        maxOutputTokens: 4096,
        responseModalities: ["IMAGE"],
      },
    });

    // Extract image data from response
    // Based on the error log, the image is in response.message.content array
    if (response.message && response.message.content) {
      for (const contentItem of response.message.content) {
        // Look for media content (images)
        if (contentItem.media && contentItem.media.url) {
          // Fetch the image from the URL
          const imageResponse = await fetch(contentItem.media.url);
          if (!imageResponse.ok) {
            throw new Error(
              `Failed to fetch generated image: ${imageResponse.statusText}`,
            );
          }
          const imageBuffer = await imageResponse.arrayBuffer();

          // Resize the image to reduce size
          const resizedImageBuffer = await ctx.runAction(
            api.imageCompressionService.compressImage,
            { imageBuffer },
          );

          return resizedImageBuffer;
        }

        // Also check for base64 data in media (type assertion needed)
        const mediaItem = contentItem.media as { data?: string; url?: string };
        if (mediaItem && mediaItem.data) {
          // If the image is provided as base64 data
          const base64Data = mediaItem.data.replace(
            /^data:image\/[^;]+;base64,/,
            "",
          );
          const imageBuffer = Buffer.from(base64Data, "base64");

          // Resize the image to reduce size
          const resizedImageBuffer = await ctx.runAction(
            api.imageCompressionService.compressImage,
            { imageBuffer: imageBuffer.buffer },
          );

          return resizedImageBuffer;
        }

        // Check if it's inline base64 in text (type assertion needed)
        const textItem = contentItem as { text?: string };
        if (textItem.text) {
          const base64Match = textItem.text.match(
            /data:image\/[^;]+;base64,([^"]+)/,
          );
          if (base64Match) {
            const base64Data = base64Match[1];
            const imageBuffer = Buffer.from(base64Data, "base64");

            // Resize the image to reduce size
            const resizedImageBuffer = await ctx.runAction(
              api.imageCompressionService.compressImage,
              { imageBuffer: imageBuffer.buffer },
            );

            return resizedImageBuffer;
          }
        }
      }
    }

    // Log the response structure for debugging
    console.error(
      "Could not find image in Gemini response. Response structure:",
      {
        hasMessage: !!response.message,
        hasContent: !!(response.message && response.message.content),
        contentLength: response.message?.content?.length || 0,
        contentTypes:
          response.message?.content?.map((item: unknown) =>
            Object.keys(item as object),
          ) || [],
        usage: response.usage,
        // Log the actual content items for debugging
        contentItems:
          response.message?.content?.map((item: unknown) => {
            const obj = item as { media?: unknown; text?: string };
            const media = obj.media as
              { url?: string; data?: string } | undefined;
            return {
              hasMedia: !!obj.media,
              hasText: !!obj.text,
              mediaKeys: media ? Object.keys(media) : [],
              mediaUrl: media?.url,
              hasMediaData: !!media?.data,
            };
          }) || [],
      },
    );

    throw new Error("No image found in Gemini response");
  } catch (error) {
    console.error("Gemini image generation failed:", error);
    throw new Error(
      `Gemini image generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

// Load a stored image and return it as an inline data URL for Gemini.
async function loadStorageImageAsMedia(
  ctx: ActionCtx,
  storageId: string,
): Promise<{ url: string; contentType: string } | null> {
  try {
    const blob = await ctx.storage.get(storageId as Id<"_storage">);
    if (!blob) return null;
    const contentType = blob.type || "image/webp";
    const base64 = Buffer.from(await blob.arrayBuffer()).toString("base64");
    return { url: `data:${contentType};base64,${base64}`, contentType };
  } catch (error) {
    console.warn(`Could not load reference image ${storageId}:`, error);
    return null;
  }
}

// Mock image generation for emulator mode
function generateMockImageBuffer(): ArrayBuffer {
  // Create a simple 1x1 pixel PNG as a mock image
  const mockPngData = new Uint8Array([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a, // PNG signature
    0x00,
    0x00,
    0x00,
    0x0d,
    0x49,
    0x48,
    0x44,
    0x52, // IHDR chunk
    0x00,
    0x00,
    0x00,
    0x01,
    0x00,
    0x00,
    0x00,
    0x01, // 1x1 dimensions
    0x08,
    0x02,
    0x00,
    0x00,
    0x00,
    0x90,
    0x77,
    0x53, // bit depth, color type, etc.
    0xde,
    0x00,
    0x00,
    0x00,
    0x0c,
    0x49,
    0x44,
    0x41, // IDAT chunk
    0x54,
    0x08,
    0xd7,
    0x63,
    0xf8,
    0x0f,
    0x00,
    0x00, // image data
    0x01,
    0x00,
    0x01,
    0x5c,
    0xc2,
    0xd5,
    0x7a,
    0x00, // checksum
    0x00,
    0x00,
    0x00,
    0x49,
    0x45,
    0x4e,
    0x44,
    0xae, // IEND chunk
    0x42,
    0x60,
    0x82,
  ]);
  return mockPngData.buffer;
}
