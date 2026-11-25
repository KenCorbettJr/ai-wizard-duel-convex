"use node";

// The "art director" for duel illustrations: works out the wizards' relative
// heights once per duel, and writes each battle round's image prompt from what
// the judge decided happened. Rules and prompt layout live in
// lib/sceneDirection.ts.

import { z } from "genkit/beta";
import type { ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  generateObject,
  type AIObservabilityContext,
} from "./aiTextGeneration";
import {
  ART_DIRECTION_RULES,
  DEFAULT_HEIGHT_FEET,
  DIRECTOR_SELF_CHECK,
  buildDirectorInput,
  describeScale,
  findPromptProblems,
  type DirectorInput,
} from "./lib/sceneDirection";
import { CONTENT_STANDARDS } from "./lib/contentStandards";

type NamedWizard = { name: string; description: string };

const heightSchema = z.object({
  wizards: z.array(
    z.object({
      name: z.string(),
      heightFeet: z
        .number()
        .describe("Standing height in their usual form, in feet"),
    }),
  ),
});

/** Asks for each wizard's height and turns the answer into the scale sentence. */
async function estimateScale(
  wizards: NamedWizard[],
  observability: AIObservabilityContext,
): Promise<string> {
  const result = await generateObject(
    JSON.stringify(
      wizards.map((w) => ({ name: w.name, description: w.description })),
    ),
    heightSchema,
    `Estimate each wizard's standing height, in feet, in their usual form, from their description. Use explicit size cues in the description: "very tall" for a human-like figure is about 7 feet, "tall" is about 6.3 feet, "short" is about 5 feet, a gnome or halfling is about 3.5 feet, a fairy or mouse is far smaller, and a giant or dragon is far larger. If the description gives no size cue, use ${DEFAULT_HEIGHT_FEET} feet. Return every wizard in the same order with their name unchanged.`,
    { temperature: 0.2, maxTokens: 512 },
    { ...observability, spanName: "estimate_wizard_heights" },
  );
  const heights = wizards.map((w, i) => ({
    name: w.name,
    heightFeet: result.wizards[i]?.heightFeet ?? DEFAULT_HEIGHT_FEET,
  }));
  return describeScale(heights);
}

/**
 * The duel's fixed height sentence, worked out and stored the first time it is
 * needed. Returns undefined if it can't be worked out; images still generate.
 */
export async function ensureDuelScale(
  ctx: ActionCtx,
  duelId: Id<"duels">,
  wizards: NamedWizard[],
  observability: AIObservabilityContext,
): Promise<string | undefined> {
  try {
    const stored = await ctx.runQuery(internal.duelArtNotes.getScale, {
      duelId,
    });
    if (stored) return stored;
    if (wizards.length === 0) return undefined;
    const scale = await estimateScale(wizards, observability);
    if (!scale) return undefined;
    return await ctx.runMutation(internal.duelArtNotes.setScale, {
      duelId,
      scale,
    });
  } catch (error) {
    console.warn("Could not work out the wizards' heights:", error);
    return undefined;
  }
}

const directionSchema = z.object({
  prompt: z
    .string()
    .describe("The image prompt, 100 to 170 words, following every rule"),
  battlefield: z
    .string()
    .describe(
      "One sentence describing the battlefield AFTER this round, for the next round's picture: the ground, the sky and its colors, the weather and every lasting effect (craters, ice, needles, puddles, fires, wreckage). Keep lasting effects from the current battlefield unless a spell cleared them. No wizards, no spectators, no fog or haze.",
    ),
  transformedWizards: z
    .array(z.string())
    .describe(
      "Names of wizards whose shape the narration says changed this round, so they are drawn as something other than their usual self (a different creature, an object, a machine, a ball, energy and so on). A wizard who already is an animal, creature or robot in their description is NOT transformed by being that. Holding, summoning or riding something is not a transformation. Usually empty.",
    ),
});

export type RoundDirection = {
  prompt: string;
  battlefield?: string;
  transformedWizards: string[];
};

/** Writes a battle round's image prompt from the round's facts. */
export async function directRoundScene(
  input: DirectorInput,
  observability: AIObservabilityContext,
): Promise<RoundDirection> {
  const system = `You are the art director for a wizard duel game. Every round becomes one illustration in a low poly art style, drawn by an image model that also receives a reference picture of each wizard. You write the image prompt for this round. Your goal: someone who sees ONLY the picture can tell who attacked whom, what each spell physically was, and who got the better of the round.

${ART_DIRECTION_RULES}

${CONTENT_STANDARDS}

${DIRECTOR_SELF_CHECK}

Return JSON with "prompt", "battlefield" and "transformedWizards".`;

  const names = new Set(input.wizards.map((w) => w.name));
  const ask = async (extra = ""): Promise<RoundDirection> => {
    const result = await generateObject(
      buildDirectorInput(input) + extra,
      directionSchema,
      system,
      { temperature: 0.5, maxTokens: 1024 },
      { ...observability, spanName: "direct_round_illustration" },
    );
    return {
      prompt: String(result.prompt ?? "").trim(),
      battlefield: result.battlefield
        ? String(result.battlefield).trim()
        : undefined,
      transformedWizards: (
        (result.transformedWizards ?? []) as string[]
      ).filter((n) => names.has(n)),
    };
  };

  // The lite model sometimes breaks a rule anyway (most often by asking for
  // written words). Catch the ones a pattern can spot and ask once more.
  const first = await ask();
  const problems = findPromptProblems(first.prompt);
  if (problems.length === 0) return first;
  console.log("Art director broke rules, retrying:", problems);
  try {
    const second = await ask(
      `\n\nYOUR PREVIOUS PROMPT BROKE THESE RULES:\n${problems.map((p) => `- ${p}`).join("\n")}\nPrevious prompt: ${first.prompt}\nWrite it again without those problems.`,
    );
    return findPromptProblems(second.prompt).length <= problems.length
      ? second
      : first;
  } catch (error) {
    console.warn("Art director retry failed, using the first prompt:", error);
    return first;
  }
}
