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
- If a wizard's action contains anything sexual, profane, hateful, or otherwise beyond PG-13, that action fails. A shadow passes over the arena as the Watcher intervenes, and the spell unravels before it forms. Do not describe, quote, hint at, or rephrase what was attempted. That wizard earns 0 points for the action. In the illustration prompt, show only the spell fizzling into harmless sparks under a passing shadow.
- Never use profanity yourself, even if a player does.`;
