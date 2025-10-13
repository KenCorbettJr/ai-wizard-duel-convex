"use node";

import type { Doc } from "../convex/_generated/dataModel";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

import { Id } from "./_generated/dataModel";
import { z } from "genkit/beta";
import { isEmulatorMode } from "./mocks/mockServices";
import { generateObject } from "./aiTextGeneration";

// Zod schema for structured AI output
const IntroductionResponseSchema = z.object({
  narration: z
    .string()
    .describe(
      "A vivid, detailed introduction of the magical combat that is about to take place. This should be several paragraphs and capture the drama and excitement of the duel, written in present tense as if events are unfolding in real time."
    ),
  result: z
    .string()
    .describe(
      "A brief summary of the introduction, this can be a little snarky or humorous if you like."
    ),
  illustrationPrompt: z
    .string()
    .describe(
      "A very detailed prompt for a low poly art style illustration capturing the moment from a great distance, as if viewed from the stands surrounding the arena. Include wizard appearances, environments, spell effects, and dynamic lighting with magical particles."
    ),
});

// Types for the introduction response
export type IntroductionResponse = z.infer<typeof IntroductionResponseSchema>;

// Generate duel introduction using AI
export const generateDuelIntroduction = action({
  args: {
    duelId: v.id("duels"),
    userId: v.optional(v.string()), // User ID for credit consumption
  },
  handler: async (
    ctx,
    { duelId, userId }
  ): Promise<{
    success: boolean;
    introRoundId: Id<"duelRounds">;
    textOnlyMode?: boolean;
  }> => {
    try {
      // Get the duel data (using internal query to bypass access control for scheduled actions)
      const duel = await ctx.runQuery(internal.duels.getDuelInternal, {
        duelId,
      });
      if (!duel) {
        throw new Error("Duel not found");
      }

      // Get wizard data
      const wizards = await Promise.all(
        duel.wizards.map((wizardId: Id<"wizards">) =>
          ctx.runQuery(api.wizards.getWizard, { wizardId })
        )
      );

      if (
        wizards.length < 2 ||
        wizards.some((w: Doc<"wizards"> | null) => !w)
      ) {
        throw new Error("Could not fetch all wizard data");
      }

      // Ensure we have exactly 2 wizards and they're not null
      if (wizards.length !== 2 || !wizards[0] || !wizards[1]) {
        throw new Error("Could not fetch all wizard data");
      }

      const wizard1 = wizards[0];
      const wizard2 = wizards[1];

      // Generate the introduction using AI
      const introduction = await generateIntroductionText(
        duel,
        wizard1,
        wizard2
      );

      // Create the introduction round (round 0)
      const introRoundId: Id<"duelRounds"> = await ctx.runMutation(
        api.duels.createIntroductionRound,
        {
          duelId,
          outcome: {
            narrative: introduction.narration,
            result: introduction.result,
            illustrationPrompt: introduction.illustrationPrompt,
          },
        }
      );

      // Generate the illustration (with credit checking and user preference)
      let textOnlyMode = duel.textOnlyMode || false;
      if (introduction.illustrationPrompt && !textOnlyMode) {
        // Skip introduction illustration scheduling to avoid transaction escape errors in tests
        if (process.env.NODE_ENV !== "test") {
          // Check if we should use Gemini Nano Banana
          const useGemini = process.env.USE_GEMINI_FOR_IMAGES === "true";

          // Check if user has image credits before scheduling illustration
          let skipImageGeneration = false;
          if (userId) {
            const hasCredits = await ctx.runQuery(
              api.imageCreditService.hasImageCreditsForDuel,
              { userId }
            );
            if (!hasCredits) {
              skipImageGeneration = true;
              textOnlyMode = true;
              console.log(
                `User ${userId} has insufficient credits for duel ${duelId} introduction, using text-only mode`
              );
            }
          }

          await ctx.scheduler.runAfter(
            100, // Add small delay to ensure database transaction is committed
            api.generateRoundIllustration.generateRoundIllustration,
            {
              illustrationPrompt: introduction.illustrationPrompt,
              duelId,
              roundNumber: "0", // Introduction round
              useGemini,
              userId,
              skipImageGeneration,
            }
          );
        }
      }

      // Update duel text-only mode status if needed
      if (textOnlyMode) {
        await ctx.runMutation(api.duels.updateDuelTextOnlyMode, {
          duelId,
          textOnlyMode: true,
          reason: "insufficient_credits",
        });
      }

      // Start the duel (move to first actual round)
      await ctx.runMutation(api.duels.startDuelAfterIntroduction, { duelId });

      return { success: true, introRoundId, textOnlyMode };
    } catch (error) {
      throw new Error(
        `Failed to generate duel introduction: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
});

// Helper function to generate introduction text using AI
async function generateIntroductionText(
  duel: Doc<"duels">,
  wizard1: Doc<"wizards">,
  wizard2: Doc<"wizards">
): Promise<IntroductionResponse> {
  const duelType =
    duel.numberOfRounds === "TO_THE_DEATH"
      ? "to the death"
      : `a ${duel.numberOfRounds} round duel`;

  try {
    // Use structured output with schema for better AI responses
    if (isEmulatorMode()) {
      console.log("🎭 Using mock AI introduction generation (emulator mode)");
      return generateMockIntroduction(duel, wizard1, wizard2);
    }

    const systemPrompt = `# Wizard Duel System Guidelines
You are the Arcane Arbiter, an impartial magical referee for wizard duels. Your role is to interpret, adjudicate, and narrate magical combat between two wizards.

# Arena & Participants
This duel will take place in the Enchanted Arena, a vast space with ever-changing landscapes.
It is a place full of magical energy, where the wizards' spells and actions will have real consequences.

The two wizards for this duel are:
- ${wizard1.name}: ${wizard1.description} (Record: ${wizard1.wins || 0} wins, ${wizard1.losses || 0} losses)
- ${wizard2.name}: ${wizard2.description} (Record: ${wizard2.wins || 0} wins, ${wizard2.losses || 0} losses)

## Duel Structure
- The duel will be ${duelType}
- Each wizard begins with 100 health points
- A wizard losing all health points results in immediate defeat`;

    const prompt = `Introduce the two wizards, ${wizard1.name} and ${wizard2.name}, for their upcoming ${duelType} duel in the Enchanted Arena. Create an epic, dramatic introduction that sets the stage for magical combat.`;

    return await generateObject(
      prompt,
      IntroductionResponseSchema,
      systemPrompt,
      { temperature: 1.5 }
    );
  } catch (error) {
    console.error("AI text generation failed, using fallback:", error);

    // Fallback template-based introduction
    return generateFallbackIntroduction(duel, wizard1, wizard2);
  }
}

// Helper function to generate mock introduction for emulator mode
function generateMockIntroduction(
  duel: Doc<"duels">,
  wizard1: Doc<"wizards">,
  wizard2: Doc<"wizards">
): IntroductionResponse {
  const duelType =
    duel.numberOfRounds === "TO_THE_DEATH"
      ? "to the death"
      : `a ${duel.numberOfRounds} round duel`;

  // Check if we're in test mode and return test-compatible responses
  if (process.env.NODE_ENV === "test") {
    const narration = `Welcome to the Enchanted Arena! Tonight, we witness an epic magical confrontation ${duelType}!

In the eastern corner, we have ${wizard1.name}! ${wizard1.description} This formidable spellcaster enters the arena with ${wizard1.wins || 0} victories and ${wizard1.losses || 0} defeats, their magical aura crackling with anticipation.

And in the western corner, ${wizard2.name}! ${wizard2.description} With a record of ${wizard2.wins || 0} wins and ${wizard2.losses || 0} losses, they stand ready to prove their magical supremacy.

The arena itself pulses with ancient magic, its ever-changing landscape ready to challenge both combatants. Mystical energies swirl through the air as these two masters of the arcane arts prepare to unleash their most powerful spells.

Both wizards begin with 100 health points. Victory will come to the one who can outmaneuver, outthink, and outcast their opponent. The crowd falls silent as the magical barriers shimmer into place, and the duel is about to begin!

Let the magical combat commence!`;

    const result = `The stage is set for an epic magical duel between ${wizard1.name} and ${wizard2.name}!`;

    const illustrationPrompt = `Low poly art style illustration of two powerful wizards facing each other in a magical arena, viewed from the spectator stands. ${wizard1.name} on the left: ${wizard1.description}. ${wizard2.name} on the right: ${wizard2.description}. Epic magical arena with swirling mystical energies, dynamic lighting, magical particles floating in the air, ancient stone architecture, dramatic atmosphere, wide shot showing the full arena from an elevated perspective.`;

    return {
      narration,
      result,
      illustrationPrompt,
    };
  }

  const narration = `🎭 MOCK INTRODUCTION: Welcome, spectators, to the Enchanted Arena! Tonight, we witness a simulated epic magical confrontation ${duelType}!

In the eastern corner, we have ${wizard1.name}! ${wizard1.description} This formidable spellcaster enters the mock arena with ${wizard1.wins || 0} victories and ${wizard1.losses || 0} defeats, their simulated magical aura crackling with anticipation.

And in the western corner, ${wizard2.name}! ${wizard2.description} With a record of ${wizard2.wins || 0} wins and ${wizard2.losses || 0} losses, they stand ready to prove their magical supremacy in this test environment.

The mock arena pulses with simulated ancient magic, its ever-changing landscape ready to challenge both combatants in this demonstration. Mystical energies swirl through the air as these two masters of the arcane arts prepare to unleash their most powerful spells.

Both wizards begin with 100 health points. Victory will come to the one who can outmaneuver, outthink, and outcast their opponent. The crowd falls silent as the magical barriers shimmer into place, and the mock duel is about to begin!

Let the simulated magical combat commence!`;

  const result = `🎭 Mock duel setup: The stage is set for an epic magical duel between ${wizard1.name} and ${wizard2.name}!`;

  const illustrationPrompt = `Low poly art style illustration of two powerful wizards facing each other in a magical arena, viewed from the spectator stands. ${wizard1.name} on the left: ${wizard1.description}. ${wizard2.name} on the right: ${wizard2.description}. Epic magical arena with swirling mystical energies, dynamic lighting, magical particles floating in the air, ancient stone architecture, dramatic atmosphere, wide shot showing the full arena from an elevated perspective.`;

  return {
    narration,
    result,
    illustrationPrompt,
  };
}

// Helper function to generate fallback introduction
function generateFallbackIntroduction(
  duel: Doc<"duels">,
  wizard1: Doc<"wizards">,
  wizard2: Doc<"wizards">
): IntroductionResponse {
  const duelType =
    duel.numberOfRounds === "TO_THE_DEATH"
      ? "to the death"
      : `a ${duel.numberOfRounds} round duel`;

  const narration = `Welcome, spectators, to the Enchanted Arena! Tonight, we witness an epic magical confrontation ${duelType}!

In the eastern corner, we have ${wizard1.name}! ${wizard1.description} This formidable spellcaster enters the arena with ${wizard1.wins || 0} victories and ${wizard1.losses || 0} defeats, their magical aura crackling with anticipation.

And in the western corner, ${wizard2.name}! ${wizard2.description} With a record of ${wizard2.wins || 0} wins and ${wizard2.losses || 0} losses, they stand ready to prove their magical supremacy.

The arena itself pulses with ancient magic, its ever-changing landscape ready to challenge both combatants. Mystical energies swirl through the air as these two masters of the arcane arts prepare to unleash their most powerful spells.

Both wizards begin with 100 health points. Victory will come to the one who can outmaneuver, outthink, and outcast their opponent. The crowd falls silent as the magical barriers shimmer into place, and the duel is about to begin!

Let the magical combat commence!`;

  const result = `The stage is set for an epic magical duel between ${wizard1.name} and ${wizard2.name}!`;

  const illustrationPrompt = `Low poly art style illustration of two powerful wizards facing each other in a magical arena, viewed from the spectator stands. ${wizard1.name} on the left: ${wizard1.description}. ${wizard2.name} on the right: ${wizard2.description}. Epic magical arena with swirling mystical energies, dynamic lighting, magical particles floating in the air, ancient stone architecture, dramatic atmosphere, wide shot showing the full arena from an elevated perspective.`;

  return {
    narration,
    result,
    illustrationPrompt,
  };
}
