"use node";

import { internalAction, ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { withDuelNames } from "./lib/duelWizardNames";
import { Id } from "./_generated/dataModel";
import { DUEL_SCENE_ASPECT_RATIO } from "./lib/imageProvider";
import { directRoundScene, ensureDuelScale } from "./sceneDirector";
import {
  COLOSSEUM_RULE,
  PERSPECTIVE_RULE,
  SCENE_IMAGE_RULES,
  getCameraShot,
  healthAfterRounds,
  impactLines,
} from "./lib/sceneDirection";
import type { AIObservabilityContext } from "./aiTextGeneration";

export const generateRoundIllustration = internalAction({
  args: {
    illustrationPrompt: v.string(),
    duelId: v.id("duels"),
    roundNumber: v.string(), // Can be "0" for introduction or actual round number
    // Ignored. Still accepted so jobs scheduled before it was removed run.
    useGemini: v.optional(v.boolean()),
    userId: v.optional(v.string()), // User ID for credit consumption
    skipImageGeneration: v.optional(v.boolean()), // Skip image generation for text-only mode
  },
  handler: async (
    ctx,
    {
      illustrationPrompt,
      duelId,
      roundNumber,
      userId,
      skipImageGeneration = false,
    },
  ) => {
    const setStatus = (status: "PENDING" | "FAILED" | null) =>
      ctx.runMutation(internal.roundMedia.setRoundIllustrationStatus, {
        duelId,
        roundNumber: Number(roundNumber),
        status,
      });

    console.log(
      `Starting illustration generation for duel ${duelId}, round ${roundNumber} ${skipImageGeneration ? "(text-only mode)" : ""}`,
    );

    try {
      // Get duel and wizard information
      const duel = await ctx.runQuery(api.duels.getDuel, { duelId });
      if (!duel) {
        throw new Error("Duel not found");
      }

      // If skipImageGeneration is true, just return success without generating image
      if (skipImageGeneration) {
        console.log(
          `Skipping image generation for duel ${duelId}, round ${roundNumber} (text-only mode)`,
        );
        return { success: true, textOnlyMode: true };
      }

      await setStatus("PENDING");

      // Players already paid a token when the duel started, so there is no
      // per-image credit check here.

      const wizards = await getDuelWizards(ctx, duel.wizards);
      const rounds = (await ctx.runQuery(api.duels.getDuelRounds, {
        duelId,
      })) as RoundRow[];
      const roundNum = Number(roundNumber);
      const thisRound = rounds.find((r) => r.roundNumber === roundNum);
      const observability: AIObservabilityContext = {
        sessionId: `duel-${duelId}`,
        distinctId: userId,
        usageCtx: ctx,
      };

      // A fixed sentence about the wizards' relative heights, the same in
      // every image of the duel.
      const scale = await ensureDuelScale(
        ctx,
        duelId,
        wizards.map((w) => ({ name: w.name, description: w.description })),
        observability,
      );

      // Battle rounds get their image prompt from the art director, written
      // from what the judge decided happened. The introduction and conclusion
      // keep the prompt they were written with. If the director fails, the
      // judge's scene note is used as-is.
      let scenePrompt = illustrationPrompt;
      let transformedWizards: string[] = [];
      let impacts: string[] = [];
      if (isBattleRound(thisRound)) {
        const battlefield = await ctx.runQuery(
          internal.duelArtNotes.getBattlefieldBefore,
          { duelId, beforeRound: thisRound.roundNumber },
        );
        const directorRound = {
          ...buildDirectorRound(duel, wizards, rounds, thisRound),
          battlefield: battlefield ?? undefined,
        };
        // Who got hit is stated again after the scene, because the director
        // sometimes leaves a hit out when the narration doesn't describe it.
        impacts = impactLines(directorRound.wizards);
        try {
          const direction = await directRoundScene(
            directorRound,
            observability,
          );
          if (direction.prompt) {
            scenePrompt = direction.prompt;
            transformedWizards = direction.transformedWizards;
          }
          if (direction.battlefield) {
            await ctx.runMutation(internal.duelArtNotes.setBattlefield, {
              duelId,
              roundNumber: thisRound.roundNumber,
              description: direction.battlefield,
            });
          }
        } catch (error) {
          console.warn(
            "Art director failed, using the judge's scene note:",
            error,
          );
        }
      }

      const prompt = [
        scenePrompt,
        ...(impacts.length > 0
          ? [`The outcome must be visible: ${impacts.join(" ")}`]
          : []),
        // Every scene of the duel shares the colosseum's scale, so the crowd
        // stays a distant ring on the horizon from introduction to conclusion.
        COLOSSEUM_RULE,
        scale ? `${scale} ${PERSPECTIVE_RULE}` : PERSPECTIVE_RULE,
        SCENE_IMAGE_RULES,
      ].join("\n\n");

      // Every round gets the plain-background wizard images as character
      // references, except a wizard drawn transformed this round: their usual
      // portrait would pull the model back to their usual form. Later rounds
      // also get the previous scene for continuity.
      const visible = wizards.filter(
        (w) => !transformedWizards.includes(w.name),
      );
      const wizardRefs = referencesFor(visible);

      // Battle rounds don't use the introduction as a reference: it is a wide
      // establishing shot and would pull every round back to its framing.
      const previousImage =
        roundNumber === "0"
          ? undefined
          : getPreviousRoundIllustration(
              rounds,
              roundNum,
              isBattleRound(thisRound) ? 1 : 0,
            );

      const imageBuffer: ArrayBuffer = await ctx.runAction(
        api.generateImageWithGemini.generateImageWithGemini,
        {
          prompt,
          previousImage,
          wizardImages: wizardRefs.storageIds,
          wizardImageLabels: wizardRefs.labels,
          wizardDescriptions:
            roundNumber === "0"
              ? undefined
              : visible.map((w) => ({
                  name: w.name,
                  description: w.description,
                })),
          userId,
          sessionId: `duel-${duelId}`,
          feature: "generate_duel_illustration",
          aspectRatio: DUEL_SCENE_ASPECT_RATIO,
          referenceStyle: "scene",
        },
      );

      // Apply additional resizing specifically for duel round illustrations (skip during tests)
      let finalImageBuffer = imageBuffer;

      if (process.env.NODE_ENV !== "test") {
        try {
          finalImageBuffer = await ctx.runAction(
            api.imageCompressionService.compressImage,
            {
              imageBuffer,
            },
          );
        } catch (resizeError) {
          console.warn(
            "Duel round illustration resize failed, using original:",
            resizeError,
          );
          // Use original image if resize fails
        }
      }

      // Store the image in Convex File Storage
      const storageId = await ctx.storage.store(
        new Blob([finalImageBuffer], { type: "image/webp" }),
      );

      const targetRound = thisRound;
      if (targetRound) {
        // Update the round with the illustration
        await ctx.runMutation(internal.duels.updateRoundIllustration, {
          roundId: targetRound._id,
          illustration: storageId,
        });
        // updateRoundIllustration also refreshes the duel's featured image
        await setStatus(null);
      }

      console.log(
        `Successfully generated illustration for duel ${duelId}, round ${roundNumber}`,
      );
      return { success: true, storageId, textOnlyMode: false };
    } catch (error) {
      console.error(
        `Error generating illustration for duel ${duelId}, round ${roundNumber}:`,
        error,
      );

      // Mark the round so the duelists can retry it from the duel page.
      try {
        await setStatus("FAILED");
      } catch (statusError) {
        console.error("Could not mark illustration as failed:", statusError);
      }

      // If image generation fails, fall back to text-only mode instead of throwing error
      console.log(
        `Falling back to text-only mode for duel ${duelId}, round ${roundNumber} due to image generation error`,
      );
      return {
        success: true,
        textOnlyMode: true,
        reason: "image_generation_failed",
      };
    }
  },
});

type DuelWizard = {
  id: Id<"wizards">;
  name: string;
  description: string;
  // Plain-background image, or the display illustration for older wizards
  reference?: string;
};

type RoundRow = {
  _id: Id<"duelRounds">;
  roundNumber: number;
  type: string;
  status: string;
  spells?: Record<string, { description: string; castBy: string }>;
  outcome?: {
    narrative: string;
    result?: string;
    illustration?: string;
    illustrationPrompt?: string;
    pointsAwarded?: Record<string, number>;
    healthChange?: Record<string, number>;
  };
};

type BattleRound = RoundRow & { outcome: NonNullable<RoundRow["outcome"]> };

// Names (with owners added for same-named wizards), descriptions and
// reference images for the duel's wizards, in duel order.
async function getDuelWizards(
  ctx: ActionCtx,
  wizardIds: Id<"wizards">[],
): Promise<DuelWizard[]> {
  try {
    const wizards = await withDuelNames(
      ctx,
      await Promise.all(
        wizardIds.map((wizardId) =>
          ctx.runQuery(internal.wizards.getWizardInternal, { wizardId }),
        ),
      ),
    );
    const result: DuelWizard[] = [];
    wizards.forEach((wizard, i) => {
      if (!wizard) return;
      result.push({
        id: wizardIds[i],
        name: wizard.name,
        description: wizard.description,
        reference: wizard.plainIllustration ?? wizard.illustration,
      });
    });
    return result;
  } catch (error) {
    console.warn("Could not load the duel's wizards:", error);
    return [];
  }
}

function referencesFor(wizards: DuelWizard[]): {
  storageIds: string[];
  labels: string[];
} {
  const withRefs = wizards.filter((w) => w.reference);
  return {
    storageIds: withRefs.map((w) => w.reference!),
    labels: withRefs.map((w) => w.name),
  };
}

// A round the wizards fought (not the introduction or conclusion) with a result
function isBattleRound(round: RoundRow | undefined): round is BattleRound {
  return (
    !!round &&
    round.roundNumber >= 1 &&
    round.type !== "CONCLUSION" &&
    !!round.spells &&
    !!round.outcome?.narrative
  );
}

function buildDirectorRound(
  duel: { _id: Id<"duels">; numberOfRounds: number | "TO_THE_DEATH" },
  wizards: DuelWizard[],
  rounds: RoundRow[],
  round: BattleRound,
) {
  const health = healthAfterRounds(
    wizards.map((w) => w.id),
    rounds,
    round.roundNumber,
  );
  return {
    roundNumber: round.roundNumber,
    totalRounds:
      typeof duel.numberOfRounds === "number" ? duel.numberOfRounds : undefined,
    wizards: wizards.map((w) => ({
      name: w.name,
      description: w.description,
      action: round.spells?.[w.id]?.description,
      healthChange: round.outcome.healthChange?.[w.id] ?? 0,
      pointsEarned: round.outcome.pointsAwarded?.[w.id] ?? 0,
      healthAfter: health[w.id] ?? 100,
    })),
    narration: round.outcome.narrative,
    result: round.outcome.result,
    cameraShot: getCameraShot(duel._id, round.roundNumber),
  };
}

// The most recent illustrated round before this one, for scene continuity
function getPreviousRoundIllustration(
  rounds: RoundRow[],
  currentRoundNumber: number,
  earliestRound = 0,
): string | undefined {
  return rounds
    .filter(
      (r) =>
        r.roundNumber >= earliestRound &&
        r.roundNumber < currentRoundNumber &&
        r.status === "COMPLETED" &&
        r.outcome?.illustration,
    )
    .sort((a, b) => b.roundNumber - a.roundNumber)[0]?.outcome?.illustration;
}
