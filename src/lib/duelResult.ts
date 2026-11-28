/**
 * Explains, in one or two friendly sentences, why a finished duel ended the
 * way it did. Mirrors checkDuelEndConditions in convex/duels.ts.
 *
 * Health scoring: a knockout wins outright, otherwise more health wins, and
 * rounds won (stored in `points`) breaks a health tie. Older duels (no
 * `scoring`) were decided on the judge's points, with health as the tiebreak.
 */
export function explainDuelResult(args: {
  wizardIds: string[];
  winners: string[];
  hitPoints: Record<string, number>;
  points: Record<string, number>;
  nameOf: (id: string) => string;
  forfeited?: boolean;
  scoring?: "health";
}): string | null {
  const { wizardIds, winners, hitPoints, points, nameOf, forfeited } = args;
  if (forfeited || wizardIds.length < 2) return null;
  const hp = (id: string) => Math.max(0, hitPoints[id] ?? 0);
  const pts = (id: string) => points[id] ?? 0;
  const healthScoring = args.scoring === "health";
  const rounds = (n: number) => `${n} ${n === 1 ? "round" : "rounds"}`;

  if (winners.length !== 1) {
    if (wizardIds.every((id) => hp(id) <= 0)) {
      return "Double knockout! Both wizards ran out of health in the same round, so nobody wins.";
    }
    const [a] = wizardIds;
    return healthScoring
      ? `Perfectly matched! Both wizards finished with ${hp(a)} health and ${rounds(pts(a))} won, so it's a draw.`
      : `Perfectly matched! Both wizards finished with ${pts(a)} points and ${hp(a)} health, so it's a draw.`;
  }

  const winner = winners[0];
  const loser = wizardIds.find((id) => id !== winner);
  if (!loser) return null;
  const w = nameOf(winner);
  const l = nameOf(loser);

  if (hp(loser) <= 0) {
    return `Knockout! ${l} ran out of health, and a knockout wins the duel on the spot.`;
  }

  if (healthScoring) {
    if (hp(winner) === hp(loser)) {
      return `Health was tied at ${hp(winner)}, so rounds won broke the tie: ${w} took ${rounds(pts(winner))} to ${l}'s ${pts(loser)}.`;
    }
    return `Both wizards were still standing after the last round, so health decided it: ${w} finished with ${hp(winner)} to ${l}'s ${hp(loser)}.`;
  }

  // An older duel, decided on points.
  if (pts(winner) === pts(loser)) {
    return `Points were tied at ${pts(winner)}, so health broke the tie: ${w} had ${hp(winner)} left to ${l}'s ${hp(loser)}.`;
  }
  const score = `${pts(winner)} points to ${pts(loser)}`;
  if (hp(winner) < hp(loser)) {
    return `${l} had more health left, but ${w} impressed the judge more: ${score}. This duel was played before health decided every duel, so points won it.`;
  }
  return `Both wizards were still standing after the last round, so points decided it: ${w} won ${score}.`;
}
