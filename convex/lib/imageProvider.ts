/**
 * Which image providers are available, based on their API keys.
 *
 * - GOOGLE_API_KEY: Gemini, the default provider
 * - BFL_API_KEY: Black Forest Labs FLUX 3 Klein, the fallback when Gemini fails
 *
 * Both go through generateImageWithGemini, which tries them in that order.
 */

import { v, Infer } from "convex/values";

/**
 * Shape of a generated image. Wizard portraits are a single standing figure,
 * so they are square. Duel scenes stage two wizards facing each other and
 * double as link previews, so they are landscape.
 */
export const imageAspectRatioValidator = v.union(
  v.literal("1:1"),
  v.literal("3:2"),
);
export type ImageAspectRatio = Infer<typeof imageAspectRatioValidator>;
export const DUEL_SCENE_ASPECT_RATIO: ImageAspectRatio = "3:2";

/** True when Gemini can generate images. */
export function isGeminiImageEnabled(): boolean {
  return !!process.env.GOOGLE_API_KEY;
}

/** True when the Black Forest Labs provider has an API key. */
export function isBflEnabled(): boolean {
  return !!process.env.BFL_API_KEY;
}
