"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { generateText } from "./aiTextGeneration";
import { Id } from "./_generated/dataModel";

// Types for the introduction response
export interface IntroductionResponse {
  narration: string;
  result: string;
  illustrationPrompt: string;
}

// Type for wizard data
interface WizardData {
  _id: Id<"wizards">;
  name: string;
  description: string;
  wins?: number;
  losses?: number;
  owner: string;
  illustration?: string;
}

// Generate duel introduction using AI
export const generateDuelIntroduction = action({
  args: {
    duelId: v.id("duels"),
  },
  handler: async (
    ctx,
    { duelId }
  ): Promise<{ success: boolean; introRoundId: Id<"duelRounds"> }> => {
    console.log(`Starting introduction generation for duel ${duelId}`);

    try {
      // Get the duel data
      const duel = await ctx.runQuery(api.duels.getDuel, { duelId });
      if (!duel) {
        throw new Error("Duel not found");
      }

      // Get wizard data
      const wizards = await Promise.all(
        duel.wizards.map((wizardId: Id<"wizards">) =>
          ctx.runQuery(api.wizards.getWizard, { wizardId })
        )
      );

      if (wizards.length < 2 || wizards.some((w: WizardData | null) => !w)) {
        throw new Error("Could not fetch all wizard data");
      }

      // Ensure we have exactly 2 wizards and they're not null
      if (wizards.length !== 2 || !wizards[0] || !wizards[1]) {
        throw new Error("Could not fetch all wizard data");
      }

      const wizard1 = wizards[0] as WizardData;
      const wizard2 = wizards[1] as WizardData;

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

      // Generate the illustration
      if (introduction.illustrationPrompt) {
        try {
          // Schedule illustration generation
          ctx.scheduler.runAfter(
            0,
            api.generateRoundIllustration.generateRoundIllustration,
            {
              illustrationPrompt: introduction.illustrationPrompt,
              duelId,
              roundNumber: "0",
            }
          );
        } catch (error) {
          console.error("Failed to schedule introduction illustration:", error);
          // Continue without illustration - don't fail the entire introduction
        }
      }

      // Start the duel (move to first actual round)
      await ctx.runMutation(api.duels.startDuelAfterIntroduction, { duelId });

      console.log(`Successfully generated introduction for duel ${duelId}`);
      return { success: true, introRoundId };
    } catch (error) {
      console.error(`Error generating introduction for duel ${duelId}:`, error);
      throw new Error(
        `Failed to generate duel introduction: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
});

// Helper function to generate introduction text using AI
async function generateIntroductionText(
  duel: { numberOfRounds: number | "TO_THE_DEATH" },
  wizard1: WizardData,
  wizard2: WizardData
): Promise<IntroductionResponse> {
  const duelType =
    duel.numberOfRounds === "TO_THE_DEATH"
      ? "to the death"
      : `a ${duel.numberOfRounds} round duel`;

  try {
    // Use AI text generation with Gemini 2.5 Flash
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
- A wizard losing all health points results in immediate defeat

You must return ONLY a valid JSON object with these exact keys:
{
  "narration": "A vivid, detailed introduction of the magical combat that is about to take place. This should be several paragraphs and capture the drama and excitement of the duel, written in present tense as if events are unfolding in real time.",
  "result": "A brief summary of the introduction, this can be a little snarky or humorous if you like.",
  "illustrationPrompt": "A very detailed prompt for a low poly art style illustration capturing the moment from a great distance, as if viewed from the stands surrounding the arena. Include wizard appearances, environments, spell effects, and dynamic lighting with magical particles."
}`;

    const prompt = `Introduce the two wizards, ${wizard1.name} and ${wizard2.name}, for their upcoming ${duelType} duel in the Enchanted Arena. Create an epic, dramatic introduction that sets the stage for magical combat.`;

    const aiResponse = await generateText(prompt, systemPrompt, {
      temperature: 1.5,
    });

    // Try to parse the JSON response
    let parsedResponse: IntroductionResponse;
    try {
      // Clean the response by removing markdown code blocks if present
      let cleanedResponse = aiResponse.trim();
      if (cleanedResponse.startsWith("```")) {
        cleanedResponse = cleanedResponse
          .replace(/^```(json)?\s*/, "")
          .replace(/\s*```$/, "");
      }

      parsedResponse = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      console.log("Raw AI response:", aiResponse);
      throw new Error("AI returned invalid JSON format");
    }

    // Validate the response has required fields
    if (
      !parsedResponse.narration ||
      !parsedResponse.result ||
      !parsedResponse.illustrationPrompt
    ) {
      console.error("AI response missing required fields:", parsedResponse);
      throw new Error("AI response missing required fields");
    }

    return {
      narration: parsedResponse.narration,
      result: parsedResponse.result,
      illustrationPrompt: parsedResponse.illustrationPrompt,
    };
  } catch (error) {
    console.error("AI text generation failed, using fallback:", error);

    // Fallback template-based introduction
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
}
