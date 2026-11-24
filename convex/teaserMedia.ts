"use node";

/**
 * Builds a duel teaser's media: a spoiler-free trailer script, a voice line
 * for each part, and (with aiMotion) short AI video clips animated from the
 * round pictures. Then asks GitHub Actions to render the video. See teasers.ts.
 */

import { v } from "convex/values";
import { z } from "genkit/beta";
import { internalAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { generateObject } from "./aiTextGeneration";
import { resolveVoice, synthesize } from "./narration";
import { normalizeSpeech } from "./lib/wav";
import { recordAIUsage } from "./lib/recordAIUsage";
import { captureServerEvent } from "./lib/posthog";
import { TEASER_CALL_TO_ACTION } from "./lib/teaserPick";

const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta";
const VIDEO_MODEL = process.env.TEASER_VIDEO_MODEL ?? "gemini-omni-1.2-flash";
/** Estimated 720p video price per second, for the AI Costs page. */
const VIDEO_USD_PER_SECOND = 0.07;
/** Give up on one AI clip after this long and use the still picture. */
const CLIP_TIMEOUT_MS = 6 * 60 * 1000;

const TEASER_VOICE_STYLE =
  "A deep, gripping movie-trailer narrator teasing an epic magical duel. Recorded dry and close to the microphone: no echo or reverb. Fast, energetic, high-stakes delivery, like the hype voice of a blockbuster trailer: brisk pace, no long pauses, every line pushing forward with rising intensity, ending on an unresolved, tantalizing question.";

const MUSIC_MODEL = process.env.TEASER_MUSIC_MODEL ?? "lyria-3.5";
/** The 30-second model, tried if the full one fails. */
const MUSIC_FALLBACK_MODEL = "lyria-3-clip-preview";
const MUSIC_USD: Record<string, number> = {
  "lyria-3.5": 0.08,
  "lyria-3-clip-preview": 0.04,
};
const MUSIC_TIMEOUT_MS = 3 * 60 * 1000;

const ScriptSchema = z.object({
  title: z
    .string()
    .describe(
      "YouTube Shorts title, under 70 characters, spoiler-free and intriguing.",
    ),
  description: z
    .string()
    .describe(
      "One or two spoiler-free sentences for the YouTube description. No hashtags or links.",
    ),
  hook: z
    .string()
    .describe(
      "Opening voice line, at most 12 words, naming both wizards. Punchy.",
    ),
  scenes: z
    .array(
      z.object({
        roundNumber: z.number(),
        line: z
          .string()
          .describe(
            "Voice line for this round's picture, at most 16 words. One or two short, punchy sentences.",
          ),
      }),
    )
    .describe("One entry per round given, in the same order."),
  cliffhanger: z
    .string()
    .describe(
      "A final suspenseful question, at most 10 words, that leaves the outcome open.",
    ),
  musicMood: z
    .string()
    .describe(
      "One sentence for a composer: the mood and instruments of instrumental trailer music that fits this duel, e.g. dark and ominous, heroic, playful and mischievous, icy and eerie. No artist or song names.",
    ),
});

const SYSTEM_PROMPT = `You write voice-over scripts for 25 to 35 second vertical teaser videos (YouTube Shorts) for AI Wizard Duel, a game where players' wizards battle with spells they describe and an AI narrates.

A teaser is a movie trailer for one duel. It must make viewers desperate to know who won, and it must never tell them.

Rules:
- You are only shown the build-up, not the ending. Never say or imply who wins, who loses, or how it ends. No "victory", "defeat", "final blow", "the winner".
- Describe only what happens in the rounds given. Don't invent spells or events.
- Refer to wizards only by their wizard names. Never mention players, usernames or real people.
- Short, vivid, spoken sentences. No emoji, hashtags, stage directions or quotation marks.
- Keep it PG-13 and family-friendly.
- Present tense, trailer style.`;

type DraftSource = {
  aiMotion: boolean;
  wizards: Array<{ name: string; description: string }>;
  rounds: Array<{
    roundNumber: number;
    narrative: string;
    spells: Array<{ wizard: string; spell: string }>;
    imageStorageId: string;
  }>;
};

function buildPrompt(source: DraftSource): string {
  const wizards = source.wizards
    .map((w) => `- ${w.name}: ${w.description}`)
    .join("\n");
  const rounds = source.rounds
    .map((r) => {
      const label =
        r.roundNumber === 0 ? "Introduction" : `Round ${r.roundNumber}`; // roundNumber 0 is the arena introduction
      const spells = r.spells
        .map((s) => `  ${s.wizard} casts: ${s.spell}`)
        .join("\n");
      return `### ${label} (roundNumber ${r.roundNumber})\n${spells}\n${r.narrative}`;
    })
    .join("\n\n");
  return `## Wizards\n${wizards}\n\n## The build-up (the ending is hidden from you)\n${rounds}\n\nWrite the teaser script.`;
}

function words(text: string, max: number): string {
  const list = text.replace(/\s+/g, " ").trim().split(" ");
  return list.length <= max
    ? list.join(" ")
    : `${list.slice(0, max).join(" ")}…`;
}

function clean(text: string | undefined): string {
  return (text ?? "")
    .replace(/[*_`#<>~"“”]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function firstSentence(text: string): string {
  return text.split(/(?<=[.!?])\s/)[0] ?? text;
}

/** The AI script, checked and filled in so every round has a line. */
async function writeScript(ctx: ActionCtx, source: DraftSource) {
  const names = source.wizards.map((w) => w.name);
  let raw: z.infer<typeof ScriptSchema> | null = null;
  try {
    raw = (await generateObject(
      buildPrompt(source),
      ScriptSchema,
      SYSTEM_PROMPT,
      {
        temperature: 0.8,
        maxTokens: 1200,
      },
      { spanName: "duel_teaser_script", usageCtx: ctx },
    )) as z.infer<typeof ScriptSchema>;
  } catch (error) {
    console.error("Teaser script failed, using a plain one:", error);
  }
  // Match lines to rounds by number, or by position when the numbers are off.
  const sameLength = raw?.scenes?.length === source.rounds.length;
  const lineFor = (roundNumber: number, index: number, narrative: string) => {
    const byNumber = raw?.scenes?.find(
      (s) => s.roundNumber === roundNumber,
    )?.line;
    const byPosition = sameLength ? raw?.scenes?.[index]?.line : undefined;
    const line = clean(byNumber ?? byPosition);
    return words(line || clean(firstSentence(narrative)), 28);
  };
  return {
    title: words(
      clean(raw?.title) || `${names.join(" vs ")}: who survives?`,
      14,
    ).slice(0, 90),
    description:
      clean(raw?.description) ||
      `${names.join(" and ")} face off in the arena. Only one walks away.`,
    hook: words(
      clean(raw?.hook) ||
        `${names.join(" versus ")}. Only one leaves the arena.`,
      18,
    ),
    scenes: source.rounds.map((r, i) => ({
      roundNumber: r.roundNumber,
      imageStorageId: r.imageStorageId,
      line: lineFor(r.roundNumber, i, r.narrative),
    })),
    cliffhanger: words(
      clean(raw?.cliffhanger) || "Who will be left standing?",
      14,
    ),
    musicMood: words(clean(raw?.musicMood) || "Dark, epic and suspenseful", 40),
  };
}

/** The prompt for the background track. The mood comes from the script. */
export function musicPrompt(mood: string): string {
  return [
    "Instrumental only, absolutely no vocals or lyrics.",
    "Fast-paced fantasy movie-trailer music for a magical wizard duel, about 40 seconds long.",
    `Mood: ${mood}`,
    "Starts immediately with a big hit and driving percussion (no slow intro), constant forward momentum at around 125 BPM, taiko drums, pulsing staccato strings and magical shimmering textures, building tension the whole way, ending on a huge unresolved crescendo.",
    "Leave space in the mid frequencies for a narrator's voice.",
  ].join(" ");
}

/**
 * Background music made for this teaser with Lyria. Tries the full model,
 * then the 30-second one. Returns null on failure, and the renderer uses a
 * bundled track instead.
 */
async function composeMusic(
  ctx: ActionCtx,
  apiKey: string,
  mood: string,
): Promise<string | null> {
  for (const model of [MUSIC_MODEL, MUSIC_FALLBACK_MODEL]) {
    const started = Date.now();
    try {
      const response = await fetch(`${GEMINI_API}/interactions`, {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
          "Api-Revision": "2026-05-20",
        },
        signal: AbortSignal.timeout(MUSIC_TIMEOUT_MS),
        body: JSON.stringify({ model, input: musicPrompt(mood) }),
      });
      if (!response.ok) {
        throw new Error(
          `Lyria ${response.status}: ${(await response.text()).slice(0, 300)}`,
        );
      }
      const body = (await response.json()) as {
        steps?: Array<{
          content?: Array<{ type?: string; data?: string; mime_type?: string }>;
        }>;
      };
      const block = (body.steps ?? [])
        .flatMap((s) => s.content ?? [])
        .findLast((c) => c.type === "audio" && c.data);
      if (!block?.data) throw new Error("Lyria returned no audio");
      const storageId = await ctx.storage.store(
        new Blob([new Uint8Array(Buffer.from(block.data, "base64"))], {
          type: block.mime_type || "audio/mpeg",
        }),
      );
      await recordAIUsage(ctx, {
        feature: "duel_teaser_music",
        provider: "gemini",
        model,
        kind: "audio",
        costUsd: MUSIC_USD[model] ?? 0.08,
        success: true,
      });
      await captureServerEvent("teaser_music_generated", {
        model,
        durationMs: Date.now() - started,
      });
      return storageId;
    } catch (error) {
      console.error(`Teaser music with ${model} failed:`, error);
      await recordAIUsage(ctx, {
        feature: "duel_teaser_music",
        provider: "gemini",
        model,
        kind: "audio",
        costUsd: 0,
        success: false,
      });
      await captureServerEvent("teaser_music_failed", {
        model,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - started,
      });
    }
  }
  return null;
}

async function voice(
  ctx: ActionCtx,
  apiKey: string,
  voiceId: string,
  line: string,
): Promise<{ storageId: string; durationMs: number }> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { wav, durationMs } = normalizeSpeech(
        await synthesize(apiKey, line, voiceId, TEASER_VOICE_STYLE),
      );
      const storageId = await ctx.storage.store(
        new Blob([wav], { type: "audio/wav" }),
      );
      return { storageId, durationMs };
    } catch (error) {
      lastError = error;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  throw lastError;
}

/**
 * Animates one still into a short vertical clip with Gemini Omni Flash.
 * Returns null on any failure so the teaser falls back to the still.
 */
async function animate(
  ctx: ActionCtx,
  apiKey: string,
  imageStorageId: string,
  line: string,
  seconds: number,
): Promise<string | null> {
  const started = Date.now();
  try {
    const image = await ctx.storage.get(imageStorageId as Id<"_storage">);
    if (!image) return null;
    const data = Buffer.from(await image.arrayBuffer()).toString("base64");
    const prompt = `Bring this fantasy duel illustration to life as a vertical cinematic shot. Keep the same characters, art style and composition. Slow dramatic camera push-in, swirling magical energy and particles, flowing robes, flickering spell light. The moment: ${line} No text, no captions, no dialogue, no new characters. Ambient magical sound only.`;

    const response = await fetch(`${GEMINI_API}/interactions`, {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(CLIP_TIMEOUT_MS),
      body: JSON.stringify({
        model: VIDEO_MODEL,
        input: [
          { type: "image", data, mime_type: image.type || "image/png" },
          { type: "text", text: prompt },
        ],
        response_format: {
          type: "video",
          aspect_ratio: "9:16",
          resolution: "720p",
          duration: `${seconds}s`,
        },
      }),
    });
    if (!response.ok) {
      throw new Error(
        `Gemini video ${response.status}: ${(await response.text()).slice(0, 300)}`,
      );
    }
    type Block = {
      type?: string;
      data?: string;
      uri?: string;
      mime_type?: string;
    };
    const body = (await response.json()) as {
      steps?: Array<{ type?: string; content?: Block[] }>;
    };
    const block = (body.steps ?? [])
      .filter((s) => s.type === "model_output")
      .flatMap((s) => s.content ?? [])
      .find((c) => c.type === "video" && (c.data || c.uri));
    if (!block) throw new Error("Gemini returned no video");

    let bytes: Buffer;
    if (block.data) {
      bytes = Buffer.from(block.data, "base64");
    } else {
      const download = await fetch(block.uri!, {
        headers: { "x-goog-api-key": apiKey },
      });
      if (!download.ok) throw new Error(`Video download ${download.status}`);
      bytes = Buffer.from(await download.arrayBuffer());
    }
    const storageId = await ctx.storage.store(
      new Blob([new Uint8Array(bytes)], { type: "video/mp4" }),
    );
    await recordAIUsage(ctx, {
      feature: "duel_teaser_clip",
      provider: "gemini",
      model: VIDEO_MODEL,
      kind: "video",
      costUsd: seconds * VIDEO_USD_PER_SECOND,
      success: true,
    });
    await captureServerEvent("teaser_clip_generated", {
      model: VIDEO_MODEL,
      seconds,
      durationMs: Date.now() - started,
    });
    return storageId;
  } catch (error) {
    console.error("Teaser clip failed, using the still:", error);
    await recordAIUsage(ctx, {
      feature: "duel_teaser_clip",
      provider: "gemini",
      model: VIDEO_MODEL,
      kind: "video",
      costUsd: 0,
      success: false,
    });
    await captureServerEvent("teaser_clip_failed", {
      model: VIDEO_MODEL,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - started,
    });
    return null;
  }
}

/** Clip length that covers the voice line, within the model's 3 to 10 seconds. */
function clipSeconds(audioMs: number): number {
  return Math.min(10, Math.max(3, Math.ceil(audioMs / 1000 + 0.8)));
}

export const draftTeaser = internalAction({
  args: { teaserId: v.id("duelTeasers") },
  returns: v.null(),
  handler: async (ctx, { teaserId }) => {
    try {
      const source = await ctx.runQuery(internal.teasers.getDraftSource, {
        teaserId,
      });
      if (!source) return null; // Superseded or gone.
      if ("error" in source) throw new Error(source.error);
      const apiKey = process.env.GOOGLE_API_KEY;
      if (!apiKey) throw new Error("GOOGLE_API_KEY is not set");

      const script = await writeScript(ctx, source as DraftSource);
      const voiceId = await resolveVoice(apiKey);
      const outroLine = `${script.cliffhanger} ${TEASER_CALL_TO_ACTION}`;

      const musicJob = composeMusic(ctx, apiKey, script.musicMood);
      const [hook, outro, ...sceneAudio] = await Promise.all([
        voice(ctx, apiKey, voiceId, script.hook),
        voice(ctx, apiKey, voiceId, outroLine),
        ...script.scenes.map((s) => voice(ctx, apiKey, voiceId, s.line)),
      ]);

      const clips = source.aiMotion
        ? await Promise.all(
            script.scenes.map((s, i) =>
              animate(
                ctx,
                apiKey,
                s.imageStorageId,
                s.line,
                clipSeconds(sceneAudio[i].durationMs),
              ),
            ),
          )
        : script.scenes.map(() => null);
      const musicStorageId = await musicJob;

      const saved = await ctx.runMutation(internal.teasers.saveDraft, {
        teaserId,
        title: script.title,
        description: script.description,
        musicStorageId: musicStorageId ?? undefined,
        segments: [
          {
            kind: "hook" as const,
            line: script.hook,
            audioStorageId: hook.storageId,
            audioMs: hook.durationMs,
          },
          ...script.scenes.map((s, i) => ({
            kind: "scene" as const,
            line: s.line,
            roundNumber: s.roundNumber,
            imageStorageId: s.imageStorageId,
            clipStorageId: clips[i] ?? undefined,
            audioStorageId: sceneAudio[i].storageId,
            audioMs: sceneAudio[i].durationMs,
          })),
          {
            kind: "outro" as const,
            line: outroLine,
            audioStorageId: outro.storageId,
            audioMs: outro.durationMs,
          },
        ],
      });
      if (saved) {
        await ctx.runAction(internal.teaserMedia.dispatchRender, { teaserId });
      }
    } catch (error) {
      console.error("Teaser draft failed:", error);
      await ctx.runMutation(internal.teasers.failTeaser, {
        teaserId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  },
});

/**
 * Starts the "Render teaser" GitHub Actions workflow for this deployment.
 * Without TEASER_GITHUB_TOKEN it leaves a note on how to render locally.
 */
export const dispatchRender = internalAction({
  args: { teaserId: v.id("duelTeasers") },
  returns: v.null(),
  handler: async (ctx, { teaserId }) => {
    const token = process.env.TEASER_GITHUB_TOKEN;
    const repo = process.env.TEASER_GITHUB_REPO;
    const siteUrl = process.env.CONVEX_SITE_URL;
    if (!token || !repo || !siteUrl) {
      await ctx.runMutation(internal.teasers.markRenderStarted, {
        teaserId,
        note: `Automatic rendering isn't set up. Render it yourself: cd video && npm run render -- ${teaserId}`,
      });
      return null;
    }
    const response = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/render-teaser.yml/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ref: process.env.TEASER_GITHUB_REF ?? "main",
          inputs: { teaser_id: teaserId, convex_site_url: siteUrl },
        }),
      },
    );
    if (!response.ok) {
      await ctx.runMutation(internal.teasers.failTeaser, {
        teaserId,
        error: `Couldn't start the render (GitHub ${response.status}): ${(await response.text()).slice(0, 300)}`,
      });
      return null;
    }
    await ctx.runMutation(internal.teasers.markRenderStarted, { teaserId });
    return null;
  },
});
