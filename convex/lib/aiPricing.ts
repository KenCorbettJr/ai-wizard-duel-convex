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
  /** USD per 1M output tokens (text, and thinking tokens when a model has them) */
  outputPerMillion: number;
  /**
   * USD per 1M image output tokens, for models that bill generated images at a
   * different rate than text. When unset, all output tokens use outputPerMillion.
   */
  imageOutputPerMillion?: number;
}

/** Optional breakdown of a model's usage that changes how it is billed. */
export interface TokenUsageDetails {
  /** Thinking tokens. Billed at the text output rate and not part of outputTokens. */
  thinkingTokens?: number;
  /** The part of outputTokens that is generated image data. */
  imageOutputTokens?: number;
}

const TOKEN_PRICES: Record<string, TokenPrice> = {
  // https://aistudio.google.com/docs/pricing (Standard tier)
  "gemini-3.5-flash-lite": { inputPerMillion: 0.3, outputPerMillion: 2.5 },
  // https://ai.google.dev/gemini-api/docs/pricing
  // Image output is $30/1M (1120 tokens, about $0.0336, per 1K image). The
  // few hundred other output tokens and thinking tokens are $1.50/1M.
  "gemini-3.1-flash-lite-image": {
    inputPerMillion: 0.25,
    outputPerMillion: 1.5,
    imageOutputPerMillion: 30,
  },
};

/**
 * USD per generated image, for providers that bill per image.
 * BFL FLUX 3 Klein is $0.009 per 1K image, references included (https://bfl.ai/pricing).
 */
const IMAGE_PRICES: Record<string, number> = {
  "flux-3-image-klein": 0.009,
};

/**
 * Returns the estimated USD cost, or 0 when the model has no known price.
 * For models with an image output rate, pass details.imageOutputTokens to bill
 * only the image data at that rate. Without it, all output tokens are billed at
 * the image rate, which can overstate the cost slightly.
 */
export function estimateTokenCostUsd(
  model: string,
  inputTokens = 0,
  outputTokens = 0,
  details: TokenUsageDetails = {},
): number {
  const price = TOKEN_PRICES[model];
  if (!price) {
    console.warn(`No token price configured for model ${model}`);
    return 0;
  }
  const { thinkingTokens = 0, imageOutputTokens } = details;

  let outputCost: number;
  if (price.imageOutputPerMillion === undefined) {
    outputCost = outputTokens * price.outputPerMillion;
  } else {
    const imageTokens = Math.min(
      imageOutputTokens ?? outputTokens,
      outputTokens,
    );
    outputCost =
      imageTokens * price.imageOutputPerMillion +
      (outputTokens - imageTokens) * price.outputPerMillion;
  }

  return (
    (inputTokens * price.inputPerMillion +
      outputCost +
      thinkingTokens * price.outputPerMillion) /
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
