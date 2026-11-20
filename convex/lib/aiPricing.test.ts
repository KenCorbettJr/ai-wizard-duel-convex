import { describe, expect, it } from "vitest";
import { estimateTokenCostUsd } from "./aiPricing";

const IMAGE_MODEL = "gemini-3.1-flash-lite-image";

describe("estimateTokenCostUsd", () => {
  it("bills image tokens at the image rate and the rest at the text rate", () => {
    // 10 in, 1466 out of which 1120 are image data, as returned by the API
    const cost = estimateTokenCostUsd(IMAGE_MODEL, 10, 1466, {
      imageOutputTokens: 1120,
    });
    expect(cost).toBeCloseTo(
      (10 * 0.25 + 1120 * 30 + 346 * 1.5) / 1_000_000,
      8,
    );
    expect(cost).toBeCloseTo(0.0341, 4);
  });

  it("bills all output at the image rate when there is no breakdown", () => {
    const cost = estimateTokenCostUsd(IMAGE_MODEL, 0, 1466);
    expect(cost).toBeCloseTo((1466 * 30) / 1_000_000, 8);
  });

  it("adds thinking tokens at the text output rate", () => {
    const withThinking = estimateTokenCostUsd(IMAGE_MODEL, 0, 1120, {
      imageOutputTokens: 1120,
      thinkingTokens: 1000,
    });
    const without = estimateTokenCostUsd(IMAGE_MODEL, 0, 1120, {
      imageOutputTokens: 1120,
    });
    expect(withThinking - without).toBeCloseTo((1000 * 1.5) / 1_000_000, 8);
  });

  it("never bills more image tokens than the output total", () => {
    const cost = estimateTokenCostUsd(IMAGE_MODEL, 0, 100, {
      imageOutputTokens: 5000,
    });
    expect(cost).toBeCloseTo((100 * 30) / 1_000_000, 8);
  });

  it("uses one output rate for text-only models", () => {
    const cost = estimateTokenCostUsd("gemini-3.5-flash-lite", 1000, 1000);
    expect(cost).toBeCloseTo((1000 * 0.3 + 1000 * 2.5) / 1_000_000, 8);
  });

  it("returns 0 for an unknown model", () => {
    expect(estimateTokenCostUsd("no-such-model", 10, 10)).toBe(0);
  });
});
