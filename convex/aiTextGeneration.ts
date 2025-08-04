"use node";

// AI Text Generation Service using Gemini Flash
import { getGemni20FlashAI } from "./ai/getAI";

export interface AITextGenerationConfig {
  temperature?: number;
  maxTokens?: number;
}

export async function generateText(
  prompt: string,
  systemPrompt?: string,
  config: AITextGenerationConfig = {}
): Promise<string> {
  console.log("AI Text Generation called with:", {
    prompt,
    systemPrompt,
    config,
  });

  try {
    const ai = getGemni20FlashAI();

    // Combine system prompt and user prompt
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

    const response = await ai.generate({
      prompt: fullPrompt,
      config: {
        temperature: config.temperature || 0.7,
        maxOutputTokens: config.maxTokens || 2048,
      },
    });

    return response.text;
  } catch (error) {
    console.error("AI text generation failed:", error);
    throw new Error(
      `AI text generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
