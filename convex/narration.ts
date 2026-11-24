import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { narrationValidator } from "./lib/narrationValidator";
import { buildNarrationScript, NARRATION_STYLE } from "./lib/narrationScript";
import { captureServerEvent } from "./lib/posthog";

const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta";
const TTS_MODEL = process.env.GEMINI_TTS_MODEL ?? "gemini-3.8-flash-tts";
const FALLBACK_VOICE = "Charon";
const MAX_ATTEMPTS = 3;
/** Pause before retrying, so brief "high demand" spikes can pass. */
const RETRY_DELAY_MS = 3000;

let cachedVoice: string | undefined;

// The accent comes from the voice, so we need a British male one. Set
// NARRATION_VOICE to pin a specific voice (a library voice ID or a custom
// "voice_..." ID). Otherwise pick the first British male narrator voice in
// the Extended Voice Library, sorted by ID so the choice is stable.
export async function resolveVoice(apiKey: string): Promise<string> {
  if (process.env.NARRATION_VOICE) return process.env.NARRATION_VOICE;
  if (cachedVoice) return cachedVoice;

  type VoiceList = { voices?: Array<{ id?: string; name?: string }> };
  const lookups = ["Narrator", undefined];
  for (const persona of lookups) {
    const params = new URLSearchParams({
      accent: "British",
      gender: "male",
      type: "prebuilt",
      page_size: "50",
    });
    if (persona) params.set("persona", persona);
    try {
      const response = await fetch(`${GEMINI_API}/voices?${params}`, {
        headers: { "x-goog-api-key": apiKey },
      });
      if (!response.ok) continue;
      const data = (await response.json()) as VoiceList;
      const ids = (data.voices ?? [])
        .map((voice) => voice.id ?? voice.name)
        .filter((id): id is string => !!id)
        .sort();
      if (ids.length > 0) {
        cachedVoice = ids[0];
        console.log(`Narration voice selected: ${cachedVoice}`);
        return cachedVoice;
      }
    } catch (error) {
      console.warn("Voice library lookup failed:", error);
    }
  }
  console.warn(
    `No British male voice found, using ${FALLBACK_VOICE}. Set NARRATION_VOICE to choose one.`,
  );
  return FALLBACK_VOICE;
}

export async function synthesize(
  apiKey: string,
  script: string,
  voice: string,
  style: string = NARRATION_STYLE,
): Promise<Uint8Array<ArrayBuffer>> {
  const response = await fetch(`${GEMINI_API}/interactions`, {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: TTS_MODEL,
      input: [
        {
          type: "user_input",
          content: [
            {
              type: "text",
              text: script,
              annotations: [
                { type: "speech_metadata", style },
              ],
            },
          ],
        },
      ],
      response_format: { type: "audio" },
      generation_config: { speech_config: [{ voice }] },
    }),
  });
  if (!response.ok) {
    throw new Error(
      `Gemini TTS ${response.status}: ${(await response.text()).slice(0, 300)}`,
    );
  }

  type Step = {
    type?: string;
    content?: Array<{ type?: string; data?: string }>;
  };
  const data = (await response.json()) as { steps?: Step[] };
  const audioBlocks = (data.steps ?? [])
    .filter((step) => step.type === "model_output")
    .flatMap((step) => step.content ?? [])
    .filter((block) => block.type === "audio" && block.data);
  const base64 = audioBlocks[audioBlocks.length - 1]?.data;
  if (!base64) throw new Error("Gemini TTS returned no audio");

  const binary = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export const getRoundForNarration = internalQuery({
  args: { roundId: v.id("duelRounds") },
  returns: v.union(
    v.null(),
    v.object({ narrative: v.string(), result: v.optional(v.string()) }),
  ),
  handler: async (ctx, { roundId }) => {
    const round = await ctx.db.get(roundId);
    if (!round?.outcome) return null;
    return {
      narrative: round.outcome.narrative,
      result: round.outcome.result,
    };
  },
});

export const setNarration = internalMutation({
  args: { roundId: v.id("duelRounds"), narration: narrationValidator },
  returns: v.null(),
  handler: async (ctx, { roundId, narration }) => {
    if (await ctx.db.get(roundId)) {
      await ctx.db.patch(roundId, { narration });
    }
    return null;
  },
});

export const generateRoundNarration = internalAction({
  args: { roundId: v.id("duelRounds") },
  returns: v.null(),
  handler: async (ctx, { roundId }) => {
    const started = Date.now();
    const apiKey = process.env.GOOGLE_API_KEY;
    let attempt = 0;
    let lastError: unknown;
    try {
      const round = await ctx.runQuery(
        internal.narration.getRoundForNarration,
        {
          roundId,
        },
      );
      if (!apiKey || !round) throw new Error("Nothing to narrate");

      const script = buildNarrationScript(round.narrative);
      if (!script) throw new Error("Empty narration script");
      const voice = await resolveVoice(apiKey);

      for (attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          const audio = await synthesize(apiKey, script, voice);
          const storageId = await ctx.storage.store(
            new Blob([audio], { type: "audio/wav" }),
          );
          await ctx.runMutation(internal.narration.setNarration, {
            roundId,
            narration: {
              status: "READY",
              storageId,
              generatedAt: Date.now(),
            },
          });
          await captureServerEvent("narration_generated", {
            attempt,
            voice,
            model: TTS_MODEL,
            scriptLength: script.length,
            audioBytes: audio.byteLength,
            durationMs: Date.now() - started,
          });
          return null;
        } catch (error) {
          lastError = error;
          console.error(`Narration attempt ${attempt} failed:`, error);
          if (attempt < MAX_ATTEMPTS) {
            await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
          }
        }
      }
      throw lastError;
    } catch (error) {
      await captureServerEvent("narration_failed", {
        attempt,
        model: TTS_MODEL,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - started,
      });
      await ctx.runMutation(internal.narration.setNarration, {
        roundId,
        narration: { status: "FAILED" },
      });
      return null;
    }
  },
});
