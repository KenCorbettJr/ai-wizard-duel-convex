// Pure helpers for judging duel rounds and writing the conclusion. They turn
// raw numbers (luck rolls, past outcomes, final winners) into plain-language
// guidance for the AI judge, so it doesn't have to interpret them itself.

type WizardRef = { id: string; name: string };

// How a luck gap between the two wizards should weigh on the round. Luck is a
// real factor but not the whole story: a clearly more creative action that
// fits the duel better can still win with the worse roll.
export function describeLuckEdge(
  a: WizardRef & { luck: number },
  b: WizardRef & { luck: number },
): string {
  const gap = Math.abs(a.luck - b.luck);
  const [lucky, unlucky] = a.luck >= b.luck ? [a, b] : [b, a];
  const rolls = `(${a.name} ${a.luck}, ${b.name} ${b.luck})`;

  const lines: string[] = [];
  if (gap <= 2) {
    lines.push(
      `Fortune is roughly even this round ${rolls}. Luck should not decide this round: judge it on the actions themselves.`,
    );
  } else if (gap <= 6) {
    lines.push(
      `${lucky.name} has a modest edge in fortune ${rolls}. If the actions are close, the close calls should break toward ${lucky.name} (about 1 extra point, or a contested attack partly getting through).`,
    );
  } else if (gap <= 11) {
    lines.push(
      `${lucky.name} has a clear edge in fortune ${rolls}. Contested exchanges should break toward ${lucky.name}: their spell executes cleanly and something lands or holds for them. This is worth about 2 points of swing. ${unlucky.name} can still win the round, but only with a clearly more creative action that fits the duel better.`,
    );
  } else {
    lines.push(
      `${lucky.name} has a strong edge in fortune ${rolls}. Their key spell should go especially well, and ${unlucky.name}'s should fall short somehow (a misfire, bad timing, a weaker effect than intended). This is worth about 2 to 3 points of swing. Only a much stronger, more creative action that fits the duel far better should let ${unlucky.name} win the round.`,
    );
  }

  for (const w of [a, b]) {
    if (w.luck <= 5) {
      lines.push(
        `${w.name}'s roll is very unfavorable: show a flaw in how their spell plays out.`,
      );
    } else if (w.luck >= 19) {
      lines.push(
        `${w.name}'s roll is very favorable: give them a lucky break this round.`,
      );
    }
  }
  return lines.join("\n");
}

export type RoundOutcomeLike = {
  roundNumber: number;
  outcome?: {
    pointsAwarded?: Record<string, number>;
    healthChange?: Record<string, number>;
  };
};

// A full stalemate: both wizards earned the same points and neither lost or
// gained health.
export function isFullStalemate(
  round: RoundOutcomeLike,
  wizardIds: [string, string],
): boolean {
  const points = round.outcome?.pointsAwarded;
  if (!points) return false;
  const [a, b] = wizardIds;
  const health = round.outcome?.healthChange ?? {};
  return (
    (points[a] ?? 0) === (points[b] ?? 0) &&
    (health[a] ?? 0) === 0 &&
    (health[b] ?? 0) === 0
  );
}

// How many of the most recent battle rounds in a row were full stalemates.
export function trailingStalemateCount(
  previousRounds: RoundOutcomeLike[],
  wizardIds: [string, string],
): number {
  const battleRounds = previousRounds
    .filter((r) => r.roundNumber > 0 && r.outcome?.pointsAwarded)
    .sort((x, y) => x.roundNumber - y.roundNumber);
  let count = 0;
  for (let i = battleRounds.length - 1; i >= 0; i--) {
    if (!isFullStalemate(battleRounds[i], wizardIds)) break;
    count++;
  }
  return count;
}

// A warning for the judge when earlier rounds were stalemates, so it doesn't
// copy that pattern from the duel history it's given.
export function stalemateWarning(count: number): string {
  if (count <= 0) return "";
  const which =
    count === 1
      ? "The previous round ended"
      : `The last ${count} rounds all ended`;
  return `NOTE: ${which} in a full stalemate (equal points, no damage). Do not repeat that pattern. Decide who gets the better of this round.`;
}

export type DuelResult =
  | { kind: "win"; winnerId: string; loserId: string }
  | { kind: "draw"; bothFell: boolean };

// Reads the final result from the duel. A duel with anything other than one
// winner is a draw: tied on points and health, or both wizards knocked out in
// the same round.
export function getDuelResult(duel: {
  wizards: string[];
  winners?: string[];
  hitPoints: Record<string, number>;
}): DuelResult {
  const winners = duel.winners ?? [];
  if (winners.length === 1) {
    const winnerId = winners[0];
    const loserId = duel.wizards.find((id) => id !== winnerId) ?? winnerId;
    return { kind: "win", winnerId, loserId };
  }
  const bothFell = duel.wizards.every(
    (id) => (duel.hitPoints[id] ?? 100) <= 0,
  );
  return { kind: "draw", bothFell };
}
