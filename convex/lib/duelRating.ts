export const RATING_DIMENSIONS = [
  "cool",
  "funny",
  "engaging",
  "unpredictable",
] as const;

export type RatingScores = Record<(typeof RATING_DIMENSIONS)[number], number>;

export interface DuelRatingContext {
  numberOfRounds: number | "TO_THE_DEATH";
  wizards: Array<{ name: string; description: string }>;
  winners: string[];
  losers: string[];
  rounds: Array<{
    roundNumber: number;
    spells: Array<{ wizard: string; spell: string }>;
    narrative: string;
    result?: string;
  }>;
}

const MAX_ROUNDS_IN_PROMPT = 12;
const MAX_NARRATIVE_CHARS = 700;

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export const RATING_SYSTEM_PROMPT = `You are a discerning editor choosing which wizard duels deserve a spot on the homepage of a game where players write free-form spells and an AI narrates the clash. Judge only what is in the transcript. Score each dimension from 1 to 10 as an integer.

Calibration: 5 is a perfectly ordinary duel. 7 is clearly good. 9 or 10 is rare and means "show this to a stranger". Use the full range and do not inflate.

- cool: spectacle and imagery. Memorable, vivid spells and moments.
- funny: humor. Absurd spells, comic reversals, good jokes in the narration.
- engaging: story and momentum. Stakes, a sense of progression, a satisfying finish.
- unpredictable: surprise. Spells interacting in unexpected ways, swings, twists.

Also give a summary: one sentence naming the single best moment, or the main weakness.`;

export function buildRatingPrompt(context: DuelRatingContext): string {
  const lines: string[] = [];
  const rounds = context.rounds.slice(0, MAX_ROUNDS_IN_PROMPT);

  lines.push("WIZARDS");
  for (const wizard of context.wizards) {
    lines.push(`- ${wizard.name}: ${clip(wizard.description, 200)}`);
  }
  lines.push("");
  lines.push(
    `FORMAT: ${context.numberOfRounds === "TO_THE_DEATH" ? "To the Death" : `${context.numberOfRounds} rounds`}`,
  );
  lines.push("");

  for (const round of rounds) {
    lines.push(`ROUND ${round.roundNumber}`);
    for (const { wizard, spell } of round.spells) {
      lines.push(`${wizard} cast: ${clip(spell, 300)}`);
    }
    lines.push(`Narration: ${clip(round.narrative, MAX_NARRATIVE_CHARS)}`);
    if (round.result) lines.push(`Result: ${round.result}`);
    lines.push("");
  }
  if (context.rounds.length > rounds.length) {
    lines.push(
      `(${context.rounds.length - rounds.length} further rounds omitted)`,
    );
  }

  lines.push(
    `OUTCOME: winner(s) ${context.winners.join(", ") || "none"}; defeated ${context.losers.join(", ") || "none"}.`,
  );
  return lines.join("\n");
}

function toScore(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 1;
  return Math.min(10, Math.max(1, Math.round(n)));
}

/** Clamp model output to integer 1-10 scores and compute the overall mean. */
export function normalizeRating(raw: Partial<Record<string, unknown>>): {
  scores: RatingScores;
  overall: number;
} {
  const scores = {
    cool: toScore(raw.cool),
    funny: toScore(raw.funny),
    engaging: toScore(raw.engaging),
    unpredictable: toScore(raw.unpredictable),
  };
  const mean =
    RATING_DIMENSIONS.reduce((sum, key) => sum + scores[key], 0) /
    RATING_DIMENSIONS.length;
  return { scores, overall: Math.round(mean * 10) / 10 };
}
