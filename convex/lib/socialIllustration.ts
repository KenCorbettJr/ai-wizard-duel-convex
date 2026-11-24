import type { Doc } from "../_generated/dataModel";

// Middle rounds first: they show the fight without showing how it ends.
const PREFERRED_ROUNDS = [2, 3, 1, 0];

/**
 * The round illustration to use as a duel's link-preview image.
 *
 * A live duel uses its latest illustration. A finished duel must not give
 * away the ending, so it never uses the last battle round or the conclusion.
 * It prefers round 2 or 3 as foreshadowing, then round 1, then the
 * introduction.
 */
export function pickSocialIllustration(
  status: Doc<"duels">["status"],
  rounds: Pick<Doc<"duelRounds">, "roundNumber" | "type" | "outcome">[],
): string | undefined {
  const illustrated = rounds.filter(
    (r) => r.type !== "CONCLUSION" && !!r.outcome?.illustration,
  );
  if (illustrated.length === 0) return undefined;

  if (status !== "COMPLETED") {
    const latest = illustrated.reduce((a, b) =>
      b.roundNumber > a.roundNumber ? b : a,
    );
    return latest.outcome?.illustration;
  }

  const finalRound = Math.max(
    ...rounds.filter((r) => r.type !== "CONCLUSION").map((r) => r.roundNumber),
  );
  for (const n of PREFERRED_ROUNDS) {
    if (n === finalRound) continue;
    const round = illustrated.find((r) => r.roundNumber === n);
    if (round) return round.outcome?.illustration;
  }
  return undefined;
}
