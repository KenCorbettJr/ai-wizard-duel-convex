"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { api, internal } from "./_generated/api";
import {
  generateObject,
  type AIObservabilityContext,
} from "./aiTextGeneration";
import { z } from "genkit/beta";
import { isEmulatorMode } from "./mocks/mockServices";
import { CONTENT_STANDARDS } from "./lib/contentStandards";
import {
  buildOpponentSpellPrompt,
  type OpponentPromptWizard,
} from "./lib/campaignOpponentPrompt";

function toPromptWizard(wizard: Doc<"wizards">): OpponentPromptWizard {
  return {
    id: wizard._id,
    name: wizard.name,
    description: wizard.description,
    spellStyle: wizard.spellStyle,
    personalityTraits: wizard.personalityTraits,
    difficulty: wizard.difficulty,
  };
}

// Generate AI action for campaign opponent
export const generateCampaignOpponentAction = internalAction({
  args: {
    duelId: v.id("duels"),
    wizardId: v.id("wizards"),
  },
  returns: v.object({
    success: v.boolean(),
    spellDescription: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, { duelId, wizardId }) => {
    try {
      // Get duel and wizard data
      const duel = await ctx.runQuery(internal.duels.getDuelInternal, {
        duelId,
      });
      if (!duel) {
        return { success: false, error: "Duel not found" };
      }

      const wizard = await ctx.runQuery(internal.wizards.getWizardInternal, {
        wizardId,
      });
      if (!wizard || !wizard.isCampaignOpponent) {
        return { success: false, error: "Invalid campaign opponent" };
      }

      // Get current round and previous rounds for context
      const rounds = await ctx.runQuery(api.duels.getDuelRounds, { duelId });
      const currentRound = rounds.find(
        (r) => r.roundNumber === duel.currentRound
      );
      const previousRounds = rounds.filter(
        (r) => r.roundNumber < duel.currentRound && r.roundNumber > 0
      );

      if (!currentRound || currentRound.status !== "WAITING_FOR_SPELLS") {
        return { success: false, error: "Round not ready for spells" };
      }

      // Get opponent wizard data
      const opponentWizardId = duel.wizards.find((id) => id !== wizardId);
      const opponentWizard = opponentWizardId
        ? await ctx.runQuery(internal.wizards.getWizardInternal, {
            wizardId: opponentWizardId,
          })
        : null;

      // Generate spell using AI
      const spellDescription = await generateCampaignOpponentSpell(
        wizard,
        opponentWizard,
        duel,
        currentRound,
        previousRounds,
        {
          sessionId: `duel-${duel._id}`,
          traceId: crypto.randomUUID(),
          distinctId: duel.players.find((player) => player !== "campaign"),
          spanName: "generate_campaign_opponent_spell",
          usageCtx: ctx,
        },
      );

      // Cast the spell
      await ctx.runMutation(internal.duels.castSpellForCampaignOpponent, {
        duelId,
        wizardId,
        spellDescription,
      });

      return { success: true, spellDescription };
    } catch (error) {
      console.error("Failed to generate campaign opponent action:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// Check for campaign opponents that need actions and generate them
export const processCampaignOpponentActions = internalAction({
  args: {
    duelId: v.id("duels"),
  },
  returns: v.object({
    actionsGenerated: v.number(),
    errors: v.array(v.string()),
  }),
  handler: async (ctx, { duelId }) => {
    const duel = await ctx.runQuery(internal.duels.getDuelInternal, { duelId });
    if (!duel || !duel.isCampaignBattle) {
      return { actionsGenerated: 0, errors: ["Not a campaign battle"] };
    }

    let actionsGenerated = 0;
    const errors: string[] = [];

    // Check each wizard that needs to submit an action
    for (const wizardId of duel.needActionsFrom) {
      const wizard = await ctx.runQuery(internal.wizards.getWizardInternal, {
        wizardId,
      });

      // If this is a campaign opponent, generate an action
      if (wizard && wizard.isCampaignOpponent) {
        const result = await ctx.runAction(
          internal.campaignOpponentAI.generateCampaignOpponentAction,
          {
            duelId,
            wizardId,
          }
        );

        if (result.success) {
          actionsGenerated++;
        } else {
          errors.push(
            `Failed to generate action for ${wizard.name}: ${result.error}`
          );
        }
      }
    }

    return { actionsGenerated, errors };
  },
});

// Helper function to generate spell description using AI
async function generateCampaignOpponentSpell(
  wizard: Doc<"wizards">,
  opponentWizard: Doc<"wizards"> | null,
  duel: Doc<"duels">,
  currentRound: Doc<"duelRounds">,
  previousRounds: Doc<"duelRounds">[],
  observabilityContext: AIObservabilityContext,
): Promise<string> {
  // Schema for AI response
  const SpellSchema = z.object({
    spellDescription: z
      .string()
      .describe(
        "One or two vivid sentences describing the wizard's action this round. It fits the wizard's personality and spell style, responds to the duel so far, and uses a different tactic from the wizard's earlier spells"
      ),
  });

  if (isEmulatorMode()) {
    // Return a mock spell for testing
    const mockSpells = [
      `${wizard.spellStyle} spell targeting my opponent!`,
      `A defensive ${wizard.spellStyle} barrier!`,
      `Channeling ${wizard.spellStyle} energy for a powerful attack!`,
      `Using ${wizard.spellStyle} magic to counter my opponent!`,
    ];
    return mockSpells[Math.floor(Math.random() * mockSpells.length)];
  }

  try {
    const prompt = buildOpponentSpellPrompt({
      wizard: toPromptWizard(wizard),
      opponent: opponentWizard ? toPromptWizard(opponentWizard) : null,
      roundNumber: currentRound.roundNumber,
      totalRounds: duel.numberOfRounds,
      hitPoints: duel.hitPoints,
      points: duel.points,
      previousRounds,
    });

    const systemPrompt = `You write the spell a campaign opponent wizard casts each round of a magical duel. The spells should:
- Sound like this particular wizard: their personality, spell style and difficulty
- Fit what is happening in this duel and respond to the opponent
- Feel fresh every round, never a rerun of an earlier spell
- Be creative and fun for the player to face

${CONTENT_STANDARDS}`;

    const result = await generateObject(
      prompt,
      SpellSchema,
      systemPrompt,
      { temperature: 1.2 },
      observabilityContext,
    );
    return result.spellDescription;
  } catch (error) {
    console.error("AI spell generation failed, using fallback:", error);

    // Fallback spell generation
    const fallbackSpells = [
      `${wizard.name} channels ${wizard.spellStyle} energy into a focused attack!`,
      `${wizard.name} weaves a ${wizard.spellStyle} spell with practiced precision!`,
      `${wizard.name} calls upon ${wizard.spellStyle} magic to strike at their opponent!`,
      `${wizard.name} conjures a defensive ${wizard.spellStyle} barrier while preparing a counter-attack!`,
    ];

    return fallbackSpells[Math.floor(Math.random() * fallbackSpells.length)];
  }
}
