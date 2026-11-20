/**
 * Which image providers are switched on, read from environment variables.
 *
 * - USE_BFL_FOR_IMAGES=true (needs BFL_API_KEY): Black Forest Labs FLUX 3 Klein
 * - USE_GEMINI_FOR_IMAGES=true (needs GOOGLE_API_KEY): Gemini
 * - neither: FAL
 *
 * When several are on, they run in that order and fall back to the next one.
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

/** True when the BFL provider is switched on and has an API key. */
export function isBflEnabled(): boolean {
  return process.env.USE_BFL_FOR_IMAGES === "true" && !!process.env.BFL_API_KEY;
}

/**
 * True when images should go through generateImageWithGemini (BFL or Gemini)
 * instead of calling FAL directly. Callers pass this as the `useGemini` arg.
 */
export function useReferenceImageProvider(): boolean {
  return (
    process.env.USE_GEMINI_FOR_IMAGES === "true" ||
    process.env.USE_BFL_FOR_IMAGES === "true"
  );
}
