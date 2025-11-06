"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { api, internal } from "./_generated/api";
import { generateObject } from "./aiTextGeneration";
import { z } from "genkit/beta";
import { isEmulatorMode } from "./mocks/mockServices";

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
        previousRounds
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
  previousRounds: Doc<"duelRounds">[]
): Promise<string> {
  // Schema for AI response
  const SpellSchema = z.object({
    spellDescription: z
      .string()
      .describe(
        "A creative spell description that fits the wizard's personality and spell style, considering the current situation in the duel"
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
    // Build context about the duel
    let context = `You are ${wizard.name}, a ${wizard.difficulty} campaign opponent wizard. Your description: ${wizard.description}`;
    context += `\nYour spell style: ${wizard.spellStyle}`;
    context += `\nYour personality traits: ${wizard.personalityTraits?.join(", ") || "mysterious"}`;

    if (opponentWizard) {
      context += `\nYour opponent: ${opponentWizard.name} - ${opponentWizard.description}`;
    }

    context += `\nCurrent round: ${currentRound.roundNumber}`;
    context += `\nYour current health: ${duel.hitPoints[wizard._id] || 100}/100`;

    if (opponentWizard) {
      context += `\nOpponent's health: ${duel.hitPoints[opponentWizard._id] || 100}/100`;
    }

    // Add context from previous rounds
    if (previousRounds.length > 0) {
      context += `\nPrevious rounds summary:`;
      previousRounds.slice(-2).forEach((round) => {
        if (round.outcome?.result) {
          context += `\nRound ${round.roundNumber}: ${round.outcome.result}`;
        }
      });
    }

    const prompt = `${context}

Generate a spell action for this wizard in the current duel situation. The spell should:
1. Fit the wizard's personality and spell style
2. Be appropriate for the current situation (health levels, round number)
3. Be creative and engaging
4. Be a single short sentence describing the action that the wizard will take or spell that the wizard will cast
5. Will not describe how the action will affect the other wizard or what the outcome of the action will be.

Consider the wizard's difficulty level: ${wizard.difficulty} wizards should use appropriately powered spells.`;

    const systemPrompt = `You are an AI that generates spell actions for campaign opponent wizards in magical duels. Create spells that are:
- Consistent with the wizard's personality and style
- Appropriate for the current duel situation
- Creative and engaging for players
- Balanced for the wizard's difficulty level`;

    const result = await generateObject(prompt, SpellSchema, systemPrompt, {
      temperature: 1.2,
    });
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
