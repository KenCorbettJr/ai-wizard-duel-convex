"use node";

import { genkit } from "genkit";
import { googleAI, gemini20FlashExp } from "@genkit-ai/googleai";

export function getGemni20FlashAI() {
  const { GOOGLE_API_KEY } = process.env;

  // In emulator mode, we don't need a real API key since we use mocks
  if (process.env.ENV === "emulate") {
    return genkit({
      plugins: [googleAI({ apiKey: "mock-api-key-for-emulator" })],
      model: gemini20FlashExp,
    });
  }

  if (!GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY environment variable is not set");
  }

  return genkit({
    plugins: [googleAI({ apiKey: GOOGLE_API_KEY })],
    model: gemini20FlashExp,
  });
}
