import type { ActionCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { api } from "../_generated/api";
import { estimateImageCostUsd } from "./aiPricing";
import { recordAIUsage } from "./recordAIUsage";
import type { ImageAspectRatio } from "./imageProvider";
import {
  wizardReferenceInstructions,
  wizardDescriptionsLine,
  PREVIOUS_SCENE_INSTRUCTION,
  type ReferenceStyle,
} from "./referenceImageRules";

// Black Forest Labs FLUX 3 Image Klein: text-to-image plus editing with up to
// 10 reference images, billed per image with references included.
// https://docs.bfl.ml/api-reference/utility/generate-an-image-with-flux-3-klein
const BFL_API = "https://api.bfl.ai/v1";
export const BFL_IMAGE_MODEL = "flux-3-image-klein";
const MAX_REFERENCES = 10;
const POLL_INTERVAL_MS = 1000;
const TIMEOUT_MS = 180_000;
// 1 BFL credit = $0.01
const USD_PER_CREDIT = 0.01;

export interface BflImageParams {
  prompt: string;
  previousImage?: string; // Storage ID of the previous round image
  wizardImages?: string[]; // Storage IDs of plain-background wizard images
  wizardImageLabels?: string[]; // Wizard names, parallel to wizardImages
  wizardDescriptions?: Array<{ name: string; description: string }>;
  aspectRatio?: ImageAspectRatio; // Default 1:1
  referenceStyle?: ReferenceStyle; // Default "exact"
}

export interface BflUsageContext {
  userId?: string;
  sessionId?: string;
  feature?: string;
}

interface BflSubmitResponse {
  polling_url?: string;
  cost?: number | null;
}

interface BflPollResponse {
  status?: string;
  result?: { sample?: string };
  details?: unknown;
}

export class BflError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

// Resolve a stored image to a URL BFL can download.
async function getReferenceUrl(
  ctx: ActionCtx,
  storageId: string,
): Promise<string | null> {
  try {
    return await ctx.storage.getUrl(storageId as Id<"_storage">);
  } catch (error) {
    console.warn(`Could not get URL for reference ${storageId}:`, error);
    return null;
  }
}

// BFL refers to references by position ("Image 1"), so the prompt describes
// what each one is for. Mirrors the instructions used for Gemini.
async function buildRequest(ctx: ActionCtx, params: BflImageParams) {
  const { prompt, previousImage, wizardImages, wizardImageLabels } = params;
  const images: string[] = [];
  const notes: string[] = [];

  for (let i = 0; i < (wizardImages?.length ?? 0); i++) {
    if (images.length >= MAX_REFERENCES) break;
    const url = await getReferenceUrl(ctx, wizardImages![i]);
    if (!url) continue;
    images.push(url);
    const label = wizardImageLabels?.[i] ?? `Wizard ${i + 1}`;
    notes.push(
      `Image ${images.length} is the appearance reference for ${label}. Use it only to copy the character's look.`,
    );
  }
  const hasWizardRefs = images.length > 0;

  let hasPreviousScene = false;
  if (previousImage && images.length < MAX_REFERENCES) {
    const url = await getReferenceUrl(ctx, previousImage);
    if (url) {
      images.push(url);
      hasPreviousScene = true;
      notes.push(
        `Image ${images.length} is the previous scene of the duel, for setting and continuity only. Do not repeat its camera angle.`,
      );
    }
  }

  if (images.length === 0) return { prompt, images };

  const instructions: string[] = [prompt, ...notes];
  if (hasWizardRefs) {
    instructions.push(
      wizardReferenceInstructions(params.referenceStyle ?? "exact"),
    );
  }
  if (hasPreviousScene) {
    instructions.push(PREVIOUS_SCENE_INSTRUCTION);
  }
  if (params.wizardDescriptions?.length) {
    instructions.push(
      wizardDescriptionsLine(
        params.wizardDescriptions,
        params.referenceStyle ?? "exact",
      ),
    );
  }
  instructions.push("Generate a new image in low poly art style.");
  return { prompt: instructions.join(" "), images };
}

async function pollForResult(
  pollingUrl: string,
  apiKey: string,
): Promise<string> {
  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    const response = await fetch(pollingUrl, { headers: { "x-key": apiKey } });
    // A failed task can come back as HTTP 503 with a normal JSON body, so read
    // the status before treating a non-2xx response as an outage.
    const body = (await response
      .json()
      .catch(() => null)) as BflPollResponse | null;
    if (!body?.status) {
      throw new BflError(
        `BFL poll failed with HTTP ${response.status}`,
        response.status,
      );
    }
    switch (body.status) {
      case "Ready":
        if (!body.result?.sample) {
          throw new BflError("BFL result had no image URL");
        }
        return body.result.sample;
      case "Pending":
      case "Reasoning":
      case "Generating":
        continue;
      default:
        // Request Moderated, Content Moderated, Error, Task not found
        throw new BflError(
          `BFL generation ended with status "${body.status}"${
            body.details
              ? `: ${JSON.stringify(body.details).slice(0, 300)}`
              : ""
          }`,
        );
    }
  }
  throw new BflError(`BFL generation timed out after ${TIMEOUT_MS / 1000}s`);
}

/**
 * Generate one 1K square image with FLUX 3 Klein, optionally guided by the
 * wizard and previous-scene references, and return it compressed.
 * Records usage and cost for every attempt.
 */
export async function generateWithBfl(
  ctx: ActionCtx,
  params: BflImageParams,
  usage: BflUsageContext = {},
): Promise<ArrayBuffer> {
  const apiKey = process.env.BFL_API_KEY;
  if (!apiKey)
    throw new BflError("BFL_API_KEY environment variable is not set");

  const { feature: usageFeature, ...usageRest } = usage;
  const feature = usageFeature ?? "generate_wizard_image";
  let generated = false;

  try {
    const { prompt, images } = await buildRequest(ctx, params);

    const submit = await fetch(`${BFL_API}/${BFL_IMAGE_MODEL}`, {
      method: "POST",
      headers: { "x-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        ...(images.length > 0 ? { images } : {}),
        aspect_ratio: params.aspectRatio ?? "1:1",
        resolution: "1k",
        output_format: "png",
      }),
    });
    if (!submit.ok) {
      throw new BflError(
        `BFL request failed (${submit.status}): ${(await submit.text()).slice(0, 300)}`,
        submit.status,
      );
    }
    const submitted = (await submit.json()) as BflSubmitResponse;
    if (!submitted.polling_url) {
      throw new BflError("BFL response had no polling_url");
    }

    // The submit response reports the exact cost in credits. Failed and
    // moderated generations are not charged, so cost is only recorded once the
    // image is ready (before the download, which can still fail).
    const costUsd =
      typeof submitted.cost === "number"
        ? submitted.cost * USD_PER_CREDIT
        : estimateImageCostUsd(BFL_IMAGE_MODEL, 1);

    const sampleUrl = await pollForResult(submitted.polling_url, apiKey);
    generated = true;
    await recordAIUsage(ctx, {
      feature,
      provider: "bfl",
      model: BFL_IMAGE_MODEL,
      kind: "image",
      imageCount: 1,
      costUsd,
      ...usageRest,
      success: true,
    });

    // The signed URL expires after an hour and must not receive the API key.
    const imageResponse = await fetch(sampleUrl);
    if (!imageResponse.ok) {
      throw new BflError(
        `Failed to download BFL image: ${imageResponse.statusText}`,
        imageResponse.status,
      );
    }
    const imageBuffer = await imageResponse.arrayBuffer();

    return await ctx.runAction(api.imageCompressionService.compressImage, {
      imageBuffer,
    });
  } catch (error) {
    if (!generated) {
      await recordAIUsage(ctx, {
        feature,
        provider: "bfl",
        model: BFL_IMAGE_MODEL,
        kind: "image",
        imageCount: 0,
        costUsd: 0,
        ...usageRest,
        success: false,
      });
    }
    throw error;
  }
}
