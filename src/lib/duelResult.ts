/**
 * Explains, in one or two friendly sentences, why a finished duel ended the
 * way it did. Mirrors checkDuelEndConditions in convex/duels.ts: a knockout
 * wins outright, otherwise the most points wins, and health only breaks a
 * points tie.
 */
export function explainDuelResult(args: {
  wizardIds: string[];
  winners: string[];
  hitPoints: Record<string, number>;
  points: Record<string, number>;
  nameOf: (id: string) => string;
  forfeited?: boolean;
}): string | null {
  const { wizardIds, winners, hitPoints, points, nameOf, forfeited } = args;
  if (forfeited || wizardIds.length < 2) return null;
  const hp = (id: string) => Math.max(0, hitPoints[id] ?? 0);
  const pts = (id: string) => points[id] ?? 0;

  if (winners.length !== 1) {
    if (wizardIds.every((id) => hp(id) <= 0)) {
      return "Double knockout! Both wizards ran out of health in the same round, so nobody wins.";
    }
    const [a] = wizardIds;
    return `Perfectly matched! Both wizards finished with ${pts(a)} points and ${hp(a)} health, so it's a draw.`;
  }

  const winner = winners[0];
  const loser = wizardIds.find((id) => id !== winner);
  if (!loser) return null;
  const w = nameOf(winner);
  const l = nameOf(loser);

  if (hp(loser) <= 0) {
    return `Knockout! ${l} ran out of health, and a knockout wins the duel on the spot, no matter the points.`;
  }
  if (pts(winner) === pts(loser)) {
    return `Points were tied at ${pts(winner)}, so health broke the tie: ${w} had ${hp(winner)} left to ${l}'s ${hp(loser)}.`;
  }
  const score = `${pts(winner)} points to ${pts(loser)}`;
  if (hp(winner) < hp(loser)) {
    return `${l} had more health left, but ${w} impressed the judge more: ${score}. When both wizards are still standing after the last round, points win. Health only decides knockouts and ties.`;
  }
  return `Both wizards were still standing after the last round, so points decided it: ${w} won ${score}.`;
}
