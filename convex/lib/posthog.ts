/**
 * Minimal server-side PostHog capture for Convex actions.
 * Uses the public capture API via fetch, so no SDK dependency is needed.
 * Never throws: analytics must not break application work.
 *
 * Env: POSTHOG_API_KEY (project key), POSTHOG_HOST
 */
export async function captureServerEvent(
  event: string,
  properties: Record<string, unknown> = {},
  distinctId = "server",
): Promise<void> {
  if (process.env.ENV === "emulate" || process.env.NODE_ENV === "test") {
    return;
  }

  const apiKey = process.env.POSTHOG_API_KEY;
  const host = process.env.POSTHOG_HOST;
  if (!apiKey || !host) {
    if (process.env.NODE_ENV !== "production") {
      const missingVariable = !apiKey ? "POSTHOG_API_KEY" : "POSTHOG_HOST";
      console.warn(
        `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
      );
    }
    return;
  }

  try {
    await fetch(`${host}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        event,
        properties: {
          distinct_id: distinctId,
          source: "convex",
          ...properties,
        },
      }),
      signal: AbortSignal.timeout(3000),
    });
  } catch (error) {
    console.warn(`PostHog capture failed for ${event}:`, error);
  }
}

interface AIGenerationCapture {
  traceId: string;
  sessionId?: string | null;
  spanName: string;
  distinctId?: string;
  model: string;
  provider: string;
  input: Array<{ role: "system" | "user"; content: string }>;
  output?: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  latencySeconds: number;
  temperature: number;
  maxTokens: number;
  error?: string;
}

export async function captureAIGeneration(
  capture: AIGenerationCapture,
): Promise<void> {
  try {
    const properties: Record<string, unknown> = {
      $ai_trace_id: capture.traceId,
      $ai_session_id: capture.sessionId ?? null,
      $ai_span_id: crypto.randomUUID(),
      $ai_span_name: capture.spanName,
      $ai_model: capture.model,
      $ai_provider: capture.provider,
      $ai_input: capture.input,
      $ai_latency: capture.latencySeconds,
      $ai_temperature: capture.temperature,
      $ai_max_tokens: capture.maxTokens,
      ...(capture.inputTokens !== undefined
        ? { $ai_input_tokens: capture.inputTokens }
        : {}),
      ...(capture.outputTokens !== undefined
        ? { $ai_output_tokens: capture.outputTokens }
        : {}),
      ...(capture.costUsd !== undefined
        ? { $ai_total_cost_usd: capture.costUsd }
        : {}),
      ...(capture.output !== undefined
        ? {
            $ai_output_choices: [
              { role: "assistant", content: capture.output },
            ],
          }
        : {}),
      ...(capture.error
        ? { $ai_is_error: true, $ai_error: capture.error }
        : {}),
    };

    await captureServerEvent("$ai_generation", properties, capture.distinctId);
  } catch (error) {
    console.warn("PostHog AI generation capture failed:", error);
  }
}
