"use node";

// AI Text Generation Service using Gemini Flash
import { z } from "genkit/beta";
import { getGeminiTextAI } from "./ai/getAI";
import type { ActionCtx } from "./_generated/server";
import { captureAIGeneration } from "./lib/posthog";
import { estimateTokenCostUsd } from "./lib/aiPricing";
import { recordAIUsage } from "./lib/recordAIUsage";
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
  /** When provided, usage and estimated cost are stored in the aiUsage table. */
  usageCtx?: Pick<ActionCtx, "runMutation">;
}

const GEMINI_TEXT_MODEL = "gemini-3.5-flash-lite";

function getObservabilityContext(context: AIObservabilityContext = {}) {
  return {
    sessionId: context.sessionId,
    traceId: context.traceId ?? crypto.randomUUID(),
    distinctId: context.distinctId,
    spanName: context.spanName ?? "generate_text",
    usageCtx: context.usageCtx,
  };
}

function recordTextUsage(
  observability: ReturnType<typeof getObservabilityContext>,
  success: boolean,
  costUsd: number,
  usage?: { inputTokens?: number; outputTokens?: number },
) {
  return recordAIUsage(observability.usageCtx, {
    feature: observability.spanName,
    provider: "gemini",
    model: GEMINI_TEXT_MODEL,
    kind: "text",
    inputTokens: usage?.inputTokens,
    outputTokens: usage?.outputTokens,
    costUsd,
    userId: observability.distinctId,
    sessionId: observability.sessionId ?? undefined,
    success,
  });
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

    const costUsd = estimateTokenCostUsd(
      GEMINI_TEXT_MODEL,
      response.usage?.inputTokens,
      response.usage?.outputTokens,
    );
    await recordTextUsage(observability, true, costUsd, response.usage);
    await captureAIGeneration({
      ...observability,
      model: GEMINI_TEXT_MODEL,
      provider: "gemini",
      input: getInput(prompt, systemPrompt),
      output: response.text,
      inputTokens: response.usage?.inputTokens,
      outputTokens: response.usage?.outputTokens,
      costUsd,
      latencySeconds: (Date.now() - startedAt) / 1000,
      temperature,
      maxTokens,
    });

    return response.text;
  } catch (error) {
    await recordTextUsage(observability, false, 0);
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

    const costUsd = estimateTokenCostUsd(
      GEMINI_TEXT_MODEL,
      response.usage?.inputTokens,
      response.usage?.outputTokens,
    );
    await recordTextUsage(observability, true, costUsd, response.usage);
    await captureAIGeneration({
      ...observability,
      model: GEMINI_TEXT_MODEL,
      provider: "gemini",
      input: getInput(prompt, systemPrompt),
      output: serializeOutput(response.output),
      inputTokens: response.usage?.inputTokens,
      outputTokens: response.usage?.outputTokens,
      costUsd,
      latencySeconds: (Date.now() - startedAt) / 1000,
      temperature,
      maxTokens,
    });

    return response.output;
  } catch (error) {
    await recordTextUsage(observability, false, 0);
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
