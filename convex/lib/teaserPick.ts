/**
 * Pure helpers for duel teasers: which duel to feature, and which rounds a
 * teaser may show without giving away the ending.
 */

/** The call to action every teaser ends on, spoken and on screen. */
export const TEASER_CALL_TO_ACTION =
  "Go to AI Wizard Duel to see how it ended!";

/** Most story scenes in one teaser, not counting the hook and outro. */
export const MAX_TEASER_SCENES = 3;

export interface TeaserRound {
  roundNumber: number;
  type: "SPELL_CASTING" | "COUNTER_SPELL" | "FINAL_ROUND" | "CONCLUSION";
  status: "WAITING_FOR_SPELLS" | "PROCESSING" | "COMPLETED";
  narrative?: string;
  illustration?: string;
}

/**
 * Rounds a teaser may use, in order. The introduction (round 0) is fine. The
 * conclusion and the last played round are not, because they decide the duel.
 * Earlier rounds can still hint at who is ahead, which is the point of a
 * teaser, but they never say who won.
 */
export function spoilerSafeRounds<T extends TeaserRound>(rounds: T[]): T[] {
  const completed = rounds
    .filter((r) => r.status === "COMPLETED" && r.narrative?.trim())
    .sort((a, b) => a.roundNumber - b.roundNumber);
  const played = completed.filter(
    (r) => r.roundNumber > 0 && r.type !== "CONCLUSION",
  );
  const deciding = played[played.length - 1]?.roundNumber;
  return completed.filter(
    (r) =>
      r.type !== "CONCLUSION" &&
      r.type !== "FINAL_ROUND" &&
      r.roundNumber !== deciding,
  );
}

/**
 * Picks up to `max` rounds for the teaser's scenes. Every scene needs a
 * picture. Prefers played rounds over the introduction, keeping story order.
 */
export function chooseSceneRounds<T extends TeaserRound>(
  safeRounds: T[],
  max = MAX_TEASER_SCENES,
): T[] {
  const illustrated = safeRounds.filter((r) => r.illustration);
  const played = illustrated.filter((r) => r.roundNumber > 0);
  const intro = illustrated.filter((r) => r.roundNumber === 0);
  // Keep the latest played rounds (closest to the climax), then fill with the intro.
  const chosen = played.slice(-max);
  if (chosen.length < max)
    chosen.unshift(...intro.slice(0, max - chosen.length));
  return chosen.sort((a, b) => a.roundNumber - b.roundNumber);
}

export interface TeaserCandidate {
  uniqueViewers: number;
  peakOnlookers: number;
  signedInViewers: number;
  aiRating?: number; // 1-10
}

/**
 * Ranks duels for the daily teaser. Watching matters most, with diminishing
 * returns so one viral duel doesn't need a huge lead. The AI rating (how
 * cool, funny and surprising it was) adds up to 10 points and decides between
 * duels when traffic is low. Unrated duels count as a middling 5.
 */
export function teaserScore(c: TeaserCandidate): number {
  const audience =
    4 * Math.log2(1 + c.uniqueViewers) +
    2 * Math.log2(1 + c.signedInViewers) +
    3 * Math.log2(1 + c.peakOnlookers);
  const quality = c.aiRating ?? 5;
  return Math.round((audience + quality) * 10) / 10;
}
