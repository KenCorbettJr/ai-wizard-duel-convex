import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";

export interface AIUsageRecord {
  feature: string;
  provider: string;
  model: string;
  kind: "text" | "image";
  inputTokens?: number;
  outputTokens?: number;
  imageCount?: number;
  costUsd: number;
  userId?: string;
  sessionId?: string;
  success: boolean;
}

/**
 * Persist one AI usage row. Never throws: cost tracking must not break
 * the generation it is measuring.
 */
export async function recordAIUsage(
  ctx: Pick<ActionCtx, "runMutation"> | undefined,
  record: AIUsageRecord,
): Promise<void> {
  if (!ctx) return;
  try {
    await ctx.runMutation(internal.aiUsage.record, record);
  } catch (error) {
    console.warn("Failed to record AI usage:", error);
  }
}
