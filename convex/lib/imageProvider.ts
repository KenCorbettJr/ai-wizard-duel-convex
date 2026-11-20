/**
 * Which image providers are switched on, read from environment variables.
 *
 * - USE_BFL_FOR_IMAGES=true (needs BFL_API_KEY): Black Forest Labs FLUX 3 Klein
 * - USE_GEMINI_FOR_IMAGES=true (needs GOOGLE_API_KEY): Gemini
 * - neither: FAL
 *
 * When several are on, they run in that order and fall back to the next one.
 */

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
