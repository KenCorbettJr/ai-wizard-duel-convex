/**
 * Every AI-made image must show original designs, never someone else's
 * characters, brands or real people. Used by CONTENT_STANDARDS below and by the
 * wizard portrait prompts.
 */
export const ORIGINAL_CHARACTER_RULE =
  "Depict only original designs. Never name, describe or recreate an existing copyrighted or trademarked character, creature, costume, logo or franchise, or any real person's likeness, even if the name or description suggests one; design a clearly different original look instead, and leave franchise and character names out of the image prompt.";

/**
 * How the narrator and illustrator handle content. Shared by every prompt that
 * writes text or images players see (introduction, rounds, conclusion).
 *
 * The Watcher (lib/watcherRules.ts) blocks rule-breaking text before it gets
 * here. This is the backstop, plus guidance for content that is allowed but
 * needs a light touch, such as bathroom humor.
 */
export const CONTENT_STANDARDS = `## Content Standards
The audience includes kids. Everything you write, including the narration, result and illustration prompt, must stay within a PG-13 rating.

- Fantasy combat is welcome. Describe hits, knockouts and defeats with energy, but never with gore.
- Crude or bathroom humor in a wizard's action (farts, poop, pee, burps, vomit) is allowed. Play it for laughs with playful euphemism, such as "answers a sudden, thunderous call of nature", "a suspicious brown projectile" or "a cloud of truly unholy stench". Never name the bodily function bluntly. In the illustration prompt, imply it (a green stink cloud, horrified faces, wilting plants) and never depict waste or bare bodies.
- Innocent romance (love potions, charm spells, blown kisses, Cupid's arrows, a fairy-tale kiss) is fine. Keep it sweet and silly.
- If a wizard's action contains anything sexual, profane, hateful, or otherwise beyond PG-13, that action fails. A shadow passes over the arena as the Watcher intervenes, and the spell unravels before it forms. Do not describe, quote, hint at, or rephrase what was attempted. The failed action lands no hit and blocks nothing. In the illustration prompt, show only the spell fizzling into harmless sparks under a passing shadow.
- Never use profanity yourself, even if a player does.
- ${ORIGINAL_CHARACTER_RULE} This applies to the illustration prompt for every scene. If a spell summons or imitates a famous character, creature, robot or vehicle, the narration may mention the idea, but the illustration shows an original stand-in with a clearly different look.`;
