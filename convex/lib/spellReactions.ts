/**
 * Emoji reactions to a wizard's spell. Shared by the server and the duel page.
 */

/** The emoji a viewer can react to a spell with. */
export const SPELL_REACTIONS = ["🔥", "⚡", "😂", "😮", "👏", "💀"] as const;
export type SpellReaction = (typeof SPELL_REACTIONS)[number];

export function isSpellReaction(emoji: string): emoji is SpellReaction {
  return (SPELL_REACTIONS as readonly string[]).includes(emoji);
}
