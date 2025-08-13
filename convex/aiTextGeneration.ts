"use node";

import type { ZodTypeAny } from "zod";
// AI Text Generation Service using Gemini Flash
import { getGemni20FlashAI } from "./ai/getAI";
import {
  isEmulatorMode,
  generateMockText,
  generateMockObject,
  isTestMode,
} from "./mocks/mockServices";

export interface AITextGenerationConfig {
  temperature?: number;
  maxTokens?: number;
}

export async function generateText(
  prompt: string,
  systemPrompt?: string,
  config: AITextGenerationConfig = {}
): Promise<string> {
  try {
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

    // Use mock service in emulator mode
    if (isEmulatorMode() || isTestMode()) {
      return generateMockText(fullPrompt);
    }

    const ai = getGemni20FlashAI();

    const response = await ai.generate({
      prompt: fullPrompt,
      config: {
        temperature: config.temperature || 0.7,
        maxOutputTokens: config.maxTokens || 2048,
      },
    });

    return response.text;
  } catch (error) {
    throw new Error(
      `AI text generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export async function generateObject<T extends ZodTypeAny>(
  prompt: string,
  schema: T,
  systemPrompt?: string,
  config: AITextGenerationConfig = {}
): Promise<ReturnType<typeof generateMockObject<T>>> {
  try {
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

    // Use mock service in emulator mode
    if (isEmulatorMode() || isTestMode()) {
      return generateMockObject(schema);
    }

    const ai = getGemni20FlashAI();

    const response = await ai.generate<T>({
      prompt: fullPrompt,
      config: {
        temperature: config.temperature || 0.7,
        maxOutputTokens: config.maxTokens || 2048,
      },
      output: schema ? { schema } : undefined,
    });

    return response.output;
  } catch (error) {
    throw new Error(
      `AI text generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
