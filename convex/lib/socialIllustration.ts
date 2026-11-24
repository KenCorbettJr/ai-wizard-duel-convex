import type { Doc } from "../_generated/dataModel";

// Middle rounds first: they show the fight without showing how it ends, and
// they differ from duel to duel more than the introduction's arena shot.
const PREFERRED_ROUNDS = [2, 3, 1, 0];

/**
 * The round illustration that stands for a duel: its card thumbnail and its
 * link-preview image.
 *
 * Prefers round 2 or 3 as foreshadowing, then round 1, then the
 * introduction. A finished duel never uses its last battle round, which
 * shows the final blow, and no duel uses its conclusion.
 */
export function pickTeaserIllustration(
  status: Doc<"duels">["status"],
  rounds: Pick<Doc<"duelRounds">, "roundNumber" | "type" | "outcome">[],
): string | undefined {
  const battleRounds = rounds.filter((r) => r.type !== "CONCLUSION");
  const finalRound =
    status === "COMPLETED" && battleRounds.length > 0
      ? Math.max(...battleRounds.map((r) => r.roundNumber))
      : undefined;
  for (const n of PREFERRED_ROUNDS) {
    if (n === finalRound) continue;
    const round = battleRounds.find(
      (r) => r.roundNumber === n && !!r.outcome?.illustration,
    );
    if (round) return round.outcome?.illustration;
  }
  return undefined;
}
