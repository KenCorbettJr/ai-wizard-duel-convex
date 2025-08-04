"use node";

import { genkit } from "genkit";
import { googleAI, gemini20FlashExp } from "@genkit-ai/googleai";

export function getGemni20FlashAI() {
  const { GOOGLE_GENAI_API_KEY } = process.env;

  return genkit({
    plugins: [googleAI({ apiKey: GOOGLE_GENAI_API_KEY })],
    model: gemini20FlashExp,
  });
}
