"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { generateText } from "./aiTextGeneration";

/**
 * Get AI spell strategy for campaign battles based on opponent personality and difficulty
 */
export const getCampaignAISpellStrategy = action({
  args: {
    opponentNumber: v.number(),
    playerSpell: v.string(),
    battleContext: v.object({
      playerWizardName: v.string(),
      playerWizardDescription: v.string(),
      aiWizardName: v.string(),
      aiWizardDescription: v.string(),
      battleHistory: v.array(v.string()),
      currentRound: v.number(),
    }),
  },
  returns: v.object({
    spell: v.string(),
    reasoning: v.string(),
  }),
  handler: async (ctx, args) => {
    const { opponentNumber, playerSpell, battleContext } = args;

    // Define opponent personalities and difficulty scaling
    const opponentPersonalities = {
      1: {
        name: "Novice Apprentice",
        personality: "cautious and defensive, prefers simple spells",
        difficulty: 0.3,
      },
      2: {
        name: "Forest Guardian",
        personality: "nature-loving and protective, uses earth and plant magic",
        difficulty: 0.4,
      },
      3: {
        name: "Fire Adept",
        personality:
          "aggressive and passionate, favors fire and lightning spells",
        difficulty: 0.5,
      },
      4: {
        name: "Ice Sorceress",
        personality:
          "cold and calculating, uses ice and water magic strategically",
        difficulty: 0.6,
      },
      5: {
        name: "Shadow Weaver",
        personality: "mysterious and cunning, employs dark magic and illusions",
        difficulty: 0.7,
      },
      6: {
        name: "Storm Caller",
        personality: "wild and unpredictable, commands wind and lightning",
        difficulty: 0.75,
      },
      7: {
        name: "Arcane Scholar",
        personality:
          "intellectual and methodical, uses complex magical theories",
        difficulty: 0.8,
      },
      8: {
        name: "Battle Mage",
        personality: "experienced warrior-wizard, tactical and aggressive",
        difficulty: 0.85,
      },
      9: {
        name: "Elder Mystic",
        personality: "wise and powerful, uses ancient and forbidden magic",
        difficulty: 0.9,
      },
      10: {
        name: "Archmage Supreme",
        personality: "legendary master of all magic, adaptive and overwhelming",
        difficulty: 0.95,
      },
    };

    const opponent =
      opponentPersonalities[
        opponentNumber as keyof typeof opponentPersonalities
      ];
    if (!opponent) {
      throw new Error(`Invalid opponent number: ${opponentNumber}`);
    }

    // Build context for AI spell generation
    const battleHistoryText =
      battleContext.battleHistory.length > 0
        ? `Previous rounds: ${battleContext.battleHistory.join(", ")}`
        : "This is the first round of battle.";

    const prompt = `You are ${battleContext.aiWizardName}, a ${opponent.name} with the following personality: ${opponent.personality}.

You are in a magical duel against ${battleContext.playerWizardName} (${battleContext.playerWizardDescription}).

Current situation:
- Round ${battleContext.currentRound}
- ${battleHistoryText}
- Your opponent just cast: "${playerSpell}"

Your character description: ${battleContext.aiWizardDescription}

Based on your personality and the current battle situation, choose your spell and provide reasoning. Your difficulty level is ${opponent.difficulty}, so you should be ${opponent.difficulty > 0.7 ? "highly strategic and powerful" : opponent.difficulty > 0.5 ? "moderately skilled" : "relatively simple in approach"}.

Respond with a spell that fits your personality and a brief explanation of your strategy.`;

    try {
      const response = await generateText(prompt, undefined, {
        temperature: 0.7,
        maxTokens: 200,
      });

      // Parse the response to extract spell and reasoning
      // For now, we'll use a simple approach - the AI should provide both
      const lines = response.split("\n").filter((line) => line.trim());

      let spell = "";
      let reasoning = "";

      // Try to extract spell and reasoning from the response
      for (const line of lines) {
        if (
          line.toLowerCase().includes("spell:") ||
          line.toLowerCase().includes("cast:")
        ) {
          spell = line.replace(/^.*?(?:spell:|cast:)\s*/i, "").trim();
        } else if (
          line.toLowerCase().includes("reasoning:") ||
          line.toLowerCase().includes("strategy:")
        ) {
          reasoning = line
            .replace(/^.*?(?:reasoning:|strategy:)\s*/i, "")
            .trim();
        }
      }

      // If we couldn't parse structured output, use the whole response as reasoning
      // and extract a likely spell from it
      if (!spell) {
        spell = response.split(".")[0].trim(); // Take first sentence as spell
        reasoning = response;
      }

      if (!reasoning) {
        reasoning = response;
      }

      return {
        spell: spell || "Magic Missile", // Fallback spell
        reasoning: reasoning || "A strategic choice for this situation.",
      };
    } catch (error) {
      console.error("Error generating AI spell strategy:", error);

      // Fallback strategy based on opponent personality
      const fallbackSpells = {
        1: "Shield of Light",
        2: "Thorn Barrier",
        3: "Fireball",
        4: "Ice Shard",
        5: "Shadow Bolt",
        6: "Lightning Strike",
        7: "Arcane Missile",
        8: "Battle Fury",
        9: "Ancient Curse",
        10: "Reality Tear",
      };

      return {
        spell:
          fallbackSpells[opponentNumber as keyof typeof fallbackSpells] ||
          "Magic Missile",
        reasoning: `As a ${opponent.name}, I choose this spell based on my ${opponent.personality}.`,
      };
    }
  },
});
