/**
 * Provider price table used to estimate the cost of AI calls.
 *
 * These are ESTIMATES. Verify them against current provider pricing and update
 * when prices or models change. Token counts and image counts are stored with
 * every usage row, so costs can be recomputed later if a price is wrong.
 */

interface TokenPrice {
  /** USD per 1M input tokens */
  inputPerMillion: number;
  /** USD per 1M output tokens */
  outputPerMillion: number;
}

const TOKEN_PRICES: Record<string, TokenPrice> = {
  // https://aistudio.google.com/docs/pricing (Standard tier)
  "gemini-3.5-flash-lite": { inputPerMillion: 0.3, outputPerMillion: 2.5 },
  // Output is billed at the image rate ($30/1M). Thinking tokens ($7.50/1M)
  // are not included in outputTokens, so they are not counted here.
  "gemini-nano-banana-2.1": { inputPerMillion: 1.5, outputPerMillion: 30 },
};

/**
 * USD per generated image, for providers that bill per image.
 * FAL: schnell is $0.003/megapixel (we generate 1024x1024, about 1 MP).
 * Kontext [pro] is $0.04/image; the /multi endpoint price was not confirmed.
 * BFL FLUX 3 Klein is $0.009 per 1K image, references included (https://bfl.ai/pricing).
 */
const IMAGE_PRICES: Record<string, number> = {
  "fal-ai/flux/schnell": 0.003,
  "fal-ai/flux-pro/kontext/multi": 0.04,
  "flux-3-image-klein": 0.009,
};

/** Returns the estimated USD cost, or 0 when the model has no known price. */
export function estimateTokenCostUsd(
  model: string,
  inputTokens = 0,
  outputTokens = 0,
): number {
  const price = TOKEN_PRICES[model];
  if (!price) {
    console.warn(`No token price configured for model ${model}`);
    return 0;
  }
  return (
    (inputTokens * price.inputPerMillion +
      outputTokens * price.outputPerMillion) /
    1_000_000
  );
}

export function estimateImageCostUsd(model: string, imageCount = 1): number {
  const price = IMAGE_PRICES[model];
  if (price === undefined) {
    console.warn(`No image price configured for model ${model}`);
    return 0;
  }
  return price * imageCount;
}
