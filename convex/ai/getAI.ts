"use node";

import { genkit } from "genkit/beta";
import { googleAI } from "@genkit-ai/google-genai";

export function getGeminiTextAI() {
  const { GOOGLE_API_KEY } = process.env;

  // In emulator mode, we don't need a real API key since we use mocks
  if (process.env.ENV === "emulate") {
    return genkit({
      plugins: [googleAI({ apiKey: "mock-api-key-for-emulator" })],
      model: googleAI.model("gemini-3.5-flash-lite"),
    });
  }

  if (!GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY environment variable is not set");
  }

  return genkit({
    plugins: [googleAI({ apiKey: GOOGLE_API_KEY })],
    model: googleAI.model("gemini-3.5-flash-lite"),
  });
}

export function getGeminiImageAI() {
  const { GOOGLE_API_KEY } = process.env;

  // In emulator mode, we don't need a real API key since we use mocks
  if (process.env.ENV === "emulate") {
    return genkit({
      plugins: [googleAI({ apiKey: "mock-api-key-for-emulator" })],
      model: googleAI.model("gemini-nano-banana-2.1"),
    });
  }

  if (!GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY environment variable is not set");
  }

  return genkit({
    plugins: [googleAI({ apiKey: GOOGLE_API_KEY })],
    model: googleAI.model("gemini-nano-banana-2.1"),
  });
}
