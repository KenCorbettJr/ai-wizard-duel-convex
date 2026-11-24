// Builds the prompt that writes a campaign opponent's spell for the round.
// The opponent sees the whole duel so far (both wizards' spells and what
// happened), so it can react to the player and avoid repeating itself.

export type OpponentPromptWizard = {
  id: string;
  name: string;
  description: string;
  spellStyle?: string;
  personalityTraits?: string[];
  difficulty?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
};

export type OpponentPromptRound = {
  roundNumber: number;
  spells?: Record<string, { description: string }>;
  outcome?: {
    result?: string;
    pointsAwarded?: Record<string, number>;
    healthChange?: Record<string, number>;
  };
};

const DIFFICULTY_GUIDANCE: Record<string, string> = {
  BEGINNER:
    "You are a beginner: your spells are simpler and a little rough around the edges, but still specific and full of personality.",
  INTERMEDIATE:
    "You are an intermediate duelist: your spells are solid and you think one step ahead, combining an attack with a bit of protection or setup.",
  ADVANCED:
    "You are an advanced duelist: your spells are clever, layered and tactical, and you exploit what your opponent has been doing.",
};

// Different tactics to rotate through so the opponent doesn't cast the same
// kind of spell every round.
export const TACTIC_IDEAS = [
  "a direct, aimed attack",
  "a trap or delayed spell",
  "reshaping or using the arena itself",
  "a feint or misdirection that sets up a strike",
  "a summoned ally or conjured creature",
  "transforming yourself or your surroundings",
  "a counter built specifically against your opponent's favorite tactic",
  "a defense that turns into a counterattack",
  "a bold, risky gambit that fits your personality",
];

function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

export function buildOpponentSpellPrompt(params: {
  wizard: OpponentPromptWizard;
  opponent: OpponentPromptWizard | null;
  roundNumber: number;
  totalRounds: number | "TO_THE_DEATH";
  hitPoints: Record<string, number>;
  points: Record<string, number>;
  previousRounds: OpponentPromptRound[];
}): string {
  const { wizard, opponent, roundNumber, totalRounds, hitPoints, points } =
    params;
  const previousRounds = params.previousRounds
    .filter((r) => r.roundNumber > 0)
    .sort((a, b) => a.roundNumber - b.roundNumber);

  const lines: string[] = [];
  lines.push(`You are ${wizard.name}. ${wizard.description}`);
  if (wizard.spellStyle) lines.push(`Your spell style: ${wizard.spellStyle}`);
  lines.push(
    `Your personality: ${wizard.personalityTraits?.length ? wizard.personalityTraits.join(", ") : "mysterious"}`,
  );
  if (wizard.difficulty) lines.push(DIFFICULTY_GUIDANCE[wizard.difficulty]);
  if (opponent) {
    lines.push(`Your opponent: ${opponent.name}. ${opponent.description}`);
  }

  const roundLabel =
    totalRounds === "TO_THE_DEATH"
      ? `Round ${roundNumber} (a duel to the death)`
      : `Round ${roundNumber} of ${totalRounds}${roundNumber === totalRounds ? " (the final round)" : ""}`;
  lines.push("", `=== Current situation: ${roundLabel} ===`);
  lines.push(
    `You: ${hitPoints[wizard.id] ?? 100}/100 health, ${points[wizard.id] ?? 0} points`,
  );
  if (opponent) {
    lines.push(
      `${opponent.name}: ${hitPoints[opponent.id] ?? 100}/100 health, ${points[opponent.id] ?? 0} points`,
    );
  }

  if (previousRounds.length > 0) {
    lines.push("", "=== The duel so far ===");
    for (const round of previousRounds) {
      lines.push(`Round ${round.roundNumber}:`);
      const mine = round.spells?.[wizard.id]?.description;
      if (mine) lines.push(`- Your spell: ${mine}`);
      if (opponent) {
        const theirs = round.spells?.[opponent.id]?.description;
        if (theirs) lines.push(`- ${opponent.name}'s spell: ${theirs}`);
      }
      if (round.outcome?.result) {
        lines.push(`- What happened: ${round.outcome.result}`);
      }
      const pts = round.outcome?.pointsAwarded;
      const hp = round.outcome?.healthChange;
      if (pts && opponent) {
        lines.push(
          `- Points: you +${pts[wizard.id] ?? 0}, ${opponent.name} +${pts[opponent.id] ?? 0}`,
        );
      }
      if (hp && opponent && (hp[wizard.id] || hp[opponent.id])) {
        lines.push(
          `- Health: you ${signed(hp[wizard.id] ?? 0)}, ${opponent.name} ${signed(hp[opponent.id] ?? 0)}`,
        );
      }
    }
  }

  lines.push(
    "",
    "=== Write your spell for this round ===",
    "- Stay true to your personality and spell style. Your style is your home ground, not a cage: vary the form, the target and the tactic within it, and now and then reach a little outside it in a way your personality would.",
    `- Pick a different tactic from your earlier spells. Ideas: ${TACTIC_IDEAS.join("; ")}.`,
    "- Do NOT repeat the element, shape, gesture or wording of your earlier spells. Start the sentence differently than you did before.",
    "- React to your opponent: answer what they have been doing, exploit a weakness, or counter their favorite trick.",
    "- Play to win. Most rounds should include an attack or a concrete way to gain the upper hand, not just a defense or a display.",
    "- Be specific and vivid: what you do, how, and where. One or two sentences, under 45 words.",
    "- Describe only your own action. Do not say how it affects your opponent or how the round turns out.",
  );

  return lines.join("\n");
}
