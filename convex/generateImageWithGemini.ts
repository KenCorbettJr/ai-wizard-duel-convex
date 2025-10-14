"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { getGemni25FlashImageAI } from "./ai/getAI";
import { isEmulatorMode } from "./mocks/mockServices";

export const generateImageWithGemini = action({
  args: {
    prompt: v.string(),
    previousImage: v.optional(v.string()), // Storage ID of previous image
    wizardImages: v.optional(v.array(v.string())), // Storage IDs of wizard images for introduction round
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
        );
      } else {
        // Fallback to FAL
        return await ctx.runAction(api.generateImage.generateImage, { prompt });
      }
    } catch (error) {
      console.error("Image generation failed:", error);
      // Fallback to FAL if Gemini fails
      if (useGemini) {
        console.log("Falling back to FAL after Gemini failure");
        return await ctx.runAction(api.generateImage.generateImage, { prompt });
      }
      throw error;
    }
  },
});

async function generateWithGeminiFlash(
  ctx: { storage: { getUrl: (id: string) => Promise<string | null> } },
  prompt: string,
  previousImage?: string,
  wizardImages?: string[],
  wizardDescriptions?: Array<{ name: string; description: string }>,
): Promise<ArrayBuffer> {
  // Check if we're in emulator mode
  if (isEmulatorMode()) {
    console.log("🎭 Using mock Gemini image generation (emulator mode)");
    return generateMockImageBuffer();
  }

  try {
    const ai = getGemni25FlashImageAI();

    // Build the prompt with context
    let enhancedPrompt = prompt;

    // Prepare media inputs for the AI
    const mediaInputs: Array<{ url: string }> = [];

    // Handle different image input scenarios
    if (wizardImages && wizardImages.length > 0) {
      // Introduction round: use wizard images as reference
      try {
        for (const wizardImageId of wizardImages) {
          const imageUrl = await ctx.storage.getUrl(wizardImageId);
          if (imageUrl) {
            mediaInputs.push({ url: imageUrl });
          }
        }

        if (mediaInputs.length > 0) {
          enhancedPrompt = `${prompt}. Use the wizard(s) from the reference image(s) and create an epic magical arena scene with both wizards positioned as opponents ready to duel. Generate a new image in low poly art style.`;
        }
      } catch (error) {
        console.warn("Could not load wizard images:", error);
      }
    } else if (previousImage) {
      // Subsequent rounds: use previous image as reference
      try {
        const imageUrl = await ctx.storage.getUrl(previousImage);
        if (imageUrl) {
          mediaInputs.push({ url: imageUrl });

          // Enhance prompt with wizard descriptions for better context
          enhancedPrompt = `${prompt}. Continue the scene from the reference image, showing the progression of the magical duel. Maintain the arena setting and wizard positions while showing the new magical effects.`;

          if (wizardDescriptions && wizardDescriptions.length > 0) {
            const wizardContext = wizardDescriptions
              .map((w) => `${w.name}: ${w.description}`)
              .join(". ");
            enhancedPrompt += ` The wizards in this scene are: ${wizardContext}. Make sure to maintain their visual characteristics and identities from the previous image.`;
          }

          enhancedPrompt += ` Generate a new image that builds upon the reference image in low poly art style.`;
        }
      } catch (error) {
        console.warn("Could not load previous image:", error);
      }
    }

    // Generate image using Gemini
    // For now, we'll use a simple text prompt approach since image generation
    // with Gemini may require different API patterns
    const response = await ai.generate({
      prompt: enhancedPrompt,
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
          return await imageResponse.arrayBuffer();
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
          return imageBuffer.buffer;
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
            return imageBuffer.buffer;
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
              | { url?: string; data?: string }
              | undefined;
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
