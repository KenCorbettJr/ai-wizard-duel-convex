"use node";

import type { Doc } from "../convex/_generated/dataModel";
import { internalAction, ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import {
  generateObject,
  type AIObservabilityContext,
} from "./aiTextGeneration";
import { Id } from "./_generated/dataModel";
import { api, internal } from "./_generated/api";
import { withDuelNames } from "./lib/duelWizardNames";
import { z } from "genkit/beta";
import { isEmulatorMode } from "./mocks/mockServices";
import { Wizard } from "@/types/wizard";
import { CONTENT_STANDARDS } from "./lib/contentStandards";
import {
  describeLuckEdge,
  getDuelResult,
  stalemateWarning,
  trailingStalemateCount,
  type DuelResult,
} from "./lib/duelJudging";

// Zod schema for structured AI output
const BattleRoundResponseSchema = z.object({
  narration: z
    .string()
    .describe(
      "A punchy description of the round's magical combat, written in present tense like a live announcer. Keep it SHORT: 2 brief paragraphs, about 70 to 100 words in total. Focus on the one or two decisive moments and how the spells interact. No scene-setting filler.",
    ),
  result: z
    .string()
    .describe(
      "A short one sentence teaser for the round. This should be a single sentence that captures the essence of the round, ideally 10 words or less.",
    ),
  illustrationPrompt: z
    .string()
    .describe(
      "A one or two sentence scene note naming the round's single decisive moment: who did what to whom, and what it physically looked like. An art director turns this and the narration into the illustration, so do not describe camera angles, art style or the wizards' usual looks.",
    ),
  roundVerdict: z
    .string()
    .describe(
      "One sentence, written BEFORE the numbers below, naming which wizard won this round and the main reason (creativity, how well the action fits the duel, execution, luck). Say the round was even only in the rare case that both actions were genuinely matched.",
    ),
  damageSummary: z
    .string()
    .describe(
      "One sentence, written BEFORE the numbers below, stating for each wizard whether they were actually hit this round and how badly, based strictly on your narration. If an attack was destroyed, blocked, dodged, absorbed or reflected, say the wizard took no damage. The health changes below MUST agree with this sentence.",
    ),
  wizard1: z.object({
    pointsEarned: z
      .number()
      .min(0)
      .max(10)
      .describe(
        "Points earned by wizard 1 (0-10). Wizard 1 is the first wizard named in the output field mapping, NOT necessarily the first listed in the actions.",
      ),
    healthChange: z
      .number()
      .min(-100)
      .max(100)
      .describe(
        "Health change for wizard 1 (-100 to +100, negative means damage taken, positive means healing)",
      ),
  }),
  wizard2: z.object({
    pointsEarned: z
      .number()
      .min(0)
      .max(10)
      .describe("Points earned by wizard 2 (0-10)"),
    healthChange: z
      .number()
      .min(-100)
      .max(100)
      .describe(
        "Health change for wizard 2 (-100 to +100, negative means damage taken, positive means healing)",
      ),
  }),
});

// Zod schema for duel conclusion
const DuelConclusionSchema = z.object({
  narration: z
    .string()
    .describe(
      "A short sports-announcer style wrap-up of the duel: 3 to 5 sentences, about 60 to 90 words. Name the winner, or call it a draw if the duel was a draw, call out only the one to three biggest moments that decided the match, and end on a memorable line. Do NOT recap every round.",
    ),
  result: z
    .string()
    .describe(
      "A brief but impactful summary of the duel conclusion that captures the essence of the outcome (a victory or a draw).",
    ),
  illustrationPrompt: z
    .string()
    .describe(
      "A detailed prompt for a low poly art style illustration of the final outcome, set in the Enchanted Arena with remnants of the duel matching the arena description. Show it exactly as instructed for this duel's result (a victory or a draw).",
    ),
});

// Types for the battle round response
export type BattleRoundResponse = Omit<
  z.infer<typeof BattleRoundResponseSchema>,
  "damageSummary" | "roundVerdict"
> & {
  wizard1Luck?: number;
  wizard2Luck?: number;
  /** Which wizard the AI was told acted first. */
  firstWizard?: 1 | 2;
};
export type DuelConclusionResponse = z.infer<typeof DuelConclusionSchema>;

// Generate a luck number (1-20, like a D20), shifted by any luck bonus and
// clamped back into 1-20.
function generateLuck(bonus = 0): number {
  const roll = Math.floor(Math.random() * 20) + 1;
  return Math.max(1, Math.min(20, roll + bonus));
}

const BASE_LUCK = 10;

// Campaign opponents carry a fixed luck modifier (-2 apprentices, +2
// archmages). Player wizards get the campaign relic bonus from every season
// they've completed.
async function getLuckBonus(
  ctx: ActionCtx,
  wizard: Doc<"wizards">,
): Promise<number> {
  if (wizard.isCampaignOpponent) return wizard.luckModifier ?? 0;
  const effective = await ctx.runQuery(api.campaigns.getWizardEffectiveLuck, {
    wizardId: wizard._id,
  });
  return effective - BASE_LUCK;
}

// Validate and sanitize AI battle response
function validateBattleResponse(response: unknown): BattleRoundResponse | null {
  try {
    // Handle string responses (invalid JSON)
    if (typeof response === "string") {
      // Try to parse as JSON
      try {
        response = JSON.parse(response);
      } catch {
        // If it's not valid JSON, return null to trigger fallback
        return null;
      }
    }

    // Check if response has the required structure
    if (!response || typeof response !== "object") {
      return null;
    }

    // Cast to any for property access, then validate
    const responseObj = response as BattleRoundResponse;

    // Validate required fields exist
    if (
      !responseObj.narration ||
      !responseObj.result ||
      !responseObj.illustrationPrompt
    ) {
      return null;
    }

    // Validate wizard data exists and has required fields
    if (!responseObj.wizard1 || !responseObj.wizard2) {
      return null;
    }

    if (
      typeof responseObj.wizard1.pointsEarned !== "number" ||
      typeof responseObj.wizard1.healthChange !== "number" ||
      typeof responseObj.wizard2.pointsEarned !== "number" ||
      typeof responseObj.wizard2.healthChange !== "number"
    ) {
      return null;
    }

    // Sanitize and bound the values
    const sanitizedResponse: BattleRoundResponse = {
      narration: String(responseObj.narration),
      result: String(responseObj.result),
      illustrationPrompt: String(responseObj.illustrationPrompt),
      wizard1: {
        pointsEarned: Math.max(
          0,
          Math.min(10, Math.floor(responseObj.wizard1.pointsEarned)),
        ),
        healthChange: Math.max(
          -100,
          Math.min(100, Math.floor(responseObj.wizard1.healthChange)),
        ),
      },
      wizard2: {
        pointsEarned: Math.max(
          0,
          Math.min(10, Math.floor(responseObj.wizard2.pointsEarned)),
        ),
        healthChange: Math.max(
          -100,
          Math.min(100, Math.floor(responseObj.wizard2.healthChange)),
        ),
      },
    };

    return sanitizedResponse;
  } catch (error) {
    console.error("Error validating battle response:", error);
    return null;
  }
}

// Process a duel round using AI
export const processDuelRound = internalAction({
  args: {
    duelId: v.id("duels"),
    roundId: v.id("duelRounds"),
  },
  handler: async (ctx, { duelId, roundId }) => {
    try {
      // Get the duel data (using internal query to bypass access control for scheduled actions)
      const duel = await ctx.runQuery(internal.duels.getDuelInternal, {
        duelId,
      });
      if (!duel) {
        throw new Error("Duel not found");
      }

      // Get the specific round
      const rounds = await ctx.runQuery(api.duels.getDuelRounds, { duelId });
      const round = rounds.find((r: { _id: string }) => r._id === roundId);
      if (!round) {
        throw new Error("Round not found");
      }

      // Get wizard data (using internal query to handle both regular wizards and campaign opponents)
      const wizards: Array<Wizard> = await Promise.all(
        duel.wizards.map(
          (wizardId: Id<"wizards">) =>
            ctx.runQuery(internal.wizards.getWizardInternal, {
              wizardId,
            }) as Promise<Wizard>,
        ),
      );

      if (wizards.length < 2 || wizards.some((w) => !w)) {
        throw new Error("Could not fetch all wizard data");
      }

      // Ensure we have exactly 2 wizards and they're not null
      if (wizards.length !== 2 || !wizards[0] || !wizards[1]) {
        throw new Error("Could not fetch all wizard data");
      }

      // Same-named wizards get their owner added so the AI can tell them apart.
      const [wizard1, wizard2] = (await withDuelNames(ctx, [
        wizards[0],
        wizards[1],
      ])) as [Wizard, Wizard];
      const wizard1ID = duel.wizards[0];
      const wizard2ID = duel.wizards[1];
      const observabilityContext: AIObservabilityContext = {
        sessionId: `duel-${duel._id}`,
        traceId: crypto.randomUUID(),
        distinctId: duel.players.find((player) => player !== "campaign"),
        usageCtx: ctx,
      };

      // Generate the battle round using AI
      const battleResult = await generateBattleRound(
        ctx,
        duel,
        round,
        wizard1,
        wizard2,
        wizard1ID,
        wizard2ID,
        observabilityContext,
      );

      // Calculate bounded health changes
      const wizard1HealthUpdates = getBoundedHealthChange(
        battleResult.wizard1.healthChange,
        duel.hitPoints[wizard1ID] ?? 100,
      );

      const wizard2HealthUpdates = getBoundedHealthChange(
        battleResult.wizard2.healthChange,
        duel.hitPoints[wizard2ID] ?? 100,
      );

      // Get the luck rolls that were used in the battle generation
      const wizard1Luck = battleResult.wizard1Luck || generateLuck();
      const wizard2Luck = battleResult.wizard2Luck || generateLuck();

      // Update the round with the outcome
      await ctx.runMutation(internal.duels.completeRound, {
        roundId,
        outcome: {
          narrative: battleResult.narration,
          result: battleResult.result,
          illustrationPrompt: battleResult.illustrationPrompt,
          pointsAwarded: {
            [wizard1ID]: battleResult.wizard1.pointsEarned,
            [wizard2ID]: battleResult.wizard2.pointsEarned,
          },
          healthChange: {
            [wizard1ID]: wizard1HealthUpdates.healthChange,
            [wizard2ID]: wizard2HealthUpdates.healthChange,
          },
          luckRolls: {
            [wizard1ID]: wizard1Luck,
            [wizard2ID]: wizard2Luck,
          },
          ...(battleResult.firstWizard
            ? {
                firstWizard:
                  battleResult.firstWizard === 1 ? wizard1ID : wizard2ID,
              }
            : {}),
        },
      });

      // Schedule round illustration generation (with credit checking)
      if (process.env.NODE_ENV !== "test" && battleResult.illustrationPrompt) {
        // Determine which user should be charged for the image generation
        // Use the first player in the duel for credit consumption
        const firstPlayerId = duel.players[0];

        // Players paid a token when the duel started. Images are only skipped
        // when the duel was created in text-only mode.
        const skipImageGeneration = duel.textOnlyMode || false;
        if (skipImageGeneration) {
          console.log(
            `Duel ${duelId} round ${round.roundNumber} is in text-only mode by user preference`,
          );
        }

        await ctx.runMutation(api.duels.scheduleRoundIllustration, {
          illustrationPrompt: battleResult.illustrationPrompt,
          duelId,
          roundNumber: round.roundNumber.toString(),
          userId: firstPlayerId,
          skipImageGeneration,
        });
      }

      // Check if we need to generate a conclusion
      const updatedDuel = await ctx.runQuery(internal.duels.getDuelInternal, {
        duelId,
      });
      if (updatedDuel && updatedDuel.status === "COMPLETED") {
        await generateDuelConclusion(
          ctx,
          duelId,
          updatedDuel,
          wizard1,
          wizard2,
          wizard1ID,
          wizard2ID,
          observabilityContext,
        );
      }

      return { success: true, roundId };
    } catch (error) {
      throw new Error(
        `Failed to process duel round: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  },
});

// Helper function to calculate bounded health changes
function getBoundedHealthChange(
  healthChange: number,
  currentHealth: number,
): { healthChange: number; newHealth: number } {
  let newHealth = currentHealth + healthChange;

  if (newHealth < 0) {
    healthChange = -currentHealth;
    newHealth = 0;
  }

  if (newHealth > 100) {
    healthChange = 100 - currentHealth;
    newHealth = 100;
  }

  return { healthChange, newHealth };
}

// Helper function to generate battle round using AI
async function generateBattleRound(
  ctx: ActionCtx,
  duel: Doc<"duels">,
  round: Doc<"duelRounds">,
  wizard1: Doc<"wizards">,
  wizard2: Doc<"wizards">,
  wizard1ID: Id<"wizards">,
  wizard2ID: Id<"wizards">,
  observabilityContext: AIObservabilityContext,
): Promise<BattleRoundResponse> {
  // Get wizard actions
  const wizard1Action = round.spells?.[wizard1ID]?.description || "No action";
  const wizard2Action = round.spells?.[wizard2ID]?.description || "No action";

  // Generate luck for each wizard, including relic and opponent modifiers
  const [wizard1Bonus, wizard2Bonus] = await Promise.all([
    getLuckBonus(ctx, wizard1),
    getLuckBonus(ctx, wizard2),
  ]);
  const wizard1Luck = generateLuck(wizard1Bonus);
  const wizard2Luck = generateLuck(wizard2Bonus);

  // Determine action order randomly
  const firstWizard: 1 | 2 = Math.random() < 0.5 ? 1 : 2;

  // Get all previous rounds for context
  const allRounds = await ctx.runQuery(api.duels.getDuelRounds, {
    duelId: duel._id,
  });
  const previousRounds = allRounds
    .filter(
      (r: { roundNumber: number; status: string }) =>
        r.roundNumber < round.roundNumber && r.status === "COMPLETED",
    )
    .sort(
      (a: { roundNumber: number }, b: { roundNumber: number }) =>
        a.roundNumber - b.roundNumber,
    );

  const systemPrompt = generateSystemPrompt(
    duel,
    wizard1,
    wizard2,
    previousRounds,
  );

  const roundActions = generateRoundActions(
    wizard1,
    wizard2,
    wizard1ID,
    wizard2ID,
    wizard1Action,
    wizard2Action,
    wizard1Luck,
    wizard2Luck,
    duel,
    firstWizard,
  );

  const previousRoundsContext = generatePreviousRoundsContext(
    previousRounds,
    wizard1,
    wizard2,
  );

  const luckGuidance = describeLuckEdge(
    { id: wizard1ID, name: wizard1.name, luck: wizard1Luck },
    { id: wizard2ID, name: wizard2.name, luck: wizard2Luck },
  );
  const stalemateNote = stalemateWarning(
    trailingStalemateCount(previousRounds, [wizard1ID, wizard2ID]),
  );

  const prompt = `${previousRoundsContext}\n\n=== Round ${round.roundNumber} ===\n${roundActions}\n\n=== LUCK THIS ROUND ===\n${luckGuidance}${stalemateNote ? `\n\n${stalemateNote}` : ""}\n\n=== OUTPUT FIELD MAPPING (IMPORTANT) ===\nIn your JSON response, the "wizard1" object is ONLY for ${wizard1.name}, and the "wizard2" object is ONLY for ${wizard2.name}. This is true regardless of the order the actions are listed above. Double check that each wizard's pointsEarned and healthChange are in the correct object: damage taken by ${wizard1.name} goes in wizard1, damage taken by ${wizard2.name} goes in wizard2.\n\nKeep the narration brief (about 70 to 100 words).`;

  try {
    // Use structured output with schema for better AI responses
    if (isEmulatorMode() || process.env.NODE_ENV === "test") {
      console.log("🎭 Using mock AI battle generation (emulator/test mode)");
      // In emulator/test mode, generate a mock response that matches the schema
      return {
        ...generateMockBattleResult(
          wizard1,
          wizard2,
          wizard1Action,
          wizard2Action,
        ),
        wizard1Luck,
        wizard2Luck,
        firstWizard,
      };
    }

    const aiResponse = await generateObject(
      prompt,
      BattleRoundResponseSchema,
      systemPrompt,
      { temperature: 1.5, maxTokens: 5000 },
      { ...observabilityContext, spanName: "generate_duel_round" },
    );

    // Validate the AI response structure
    const validatedResponse = validateBattleResponse(aiResponse);
    if (validatedResponse) {
      return {
        ...validatedResponse,
        wizard1Luck,
        wizard2Luck,
        firstWizard,
      };
    } else {
      throw new Error("AI returned invalid response structure");
    }
  } catch (error) {
    console.error("AI battle generation failed, using fallback:", error);

    // Fallback battle result
    return {
      ...generateFallbackBattleResult(
        wizard1,
        wizard2,
        wizard1Action,
        wizard2Action,
      ),
      wizard1Luck,
      wizard2Luck,
      firstWizard,
    };
  }
}
// Helper function to generate previous rounds context
function generatePreviousRoundsContext(
  previousRounds: Array<Doc<"duelRounds">>,
  wizard1: Doc<"wizards">,
  wizard2: Doc<"wizards">,
): string {
  if (previousRounds.length === 0) {
    return "=== Previous Rounds ===\nThis is the first round of combat. No previous rounds to reference.";
  }

  let context = "=== Previous Rounds ===\n";
  context += "Here is what has happened in the duel so far:\n\n";

  previousRounds.forEach((round) => {
    if (round.roundNumber === 0) {
      // Introduction round
      context += `**Introduction**: ${round.outcome?.narrative || "The duel began."}\n\n`;
    } else {
      // Battle round
      context += `**Round ${round.roundNumber}**:\n`;
      if (round.outcome?.narrative) {
        context += `${round.outcome.narrative}\n`;
      }
      if (round.outcome?.result) {
        context += `Result: ${round.outcome.result}\n`;
      }
      if (round.outcome?.pointsAwarded) {
        const wizard1Points = round.outcome.pointsAwarded[wizard1._id] || 0;
        const wizard2Points = round.outcome.pointsAwarded[wizard2._id] || 0;
        context += `Points awarded: ${wizard1.name} (+${wizard1Points}), ${wizard2.name} (+${wizard2Points})\n`;
      }
      if (round.outcome?.healthChange) {
        const wizard1Health = round.outcome.healthChange[wizard1._id] || 0;
        const wizard2Health = round.outcome.healthChange[wizard2._id] || 0;
        if (wizard1Health !== 0 || wizard2Health !== 0) {
          context += `Health changes: ${wizard1.name} (${wizard1Health > 0 ? "+" : ""}${wizard1Health}), ${wizard2.name} (${wizard2Health > 0 ? "+" : ""}${wizard2Health})\n`;
        }
      }
      context += "\n";
    }
  });

  context +=
    "Use this context to maintain narrative consistency and build upon previous events in the duel.\n";
  return context;
}

// Helper function to generate system prompt
function generateSystemPrompt(
  duel: Doc<"duels">,
  wizard1: Doc<"wizards">,
  wizard2: Doc<"wizards">,
  previousRounds: unknown[] = [],
): string {
  const duelType =
    duel.numberOfRounds === "TO_THE_DEATH"
      ? "to the death"
      : `a ${duel.numberOfRounds} round duel`;

  const contextualGuidance =
    previousRounds.length > 0
      ? `\n\n## Narrative Continuity
You have access to the complete history of this duel. Use this context to:
- Reference previous events and their consequences
- Build upon established magical themes and strategies
- Maintain consistency with the arena environment and atmosphere
- Show character development and adaptation throughout the duel
- Create satisfying narrative progression that acknowledges past rounds

The wizards and spectators remember everything that has happened. Make sure your narration reflects the ongoing story of this epic magical confrontation.`
      : "";

  return `# Wizard Duel System Guidelines
You are the Arcane Arbiter, an impartial magical referee for wizard duels. Your role is to interpret, adjudicate, and narrate magical combat between two wizards. Remember, both actions happen simultaneously, so carefully consider how each wizard's actions affect the other.

# Arena & Participants
This duel will take place in the Enchanted Arena, a vast space with ever-changing landscapes.
It is a place full of magical energy, where the wizards' spells and actions will have real consequences.

The two wizards for this duel are:
- ${wizard1.name}: ${wizard1.description}
- ${wizard2.name}: ${wizard2.description}

The duel began with the wizards facing each other from opposite sides of the arena, about 50 feet apart. Since then they may have moved, so use the previous rounds to track positions. They are free to move, fly, change the environment, and close in or back away. The arena is vast, with spectator stands all around, not a small platform.

## Duel Structure
- The duel will be ${duelType}
- In each round, both wizards submit their actions simultaneously
- Each wizard begins with 100 health points
- A wizard losing all health points results in immediate defeat
- If all rounds complete without a defeat, the wizard with the most points wins
- Each round's actions are evaluated based on magical principles, logical interactions, and luck

## Magical Principles
The following principles govern magical interactions in this realm:
1. Conservation of Energy: More powerful spells require more magical energy
2. Law of Opposition: Opposing elemental forces weaken each other (fire vs water, etc.), but they rarely cancel out perfectly. The stronger, better-aimed or luckier force usually pushes at least partly through.
3. Law of Resonance: Similar magical energies amplify each other
4. Law of Intention: Spells cast with clearer intent have greater focus
5. Law of Preparation: Defensive preparations are effective against anticipated attacks
6. Principle of Reflection: Magic can be redirected or reflected under certain conditions

## Evaluation Criteria
You should award points (0-10) to each wizard based on the effectiveness of their actions.
When judging each round, consider:
1. Creativity & Strategy
   - Originality of approach
   - Strategic thinking and adaptation to opponent's style
   - Clever use of environment
2. Magical Complexity
   - Technical difficulty of spells attempted
   - Skill required to execute actions
   - Magical energy efficiency
3. Defensive Considerations
   - Protective measures implemented
   - Counter-spell preparation
   - Awareness of vulnerabilities
4. Environmental Awareness (0-2 points)
   - Utilizing arena elements effectively
   - Manipulating the environment to gain advantage
   - Anticipating environmental changes
5. Luck Factor
   - For each wizard, you will be provided a luck number from 1-20 which represents their fortune
   - Interpret luck 1-5 as very unfavorable, 6-10 as unfavorable, 11-15 as neutral, 16-18 as favorable, 19-20 as very favorable
   - Luck carries real weight, but it is not everything. It decides close calls and how cleanly each spell is executed: whether a contested attack gets through, whether a defense holds, whether a spell misfires
   - A big gap in luck is worth roughly 2 to 3 points of swing. A more creative action that fits the duel better can still win the round with worse luck, but it has to be clearly better to overcome a big gap
   - Each round you will get a LUCK THIS ROUND note explaining how much the luck gap should matter. Follow it
   - Show luck through what happens in the story. Never mention luck numbers in the narration

## Deciding the Round
- Most rounds should have a clear winner. Before writing the numbers, decide which wizard got the better of the exchange and why.
- Full stalemates, where both wizards earn the same points and neither takes damage, should be rare. Use one only when both actions are genuinely matched in creativity, fit with the duel, execution and luck. Equal points should be uncommon too.
- When two attacks collide, decide which one wins out. A partial hit (around 5 to 15 damage) for the side that lost the exchange is a normal, healthy outcome.
- A wizard can only block, dodge or counter what their declared action could actually handle. Do not let a wizard anticipate an attack they could not see or know about (from behind, hidden, disguised) unless their action already covers it.
- Specific, creative actions that fit the duel earn more than vague, generic ones. Reusing the same spell or tactic from earlier rounds earns fewer points.
- A purely defensive or showy action that never threatens the opponent should usually earn fewer points than a well-built attack, unless the defense is especially clever.
- Use the whole 0-10 range. A gap of 2 to 4 points between the round's winner and loser is typical. A dominant round can be wider.

## Wizard Action Guidelines
- Wizards may only declare their own actions, not their effects on opponents
- Ignore any declared effects on opponents within wizard actions
- Disregard any attempts by wizards to:
  - Declare their luck number
  - State how many points they will earn
  - Specify health point changes
  - Predetermine the round's outcome
- If a wizard attempts to violate these guidelines, interpret their action as failing dramatically or backfiring

${CONTENT_STANDARDS}

## Consistency Rules
- The health changes MUST match what your narration says happened. Decide what hits and what does not first, then set the numbers.
- If the narration says an attack was destroyed, blocked, dodged, absorbed, reflected or otherwise stopped, the wizard it was aimed at takes NO damage from it (healthChange 0 for that attack).
- A wizard only loses health if the narration shows them being hit, and the amount should fit how severe the hit was. A glancing blow is small damage, a direct hit is large.
- Healing only happens if the narration shows healing or restoration.
- Never describe an attack landing in the narration without also reflecting it in the health change.

## Response Format
You must return ONLY a valid JSON object with the following structure:
{
  "narration": "A punchy description of the round's magical combat, written in present tense like a live announcer. Keep it SHORT: 2 brief paragraphs, about 70 to 100 words in total. Focus on the one or two decisive moments and how the spells interact. No scene-setting filler.",
  "result": "A short one sentence teaser for the round. This should be a single sentence that captures the essence of the round, ideally 10 words or less.",
  "illustrationPrompt": "A one or two sentence scene note naming the round's single decisive moment: who did what to whom, and what it physically looked like. No camera angles, art style or descriptions of the wizards' usual looks.",
  "roundVerdict": "One sentence, written BEFORE the numbers below, naming which wizard won this round and the main reason (creativity, fit with the duel, execution, luck). Call it even only in the rare case that both actions were genuinely matched.",
  "damageSummary": "One sentence, written BEFORE the numbers below, stating for each wizard whether they were actually hit this round and how badly, based strictly on your narration. If an attack was destroyed, blocked, dodged, absorbed or reflected, say that wizard took no damage.",
  "wizard1": {
    "pointsEarned": 0, // 0 to 10
    "healthChange": 0  // -100 to 100, negative means damage taken, positive means healing
  },
  "wizard2": {
    "pointsEarned": 0, // 0 to 10
    "healthChange": 0  // -100 to 100, negative means damage taken, positive means healing
  }
}

## Victory Conditions
- If a wizard's health reaches 0, immediately declare the other wizard the victor
- If all rounds complete without a defeat, the wizard with the most points wins
- In case of a tie, the wizard with the most health points remaining wins
- If both wizards have the same health points, declare a draw

Stay impartial: treat both wizards' ideas with respect, but clearly reward whoever played the round better. Being fair means making real calls, not splitting every round down the middle. Create a dramatic and engaging narrative experience.${contextualGuidance}`;
}

// Helper function to generate round actions text
function generateRoundActions(
  wizard1: Doc<"wizards">,
  wizard2: Doc<"wizards">,
  wizard1ID: Id<"wizards">,
  wizard2ID: Id<"wizards">,
  wizard1Action: string,
  wizard2Action: string,
  wizard1Luck: number,
  wizard2Luck: number,
  duel: Doc<"duels">,
  firstWizard: number,
): string {
  function generateWizardAction(
    wizardId: Id<"wizards">,
    action: string,
    luck: number,
  ): string {
    const wizard = wizardId === wizard1ID ? wizard1 : wizard2;
    return `Actions for ${wizard.name}:
- Health: ${duel.hitPoints[wizardId] ?? 100}
- Current Points: ${duel.points[wizardId] || 0}
- Luck: ${luck}
- Action: '${action}'`;
  }

  const actions = [
    generateWizardAction(
      firstWizard === 1 ? wizard1ID : wizard2ID,
      firstWizard === 1 ? wizard1Action : wizard2Action,
      firstWizard === 1 ? wizard1Luck : wizard2Luck,
    ),
    generateWizardAction(
      firstWizard === 1 ? wizard2ID : wizard1ID,
      firstWizard === 1 ? wizard2Action : wizard1Action,
      firstWizard === 1 ? wizard2Luck : wizard1Luck,
    ),
  ];

  return actions.join("\n\n");
}

// Helper function to generate mock battle result for emulator mode
function generateMockBattleResult(
  wizard1: Doc<"wizards">,
  wizard2: Doc<"wizards">,
  wizard1Action: string,
  wizard2Action: string,
): BattleRoundResponse {
  // Check if we're in test mode and return test-compatible responses
  if (process.env.NODE_ENV === "test") {
    console.log(
      `🧪 Test mode: wizard1Action="${wizard1Action}", wizard2Action="${wizard2Action}"`,
    );
    console.log(
      `🧪 Test mode: wizard1Action="${wizard1Action}", wizard2Action="${wizard2Action}"`,
    );

    // Return responses that match test expectations
    if (wizard1Action.toLowerCase().includes("lightning")) {
      console.log("🧪 Lightning condition matched!");
      return {
        narration: `The arena crackles with electricity as ${wizard1.name} unleashes a powerful lightning bolt! ${wizard2.name} responds with ${wizard2Action}. The magical energies clash in spectacular fashion.`,
        result: "Epic magical clash between lightning and defense!",
        illustrationPrompt: `Low poly art of ${wizard1.name} casting lightning bolt against ${wizard2.name} in magical arena`,
        wizard1: { pointsEarned: 8, healthChange: 0 },
        wizard2: { pointsEarned: 2, healthChange: -15 },
      };
    }

    if (
      wizard1Action.toLowerCase().includes("ice") &&
      wizard2Action.toLowerCase().includes("flame")
    ) {
      return {
        narration: "Ice meets fire in a spectacular display!",
        result: "Elemental clash of ice and fire!",
        illustrationPrompt: `Low poly art of ice and fire spells colliding`,
        wizard1: { pointsEarned: 6, healthChange: 0 },
        wizard2: { pointsEarned: 4, healthChange: -10 },
      };
    }

    if (wizard1Action === "No action" && wizard2Action === "No action") {
      return {
        narration: `Both wizards hesitate, uncertain of their next move. The crowd watches in anticipation as the magical energies swirl around them.`,
        result: "A moment of hesitation in the duel!",
        illustrationPrompt: `Low poly art of two wizards hesitating in arena`,
        wizard1: { pointsEarned: 1, healthChange: 0 },
        wizard2: { pointsEarned: 1, healthChange: 0 },
      };
    }

    // Check for specific test scenarios based on wizard names or actions
    if (wizard1.name === "Gandalf" && wizard2.name === "Saruman") {
      // Handle specific test cases
      if (
        wizard1Action.includes("extreme") ||
        wizard2Action.includes("extreme")
      ) {
        return {
          narration: "Extreme healing and devastating damage!",
          result: "Life and death magic!",
          illustrationPrompt: "Healing light vs death ray",
          wizard1: { pointsEarned: 8, healthChange: 50 },
          wizard2: { pointsEarned: 2, healthChange: -150 },
        };
      }

      if (wizard1Action.includes("death") || wizard2Action.includes("death")) {
        return {
          narration: "A deadly spell ends the duel!",
          result: "Death magic claims victory!",
          illustrationPrompt: "Death spell in arena",
          wizard1: { pointsEarned: 10, healthChange: 0 },
          wizard2: { pointsEarned: 0, healthChange: -100 },
        };
      }

      if (
        wizard1Action.includes("partial") ||
        wizard2Action.includes("partial")
      ) {
        return {
          narration: "Partial spell casting creates an uneven battle!",
          result: "Incomplete magic affects the outcome!",
          illustrationPrompt: "Partial spell effects",
          wizard1: { pointsEarned: 8, healthChange: 0 },
          wizard2: { pointsEarned: 0, healthChange: -15 },
        };
      }
    }

    // Default test response - deterministic based on action content
    const wizard1Points = (wizard1Action.length % 6) + 2; // 2-7 points based on action length
    const wizard2Points = (wizard2Action.length % 6) + 2; // 2-7 points based on action length
    const wizard1Health = (wizard1Action.length % 21) - 10; // -10 to +10 health based on action length
    const wizard2Health = (wizard2Action.length % 21) - 10; // -10 to +10 health based on action length

    return {
      narration: `The magical energies crackle through the arena as both wizards unleash their powers simultaneously!\n\n${wizard1.name} attempts: ${wizard1Action}\n\n${wizard2.name} responds with: ${wizard2Action}\n\nThe spells collide in a spectacular display of magical force, sending shockwaves through the enchanted arena. Both wizards demonstrate their magical prowess, but the outcome of this exchange will determine who gains the advantage in this mystical combat.\n\nThe crowd watches in awe as the magical energies settle, revealing the results of this intense magical confrontation.`,
      result: `${wizard1.name} and ${wizard2.name} clash with spectacular magical force!`,
      illustrationPrompt: `Low poly art style illustration of two wizards in magical combat in an arena, viewed from the spectator stands. ${wizard1.name}: ${wizard1.description} casting spells on the left. ${wizard2.name}: ${wizard2.description} casting spells on the right. Magical energies colliding in the center, dynamic lighting, magical particles, spell effects, dramatic arena atmosphere, wide shot from elevated perspective.`,
      wizard1: {
        pointsEarned: wizard1Points,
        healthChange: wizard1Health,
      },
      wizard2: {
        pointsEarned: wizard2Points,
        healthChange: wizard2Health,
      },
    };
  }

  // Regular emulator mode response
  const narration = `🎭 MOCK BATTLE: The magical energies crackle through the arena as both wizards unleash their powers simultaneously!

${wizard1.name} attempts: ${wizard1Action}

${wizard2.name} responds with: ${wizard2Action}

The spells collide in a spectacular display of magical force, sending shockwaves through the enchanted arena. Both wizards demonstrate their magical prowess in this simulated combat scenario.

The crowd watches in awe as the magical energies settle, revealing the results of this mock magical confrontation.`;

  const result = `Mock battle: ${wizard1.name} and ${wizard2.name} clash with simulated magical force!`;

  const illustrationPrompt = `Low poly art style illustration of two wizards in magical combat in an arena, viewed from the spectator stands. ${wizard1.name}: ${wizard1.description} casting spells on the left. ${wizard2.name}: ${wizard2.description} casting spells on the right. Magical energies colliding in the center, dynamic lighting, magical particles, spell effects, dramatic arena atmosphere, wide shot from elevated perspective.`;

  // Generate deterministic but balanced points and health changes for mock
  const wizard1Points = (wizard1Action.length % 6) + 2; // 2-7 points based on action length
  const wizard2Points = (wizard2Action.length % 6) + 2; // 2-7 points based on action length
  const wizard1Health = (wizard1Action.length % 21) - 10; // -10 to +10 health based on action length
  const wizard2Health = (wizard2Action.length % 21) - 10; // -10 to +10 health based on action length

  return {
    narration,
    result,
    illustrationPrompt,
    wizard1: {
      pointsEarned: wizard1Points,
      healthChange: wizard1Health,
    },
    wizard2: {
      pointsEarned: wizard2Points,
      healthChange: wizard2Health,
    },
  };
}

// Helper function to generate fallback battle result
function generateFallbackBattleResult(
  wizard1: Doc<"wizards">,
  wizard2: Doc<"wizards">,
  wizard1Action: string,
  wizard2Action: string,
): BattleRoundResponse {
  const narration = `The magical energies crackle through the arena as both wizards unleash their powers simultaneously!

${wizard1.name} attempts: ${wizard1Action}

${wizard2.name} responds with: ${wizard2Action}

The spells collide in a spectacular display of magical force, sending shockwaves through the enchanted arena. Both wizards demonstrate their magical prowess, but the outcome of this exchange will determine who gains the advantage in this mystical combat.

The crowd watches in awe as the magical energies settle, revealing the results of this intense magical confrontation.`;

  const result = `${wizard1.name} and ${wizard2.name} clash with spectacular magical force!`;

  const illustrationPrompt = `Low poly art style illustration of two wizards in magical combat in an arena, viewed from the spectator stands. ${wizard1.name}: ${wizard1.description} casting spells on the left. ${wizard2.name}: ${wizard2.description} casting spells on the right. Magical energies colliding in the center, dynamic lighting, magical particles, spell effects, dramatic arena atmosphere, wide shot from elevated perspective.`;

  // Generate random but balanced points and health changes for fallback
  const wizard1Points = Math.floor(Math.random() * 6) + 2; // 2-7 points
  const wizard2Points = Math.floor(Math.random() * 6) + 2; // 2-7 points
  const wizard1Health = Math.floor(Math.random() * 21) - 10; // -10 to +10 health
  const wizard2Health = Math.floor(Math.random() * 21) - 10; // -10 to +10 health

  return {
    narration,
    result,
    illustrationPrompt,
    wizard1: {
      pointsEarned: wizard1Points,
      healthChange: wizard1Health,
    },
    wizard2: {
      pointsEarned: wizard2Points,
      healthChange: wizard2Health,
    },
  };
}

// Helper function to generate complete duel history context for conclusions
function generateDuelHistoryContext(
  completedRounds: Array<Doc<"duelRounds">>,
  wizard1: Doc<"wizards">,
  wizard2: Doc<"wizards">,
): string {
  if (completedRounds.length === 0) {
    return "=== DUEL HISTORY ===\nNo rounds completed.";
  }

  let context = "=== COMPLETE DUEL HISTORY ===\n";
  context +=
    "Here is the complete story of this epic magical confrontation:\n\n";

  completedRounds.forEach((round) => {
    if (round.roundNumber === 0) {
      // Introduction round
      context += `**DUEL INTRODUCTION**:\n`;
      if (round.outcome?.narrative) {
        context += `${round.outcome.narrative}\n\n`;
      }
    } else {
      // Battle round
      context += `**ROUND ${round.roundNumber}**:\n`;

      // Include spell actions if available
      if (round.spells) {
        const wizard1Spell = round.spells[wizard1._id];
        const wizard2Spell = round.spells[wizard2._id];
        if (wizard1Spell || wizard2Spell) {
          context += `Actions taken:\n`;
          if (wizard1Spell) {
            context += `- ${wizard1.name}: "${wizard1Spell.description}"\n`;
          }
          if (wizard2Spell) {
            context += `- ${wizard2.name}: "${wizard2Spell.description}"\n`;
          }
          context += "\n";
        }
      }

      if (round.outcome?.narrative) {
        context += `${round.outcome.narrative}\n\n`;
      }

      if (round.outcome?.result) {
        context += `Round Result: ${round.outcome.result}\n`;
      }

      if (round.outcome?.pointsAwarded) {
        const wizard1Points = round.outcome.pointsAwarded[wizard1._id] || 0;
        const wizard2Points = round.outcome.pointsAwarded[wizard2._id] || 0;
        context += `Points Earned: ${wizard1.name} (+${wizard1Points}), ${wizard2.name} (+${wizard2Points})\n`;
      }

      if (round.outcome?.healthChange) {
        const wizard1Health = round.outcome.healthChange[wizard1._id] || 0;
        const wizard2Health = round.outcome.healthChange[wizard2._id] || 0;
        if (wizard1Health !== 0 || wizard2Health !== 0) {
          context += `Health Impact: ${wizard1.name} (${wizard1Health > 0 ? "+" : ""}${wizard1Health}), ${wizard2.name} (${wizard2Health > 0 ? "+" : ""}${wizard2Health})\n`;
        }
      }
      context += "\n";
    }
  });

  return context;
}

// Helper function to generate duel conclusion
async function generateDuelConclusion(
  ctx: ActionCtx,
  duelId: Id<"duels">,
  duel: Doc<"duels">,
  wizard1: Doc<"wizards">,
  wizard2: Doc<"wizards">,
  wizard1ID: Id<"wizards">,
  wizard2ID: Id<"wizards">,
  observabilityContext: AIObservabilityContext,
): Promise<void> {
  try {
    const wizard1FinalPoints = duel.points[wizard1ID] || 0;
    const wizard2FinalPoints = duel.points[wizard2ID] || 0;
    const wizard1FinalHealth = duel.hitPoints[wizard1ID] || 0;
    const wizard2FinalHealth = duel.hitPoints[wizard2ID] || 0;

    // Get all rounds for complete duel history
    const rounds = await ctx.runQuery(api.duels.getDuelRounds, { duelId });
    const completedRounds = rounds
      .filter((r: { status: string }) => r.status === "COMPLETED")
      .sort(
        (a: { roundNumber: number }, b: { roundNumber: number }) =>
          a.roundNumber - b.roundNumber,
      );

    const introductionRound = completedRounds.find(
      (round: { roundNumber: number }) => round.roundNumber === 0,
    );
    const arenaDescription =
      introductionRound?.outcome?.illustrationPrompt ||
      "a mysterious and grand magical arena";

    const result = getDuelResult(duel);
    const isDraw = result.kind === "draw";
    const winner =
      result.kind === "win" && result.winnerId === wizard1ID
        ? wizard1
        : wizard2;
    const loser = winner === wizard1 ? wizard2 : wizard1;

    // Generate complete duel history for context
    const duelHistory = generateDuelHistoryContext(
      completedRounds,
      wizard1,
      wizard2,
    );

    const narrationRules = isDraw
      ? `- Is 3 to 5 sentences and about 60 to 90 words in total
- Says right away that the duel ended in a draw. Do NOT name a winner or suggest either wizard won
- Calls out only the one to three moments that made it so evenly matched, like a highlight reel
- Gives both wizards equal credit
- Ends on a punchy, memorable closing line
- Never walks through the rounds in order`
      : `- Is 3 to 5 sentences and about 60 to 90 words in total
- Names the winner right away
- Calls out only the one to three moments that decided the match, like a highlight reel
- Gives the loser a brief, gracious nod
- Ends on a punchy, memorable closing line
- Never walks through the rounds in order`;

    const illustrationSpec = isDraw
      ? result.bothFell
        ? "A detailed prompt for a low poly art style illustration of a draw where both wizards fell together: both wizards collapsed or kneeling, spent, on opposite sides of the arena, equally matched, with neither shown as the victor. The scene should be set in the Enchanted Arena with remnants of the duel matching the arena description. Include visual references to key magical elements from the duel. Name each wizard, but do not describe their clothing, colors, hair or height: reference images supply their looks. Do not use the words panel, comic, frame or border, and do not ask for any text in the image."
        : "A detailed prompt for a low poly art style illustration of a draw: both wizards standing as equals, given equal size and prominence, facing each other with mutual respect (for example a bow, a salute, or a weary standoff), with neither celebrating and neither dejected. The crowd is on its feet for both in the distant stands. The scene should be set in the Enchanted Arena with remnants of the duel matching the arena description. Include visual references to key magical elements from the duel. Name each wizard, but do not describe their clothing, colors, hair or height: reference images supply their looks. Do not use the words panel, comic, frame or border, and do not ask for any text in the image."
      : "A detailed prompt for a low poly art style illustration showing the winning wizard celebrating and the losing wizard in the background looking dejected, with the crowd cheering from the distant stands of the colossal colosseum. The scene should be set in the Enchanted Arena with remnants of the duel matching the arena description. Include visual references to key magical elements from the duel. Name each wizard, but do not describe their clothing, colors, hair or height: reference images supply their looks. Do not use the words panel, comic, frame or border, and do not ask for any text in the image.";

    const systemPrompt = `You are the Arcane Arbiter concluding a wizard duel, speaking like a sports announcer giving the post-game call. You have the complete history of the duel for reference, but the audience just watched it, so do NOT recap it. Write a final narration that:

${narrationRules}

You must return ONLY a valid JSON object with these exact keys:
{
  "narration": "A short sports-announcer wrap-up: 3 to 5 sentences, about 60 to 90 words. ${isDraw ? "Call it a draw (no winner)" : "Name the winner"}, highlight only the one to three decisive moments, and end on a memorable line. Do NOT recap every round.",
  "result": "A brief but impactful summary of the duel conclusion that captures the essence of the ${isDraw ? "draw" : "victory"}.",
  "illustrationPrompt": "${illustrationSpec}"
}

Do not award any points or health points in this conclusion.

${CONTENT_STANDARDS}`;

    const outcomeLines = isDraw
      ? `The duel ended in a DRAW. ${
          result.bothFell
            ? "Both wizards fell in the same round."
            : "The wizards finished level on points and health."
        } There is no winner and no loser.

The arena is described as: ${arenaDescription}.

${wizard1.name} Description: ${wizard1.description}
${wizard2.name} Description: ${wizard2.description}

Write a short announcer-style wrap-up (60 to 90 words) that calls the duel a draw and highlights only the one to three moments that kept it so even. Do not name a winner, and do not recap the whole battle.`
      : `The winner is ${winner.name}. The loser is ${loser.name}.

The arena is described as: ${arenaDescription}.

Winning Wizard Description: ${winner.description}
Losing Wizard Description: ${loser.description}

Write a short announcer-style wrap-up (60 to 90 words) that names the winner and highlights only the one to three moments that decided the duel. Do not recap the whole battle.`;

    const prompt = `${duelHistory}

=== FINAL RESULTS ===
The duel is now complete. The final scores are:
- ${wizard1.name}: ${wizard1FinalPoints} points, ${wizard1FinalHealth} health
- ${wizard2.name}: ${wizard2FinalPoints} points, ${wizard2FinalHealth} health

${outcomeLines}`;

    let parsedResponse: DuelConclusionResponse;

    try {
      if (isEmulatorMode() || process.env.NODE_ENV === "test") {
        console.log(
          "🎭 Using mock AI conclusion generation (emulator/test mode)",
        );
        parsedResponse = isDraw
          ? drawConclusion(wizard1, wizard2, result.bothFell)
          : generateMockConclusion(duel, wizard1, wizard2, winner, loser);
      } else {
        parsedResponse = await generateObject(
          prompt,
          DuelConclusionSchema,
          systemPrompt,
          { temperature: 1.5, maxTokens: 5000 },
          { ...observabilityContext, spanName: "generate_duel_conclusion" },
        );
      }
    } catch (error) {
      console.error("Failed to generate conclusion AI response:", error);
      // Use fallback conclusion
      parsedResponse = generateFallbackConclusion(duel, wizard1, wizard2);
    }

    // Create the conclusion round with a unique round number
    // Use currentRound + 1 to ensure it doesn't conflict with existing rounds
    const conclusionRoundNumber = duel.currentRound + 1;
    await ctx.runMutation(api.duels.createConclusionRound, {
      duelId,
      roundNumber: conclusionRoundNumber,
      outcome: {
        narrative: parsedResponse.narration, // Schema uses 'narration', mutation expects 'narrative'
        result: parsedResponse.result,
        illustrationPrompt: parsedResponse.illustrationPrompt,
      },
    });

    // Schedule conclusion illustration generation
    if (
      process.env.NODE_ENV !== "test" &&
      (parsedResponse.illustrationPrompt || true)
    ) {
      await ctx.runMutation(api.duels.scheduleRoundIllustration, {
        illustrationPrompt:
          parsedResponse.illustrationPrompt ||
          `Low poly art showing the conclusion of a wizard duel in an arena.`,
        duelId,
        roundNumber: conclusionRoundNumber.toString(),
      });
    }
  } catch (error) {
    console.error("Failed to generate duel conclusion:", error);
    // Continue without conclusion - the duel is still marked as completed
  }
}

// Helper function to generate mock conclusion for emulator mode
function generateMockConclusion(
  duel: Doc<"duels">,
  wizard1: Doc<"wizards">,
  wizard2: Doc<"wizards">,
  winner: Doc<"wizards">,
  loser: Doc<"wizards">,
): DuelConclusionResponse {
  const winnerName = winner?.name || "Unknown";
  const loserName = loser?.name || "Unknown";
  const winnerDescription = winner?.description || "A victorious wizard";
  const loserDescription = loser?.description || "A defeated wizard";

  // Check if we're in test mode and return test-compatible responses
  if (process.env.NODE_ENV === "test") {
    return {
      narration: `The epic duel concludes with ${winnerName} victorious! After a series of intense magical exchanges, ${winnerName} has proven their superiority in the arcane arts. ${loserName} fought bravely but ultimately fell to their opponent's superior strategy and magical prowess.`,
      result: `${winnerName} emerges victorious in an epic duel!`,
      illustrationPrompt: `Low poly art style illustration of ${winnerName} (${winnerDescription}) celebrating victory in a magical arena, arms raised in triumph. In the background, ${loserName} (${loserDescription}) looks dejected, head bowed in defeat. The Enchanted Arena is filled with magical remnants, spell residue, and mystical particles floating in the air. Dynamic lighting, wide shot from spectator perspective, capturing the grandeur of the moment.`,
    };
  }

  return {
    narration: `🎭 MOCK CONCLUSION: The final spell echoes through the Enchanted Arena as the dust settles on this epic simulated magical confrontation. ${winnerName} emerges victorious in this test environment, their mastery of the arcane arts proven beyond doubt. ${loserName} fought valiantly in this mock battle, displaying remarkable magical prowess throughout the simulated duel. Both wizards have earned the respect of all who witnessed this spectacular display of magical combat testing. The arena falls silent as the magical barriers dissipate, marking the end of this legendary mock duel.`,
    result: `🎭 Mock victory: ${winnerName} claims victory in an epic simulated magical duel!`,
    illustrationPrompt: `Low poly art style illustration of ${winnerName} (${winnerDescription}) celebrating victory in a magical arena, arms raised in triumph. In the background, ${loserName} (${loserDescription}) looks dejected, head bowed in defeat. The Enchanted Arena is filled with magical remnants, spell residue, and mystical particles floating in the air. Dynamic lighting, wide shot from spectator perspective, capturing the grandeur of the moment.`,
  };
}

// Helper function to generate fallback conclusion
function generateFallbackConclusion(
  duel: Doc<"duels">,
  wizard1: Doc<"wizards">,
  wizard2: Doc<"wizards">,
): DuelConclusionResponse {
  const result: DuelResult = getDuelResult(duel);
  if (result.kind === "draw") {
    return drawConclusion(wizard1, wizard2, result.bothFell);
  }
  const winner = result.winnerId === wizard1._id ? wizard1 : wizard2;
  const loser = winner === wizard1 ? wizard2 : wizard1;

  const winnerName = winner?.name || "Unknown";
  const loserName = loser?.name || "Unknown";
  const winnerDescription = winner?.description || "A victorious wizard";
  const loserDescription = loser?.description || "A defeated wizard";

  return {
    narration: `The final spell echoes through the Enchanted Arena as the dust settles on this epic magical confrontation. ${winnerName} emerges victorious, their mastery of the arcane arts proven beyond doubt. ${loserName} fought valiantly, displaying remarkable magical prowess throughout the duel. Both wizards have earned the respect of all who witnessed this spectacular display of magical combat. The arena falls silent as the magical barriers dissipate, marking the end of this legendary duel.`,
    result: `${winnerName} claims victory in an epic magical duel!`,
    illustrationPrompt: `Low poly art style illustration of ${winnerName} (${winnerDescription}) celebrating victory in a magical arena, arms raised in triumph. In the background, ${loserName} (${loserDescription}) looks dejected, head bowed in defeat. The Enchanted Arena is filled with magical remnants, spell residue, and mystical particles floating in the air. Dynamic lighting, wide shot from spectator perspective, capturing the grandeur of the moment.`,
  };
}

// Canned conclusion for a draw, used in tests and when the AI call fails.
function drawConclusion(
  wizard1: Doc<"wizards">,
  wizard2: Doc<"wizards">,
  bothFell: boolean,
): DuelConclusionResponse {
  const name1 = wizard1?.name || "Unknown";
  const name2 = wizard2?.name || "Unknown";
  const description1 = wizard1?.description || "A wizard";
  const description2 = wizard2?.description || "A wizard";
  const pose = bothFell
    ? "both collapsed and spent on opposite sides of the arena, neither one the victor"
    : "standing as equals facing each other, given equal size and prominence, exchanging a respectful bow, neither celebrating and neither dejected";

  return {
    narration: bothFell
      ? `What a finish! ${name1} and ${name2} land their final blows at the same instant, and both wizards fall together. Neither could be separated from the other all duel long. The Enchanted Arena calls it a draw, and the crowd salutes them both!`
      : `The dust settles and the scoreboard refuses to pick a side! ${name1} and ${name2} answered every spell with one of their own and finish dead level. This one goes down as a draw, and both wizards leave the Enchanted Arena with their heads held high!`,
    result: `${name1} and ${name2} fight to a draw!`,
    illustrationPrompt: `Low poly art style illustration of a drawn wizard duel. ${name1} (${description1}) and ${name2} (${description2}), ${pose}. The crowd in the tiered stands of the Enchanted Arena is on its feet for both of them. The arena is filled with magical remnants, spell residue, and mystical particles floating in the air. Dynamic lighting, wide shot from spectator perspective.`,
  };
}
