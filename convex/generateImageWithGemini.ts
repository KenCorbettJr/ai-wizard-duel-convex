"use node";

import { action, ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { getGeminiImageAI } from "./ai/getAI";
import { isEmulatorMode } from "./mocks/mockServices";
import { captureAIGeneration, captureServerEvent } from "./lib/posthog";
import { generateObject } from "./aiTextGeneration";
import { estimateTokenCostUsd } from "./lib/aiPricing";
import { recordAIUsage } from "./lib/recordAIUsage";
import { generateWithBfl, BFL_IMAGE_MODEL } from "./lib/bflImage";
import {
  isBflEnabled,
  isGeminiImageEnabled,
  imageAspectRatioValidator,
  type ImageAspectRatio,
} from "./lib/imageProvider";
import {
  wizardReferenceInstructions,
  wizardDescriptionsLine,
  PREVIOUS_SCENE_INSTRUCTION,
  referenceStyleValidator,
  type ReferenceStyle,
} from "./lib/referenceImageRules";

const GEMINI_IMAGE_MODEL = "gemini-3.1-flash-lite-image";
// The smallest generated image is several hundred tokens (1K is 1120).
const MIN_IMAGE_TOKENS = 256;

interface UsageContext {
  userId?: string;
  sessionId?: string;
  // Cost-tracking feature name, e.g. generate_duel_illustration
  feature?: string;
}
import { z } from "genkit/beta";

// Attempt 1 uses the original prompt. Attempt 2 uses a prompt rewritten to
// remove named/copyrighted characters, which is the most likely refusal cause.
const GEMINI_MAX_ATTEMPTS = 2;
const BFL_MAX_ATTEMPTS = 2;

type WizardDescription = { name: string; description: string };

const rewriteSchema = z.object({
  prompt: z.string(),
  descriptions: z.array(
    z.object({ name: z.string(), description: z.string() }),
  ),
});

// Rewrites the prompt and wizard descriptions so they describe only visual
// traits and never name or imply existing copyrighted characters or franchises.
async function rewriteForImageSafety(
  ctx: ActionCtx,
  usage: UsageContext,
  prompt: string,
  descriptions?: WizardDescription[],
): Promise<{ prompt: string; descriptions?: WizardDescription[] } | null> {
  try {
    const result = await generateObject(
      JSON.stringify({ prompt, descriptions: descriptions ?? [] }),
      rewriteSchema,
      `You rewrite text prompts for an image generator that refuses prompts resembling copyrighted characters. Rewrite the "prompt" and each wizard "description" so they describe only original visual traits (clothing, colors, props, pose, magical effects, setting). Remove or replace any names of existing characters, actors, franchises, brands or places with generic visual descriptions. Keep each wizard's "name" unchanged, keep the same meaning, scene and action, and keep the order and number of descriptions. Return JSON with the same shape as the input.`,
      { temperature: 0.3, maxTokens: 2048 },
      {
        spanName: "rewrite_image_prompt",
        usageCtx: ctx,
        distinctId: usage.userId,
        sessionId: usage.sessionId,
      },
    );
    const descs = descriptions
      ? descriptions.map((d, i) => ({
          name: d.name,
          description: result.descriptions[i]?.description ?? d.description,
        }))
      : undefined;
    return { prompt: result.prompt || prompt, descriptions: descs };
  } catch (error) {
    console.warn("Prompt rewrite failed, using original prompt:", error);
    return null;
  }
}

class GeminiNoImageError extends Error {
  constructor(
    message: string,
    public details: Record<string, unknown>,
  ) {
    super(message);
  }
}

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
    userId: v.optional(v.string()), // For cost tracking
    sessionId: v.optional(v.string()), // For cost tracking
    feature: v.optional(v.string()), // Cost-tracking feature name (default generate_wizard_image)
    aspectRatio: v.optional(imageAspectRatioValidator), // Default 1:1
    // "scene" lets the wizards change pose and form; default "exact"
    referenceStyle: v.optional(referenceStyleValidator),
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
      userId,
      sessionId,
      feature,
      aspectRatio = "1:1",
      referenceStyle = "exact",
    },
  ): Promise<ArrayBuffer> => {
    const usage: UsageContext = { userId, sessionId, feature };
    const started = Date.now();
    const baseProps = {
      hasWizardRefs: (wizardImages?.length ?? 0) > 0,
      hasPreviousImage: !!previousImage,
      wizardCount: wizardImages?.length ?? 0,
      promptLength: prompt.length,
    };

    // Rewritten prompt, computed lazily on the first retry and reused by the next provider
    let rewritten: Awaited<ReturnType<typeof rewriteForImageSafety>> = null;

    // Gemini goes first. Black Forest Labs FLUX 3 Klein is the fallback.
    // Each provider gets a second attempt with a rewritten prompt.
    type Provider = {
      name: "gemini" | "bfl";
      model?: string;
      maxAttempts: number;
      run: (
        promptText: string,
        descriptions: WizardDescription[] | undefined,
      ) => Promise<ArrayBuffer>;
    };
    const providers: Provider[] = [];
    if (isGeminiImageEnabled()) {
      providers.push({
        name: "gemini",
        maxAttempts: GEMINI_MAX_ATTEMPTS,
        run: (promptText, descriptions) =>
          generateWithGeminiFlash(
            ctx,
            promptText,
            previousImage,
            wizardImages,
            descriptions,
            wizardImageLabels,
            usage,
            aspectRatio,
            referenceStyle,
          ),
      });
    }
    if (isBflEnabled()) {
      providers.push({
        name: "bfl",
        model: BFL_IMAGE_MODEL,
        maxAttempts: BFL_MAX_ATTEMPTS,
        run: async (promptText, descriptions) =>
          isEmulatorMode()
            ? generateMockImageBuffer()
            : await generateWithBfl(
                ctx,
                {
                  prompt: promptText,
                  previousImage,
                  wizardImages,
                  wizardImageLabels,
                  wizardDescriptions: descriptions,
                  aspectRatio,
                  referenceStyle,
                },
                usage,
              ),
      });
    }

    if (providers.length === 0) {
      const message =
        "No image provider is configured. Set GOOGLE_API_KEY or BFL_API_KEY.";
      await captureServerEvent("image_generation_all_providers_failed", {
        ...baseProps,
        error: message,
        durationMs: Date.now() - started,
      });
      throw new Error(message);
    }

    let lastError: unknown;
    for (const [index, provider] of providers.entries()) {
      if (index > 0) {
        const previous = providers[index - 1].name;
        console.log(`${previous} exhausted, trying ${provider.name}`);
        await captureServerEvent(`image_generation_fallback_from_${previous}`, {
          ...baseProps,
          to: provider.name,
          error:
            lastError instanceof Error ? lastError.message : String(lastError),
        });
      }
      for (let attempt = 1; attempt <= provider.maxAttempts; attempt++) {
        const useRewrite = attempt > 1;
        try {
          if (useRewrite && !rewritten) {
            rewritten = await rewriteForImageSafety(
              ctx,
              usage,
              prompt,
              wizardDescriptions,
            );
          }
          const result = await provider.run(
            useRewrite && rewritten ? rewritten.prompt : prompt,
            useRewrite && rewritten
              ? rewritten.descriptions
              : wizardDescriptions,
          );
          await captureServerEvent("image_generation_succeeded", {
            ...baseProps,
            provider: provider.name,
            model: provider.model,
            attempt,
            usedRewrittenPrompt: useRewrite && !!rewritten,
            durationMs: Date.now() - started,
          });
          return result;
        } catch (error) {
          lastError = error;
          const details =
            error instanceof GeminiNoImageError ? error.details : {};
          console.error(
            `${provider.name} attempt ${attempt}/${provider.maxAttempts} failed:`,
            error,
          );
          await captureServerEvent("image_generation_failed", {
            ...baseProps,
            provider: provider.name,
            model: provider.model,
            attempt,
            usedRewrittenPrompt: useRewrite && !!rewritten,
            willRetry: attempt < provider.maxAttempts,
            error: error instanceof Error ? error.message : String(error),
            ...details,
          });
        }
      }
    }

    // Every provider failed
    await captureServerEvent("image_generation_all_providers_failed", {
      ...baseProps,
      error: lastError instanceof Error ? lastError.message : String(lastError),
      durationMs: Date.now() - started,
    });
    throw lastError instanceof Error
      ? lastError
      : new Error("Image generation failed");
  },
});

async function generateWithGeminiFlash(
  ctx: ActionCtx,
  prompt: string,
  previousImage?: string,
  wizardImages?: string[],
  wizardDescriptions?: Array<{ name: string; description: string }>,
  wizardImageLabels?: string[],
  usage: UsageContext = {},
  aspectRatio: ImageAspectRatio = "1:1",
  referenceStyle: ReferenceStyle = "exact",
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
        parts.push({
          text: "Previous scene of the duel (for setting and continuity only, do not repeat its camera angle):",
        });
        parts.push({ media });
      }
    }

    let enhancedPrompt = prompt;
    if (parts.length > 0) {
      const instructions: string[] = [prompt];
      if (hasWizardRefs) {
        instructions.push(wizardReferenceInstructions(referenceStyle));
      }
      if (hasPreviousScene) {
        instructions.push(PREVIOUS_SCENE_INSTRUCTION);
      }
      if (wizardDescriptions && wizardDescriptions.length > 0) {
        instructions.push(
          wizardDescriptionsLine(wizardDescriptions, referenceStyle),
        );
      }
      instructions.push("Generate a new image in low poly art style.");
      enhancedPrompt = instructions.join(" ");
    }

    const { feature: usageFeature, ...usageRest } = usage;
    const feature = usageFeature ?? "generate_wizard_image";
    const startedAt = Date.now();
    const traceId = crypto.randomUUID();
    let response: Awaited<ReturnType<typeof ai.generate>>;
    try {
      response = await ai.generate({
        prompt:
          parts.length > 0
            ? [...parts, { text: enhancedPrompt }]
            : enhancedPrompt,
        config: {
          temperature: 0.8,
          maxOutputTokens: 4096,
          responseModalities: ["IMAGE"],
          // The lite image model defaults to 16:9, so always set the shape.
          imageConfig: { aspectRatio },
        },
      });
    } catch (error) {
      await recordAIUsage(ctx, {
        feature,
        provider: "gemini",
        model: GEMINI_IMAGE_MODEL,
        kind: "image",
        imageCount: 0,
        costUsd: 0,
        ...usageRest,
        success: false,
      });
      await captureAIGeneration({
        traceId,
        sessionId: null,
        spanName: feature,
        model: GEMINI_IMAGE_MODEL,
        provider: "gemini",
        input: [{ role: "user", content: enhancedPrompt }],
        latencySeconds: (Date.now() - startedAt) / 1000,
        temperature: 0.8,
        maxTokens: 4096,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }

    // Tokens are billed even when no image comes back (e.g. a safety refusal).
    // Image data is billed at a higher rate than the other output tokens, and
    // genkit reports it separately. Values below MIN_IMAGE_TOKENS are an image
    // count rather than tokens, so ignore them.
    const reportedImageTokens = response.usage?.outputImages;
    const costUsd = estimateTokenCostUsd(
      GEMINI_IMAGE_MODEL,
      response.usage?.inputTokens,
      response.usage?.outputTokens,
      {
        thinkingTokens: response.usage?.thoughtsTokens,
        imageOutputTokens:
          reportedImageTokens !== undefined &&
          reportedImageTokens >= MIN_IMAGE_TOKENS
            ? reportedImageTokens
            : undefined,
      },
    );
    const returnedImage = !!response.message?.content?.some(
      (item) => item.media || item.text,
    );
    await recordAIUsage(ctx, {
      feature,
      provider: "gemini",
      model: GEMINI_IMAGE_MODEL,
      kind: "image",
      inputTokens: response.usage?.inputTokens,
      outputTokens: response.usage?.outputTokens,
      imageCount: returnedImage ? 1 : 0,
      costUsd,
      ...usageRest,
      success: returnedImage,
    });

    // Do not include image bytes or inline reference images in analytics.
    await captureAIGeneration({
      traceId,
      sessionId: null,
      spanName: feature,
      model: GEMINI_IMAGE_MODEL,
      provider: "gemini",
      input: [{ role: "user", content: enhancedPrompt }],
      inputTokens: response.usage?.inputTokens,
      outputTokens: response.usage?.outputTokens,
      costUsd,
      latencySeconds: (Date.now() - startedAt) / 1000,
      temperature: 0.8,
      maxTokens: 4096,
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

    const raw = response as unknown as {
      finishReason?: string;
      finishMessage?: string;
      custom?: {
        promptFeedback?: unknown;
        candidates?: Array<{ safetyRatings?: unknown }>;
      };
    };
    const details = {
      finishReason: raw.finishReason,
      finishMessage: raw.finishMessage,
      promptFeedback: raw.custom?.promptFeedback,
      safetyRatings: raw.custom?.candidates?.[0]?.safetyRatings,
      thoughtsTokens: response.usage?.thoughtsTokens,
      outputTokens: response.usage?.outputTokens,
    };
    console.error("Gemini returned no image. Diagnostics:", details);
    throw new GeminiNoImageError("No image found in Gemini response", details);
  } catch (error) {
    if (error instanceof GeminiNoImageError) {
      throw new GeminiNoImageError(
        `Gemini image generation failed: ${error.message} (finishReason=${String(error.details.finishReason)})`,
        error.details,
      );
    }
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
