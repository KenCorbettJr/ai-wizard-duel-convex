"use node";

import { genkit } from "genkit/beta";
import { googleAI } from "@genkit-ai/google-genai";

export function getGemni20FlashAI() {
  const { GOOGLE_API_KEY } = process.env;

  // In emulator mode, we don't need a real API key since we use mocks
  if (process.env.ENV === "emulate") {
    return genkit({
      plugins: [googleAI({ apiKey: "mock-api-key-for-emulator" })],
      model: googleAI.model("gemini-2.0-flash"),
    });
  }

  if (!GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY environment variable is not set");
  }

  return genkit({
    plugins: [googleAI({ apiKey: GOOGLE_API_KEY })],
    model: googleAI.model("gemini-2.0-flash"),
  });
}

export function getGemni25FlashImageAI() {
  const { GOOGLE_API_KEY } = process.env;

  // In emulator mode, we don't need a real API key since we use mocks
  if (process.env.ENV === "emulate") {
    return genkit({
      plugins: [googleAI({ apiKey: "mock-api-key-for-emulator" })],
      model: googleAI.model("gemini-2.5-flash-image-preview"),
    });
  }

  if (!GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY environment variable is not set");
  }

  return genkit({
    plugins: [googleAI({ apiKey: GOOGLE_API_KEY })],
    model: googleAI.model("gemini-2.5-flash-image-preview"),
  });
}
