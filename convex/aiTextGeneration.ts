"use node";

// AI Text Generation Service using Gemini Flash
import { z } from "genkit/beta";
import { getGeminiTextAI } from "./ai/getAI";
import { captureAIGeneration } from "./lib/posthog";
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

export interface AIObservabilityContext {
  sessionId?: string | null;
  traceId?: string;
  distinctId?: string;
  spanName?: string;
}

const GEMINI_TEXT_MODEL = "gemini-3.5-flash-lite";

function getObservabilityContext(context: AIObservabilityContext = {}) {
  return {
    sessionId: context.sessionId,
    traceId: context.traceId ?? crypto.randomUUID(),
    distinctId: context.distinctId,
    spanName: context.spanName ?? "generate_text",
  };
}

function getInput(prompt: string, systemPrompt?: string) {
  return [
    ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
    { role: "user" as const, content: prompt },
  ];
}

function serializeOutput(output: unknown): string | undefined {
  try {
    return output === undefined ? undefined : JSON.stringify(output);
  } catch {
    return undefined;
  }
}

export async function generateText(
  prompt: string,
  systemPrompt?: string,
  config: AITextGenerationConfig = {},
  observabilityContext?: AIObservabilityContext,
): Promise<string> {
  const observability = getObservabilityContext(observabilityContext);
  const temperature = config.temperature || 0.7;
  const maxTokens = config.maxTokens || 2048;
  const startedAt = Date.now();

  try {
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

    // Use mock service in emulator mode
    if (isEmulatorMode() || isTestMode()) {
      return generateMockText(fullPrompt);
    }

    const ai = getGeminiTextAI();

    const response = await ai.generate({
      prompt: fullPrompt,
      config: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    });

    await captureAIGeneration({
      ...observability,
      model: GEMINI_TEXT_MODEL,
      provider: "gemini",
      input: getInput(prompt, systemPrompt),
      output: response.text,
      inputTokens: response.usage?.inputTokens,
      outputTokens: response.usage?.outputTokens,
      latencySeconds: (Date.now() - startedAt) / 1000,
      temperature,
      maxTokens,
    });

    return response.text;
  } catch (error) {
    await captureAIGeneration({
      ...observability,
      model: GEMINI_TEXT_MODEL,
      provider: "gemini",
      input: getInput(prompt, systemPrompt),
      latencySeconds: (Date.now() - startedAt) / 1000,
      temperature,
      maxTokens,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw new Error(
      `AI text generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export async function generateObject<T extends z.ZodTypeAny>(
  prompt: string,
  schema: T,
  systemPrompt?: string,
  config: AITextGenerationConfig = {},
  observabilityContext?: AIObservabilityContext,
): Promise<ReturnType<typeof generateMockObject<T>>> {
  const observability = getObservabilityContext({
    ...observabilityContext,
    spanName: observabilityContext?.spanName ?? "generate_object",
  });
  const temperature = config.temperature || 0.7;
  const maxTokens = config.maxTokens || 2048;
  const startedAt = Date.now();

  try {
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

    // Use mock service in emulator mode
    if (isEmulatorMode() || isTestMode()) {
      return generateMockObject(schema);
    }

    const ai = getGeminiTextAI();

    const response = await ai.generate<T>({
      prompt: fullPrompt,
      config: {
        temperature,
        maxOutputTokens: maxTokens,
      },
      output: schema ? { schema } : undefined,
    });

    await captureAIGeneration({
      ...observability,
      model: GEMINI_TEXT_MODEL,
      provider: "gemini",
      input: getInput(prompt, systemPrompt),
      output: serializeOutput(response.output),
      inputTokens: response.usage?.inputTokens,
      outputTokens: response.usage?.outputTokens,
      latencySeconds: (Date.now() - startedAt) / 1000,
      temperature,
      maxTokens,
    });

    return response.output;
  } catch (error) {
    await captureAIGeneration({
      ...observability,
      model: GEMINI_TEXT_MODEL,
      provider: "gemini",
      input: getInput(prompt, systemPrompt),
      latencySeconds: (Date.now() - startedAt) / 1000,
      temperature,
      maxTokens,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw new Error(
      `AI text generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
