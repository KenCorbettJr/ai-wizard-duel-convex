"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { z } from "genkit/beta";
import { generateObject } from "./aiTextGeneration";
import { CONTENT_STANDARDS } from "./lib/contentStandards";

const IDEA_COUNT = 3;
const MAX_IDEA_LENGTH = 120;

// Used when the model fails, so the button always gives something.
const FALLBACK_IDEAS = [
  "Raise a shimmering shield, then strike back with lightning",
  "Summon a gust of wind to knock them off balance",
  "Conjure a wall of flame to block their next attack",
];

const IdeasSchema = z.object({
  ideas: z
    .array(z.string())
    .describe(
      `${IDEA_COUNT} different action ideas, each one short sentence under ${MAX_IDEA_LENGTH} characters`,
    ),
});

/**
 * Three spell ideas for the caller's next move, fitted to their wizard, their
 * opponent and how the duel is going. Only generated when a duelist asks.
 */
export const suggestSpellIdeas = action({
  args: { duelId: v.id("duels") },
  returns: v.array(v.string()),
  handler: async (ctx, { duelId }): Promise<string[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const context = await ctx.runQuery(
      internal.spellIdeasData.getSpellIdeaContext,
      { duelId, userId: identity.subject },
    );
    if (!context) throw new Error("You aren't casting in this duel");

    const system = `You suggest moves for a player in a turn-based wizard duel game. Write ${IDEA_COUNT} distinct ideas for what the player's wizard could do this round.
Rules:
- Write each idea as a short command to the wizard, starting with a verb, like "Turn into a boulder and roll over them". Never include the wizard's name or the opponent's name; say "them" for the opponent.
- Under ${MAX_IDEA_LENGTH} characters each, no quotes, no numbering.
- Fit the wizard's own style and abilities from their description, and react to what just happened in the duel.
- Make the three different: for example one attack, one defense or trick, and one bold or funny move.
- Don't repeat moves the wizard already used.
${CONTENT_STANDARDS}`;

    const prompt = [
      `Round ${context.roundNumber}.`,
      `The player's wizard: ${context.wizard.name}. ${context.wizard.description}. Health ${context.health}/100.`,
      `The opponent: ${context.opponent.name}. ${context.opponent.description}. Health ${context.opponentHealth}/100.`,
      context.lastNarrative
        ? `What happened last round: ${context.lastNarrative}`
        : "This is the first round.",
      context.pastSpells.length
        ? `Moves the wizard already used: ${context.pastSpells.join(" | ")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const { ideas } = await generateObject(
        prompt,
        IdeasSchema,
        system,
        { temperature: 1.1, maxTokens: 512 },
        {
          spanName: "suggest_spell_ideas",
          usageCtx: ctx,
          distinctId: identity.subject,
          sessionId: `duel-${duelId}`,
        },
      );
      const cleaned = ((ideas ?? []) as string[])
        .map((idea) =>
          idea
            .replace(/^\s*(\d+[.)]|[-*•])\s+/, "") // list numbering or bullets
            .replace(/^["'\s]+|["'\s]+$/g, ""),
        )
        .filter((idea) => idea.length > 0)
        .map((idea) => idea.slice(0, MAX_IDEA_LENGTH))
        .slice(0, IDEA_COUNT);
      return cleaned.length > 0 ? cleaned : FALLBACK_IDEAS;
    } catch (error) {
      console.error("Spell idea generation failed:", error);
      return FALLBACK_IDEAS;
    }
  },
});
