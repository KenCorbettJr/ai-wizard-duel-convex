/**
 * Art direction for duel round illustrations.
 *
 * The judge decides what happened in a round. A separate "art director" call
 * (convex/sceneDirector.ts) then turns that into an image prompt using the
 * rules here. Everything in this file is plain text and pure functions so it
 * can be unit tested.
 */

// The Enchanted Arena is a colossal colosseum. The crowd anchors the duel as
// a spectacle, but its stands are a distant ring on the horizon so they never
// crowd the frame, and no spell comes near the spectators. The floor between
// is the battlefield, which the spells reshape round by round.
export const COLOSSEUM_RULE =
  "The Enchanted Arena is a colossal colosseum, far larger than any real stadium: its floor stretches for about a mile in every direction. The spectator stands are a thin ring along the distant horizon, packed with a huge cheering crowd so far away that each spectator is a tiny speck, safe, never close to the duel, never in the foreground and never touched by a spell. The duel and the spells fill the frame.";

export const BATTLEFIELD_RULE = `${COLOSSEUM_RULE} The ground between the wizards and the distant stands is the battlefield the spells have made. Keep solid ground under the wizards. Never use fog, haze or a plain grey backdrop: the scene is vivid and colorful, lit by the spells themselves, under a sky that matches the mood (a stormy violet dusk, a blazing sunset, a starry night, clouds torn open by magic). The wizards move freely: they run, fly, leap, teleport and close to point-blank range or retreat far apart.`;

/** Where the battlefield starts before the first battle round. */
export const STARTING_BATTLEFIELD =
  "A vast floor of pale stone flagstones stretching toward the distant ring of colosseum stands under a deep violet and gold twilight sky, with no damage yet.";

// The introduction (round 0) is the wide establishing shot. Every battle round
// gets a different camera angle, shuffled per duel so duels feel different and
// no angle repeats until all are used. Every shot keeps both wizards large
// enough to read: shots that hid the action (a face close-up, a straight-down
// aerial view, a view from behind the crowd) were replaced.
export const CAMERA_SHOTS = [
  "Slightly low angle on the round's winner as their spell or strike reaches its target, with the other wizard large and clearly visible. Keep the angle gentle so neither wizard is distorted in size.",
  "Medium shot from the waist up on the attacking wizard mid-cast, with the target and the point of impact clearly visible in the same frame.",
  "Over-the-shoulder shot from behind one wizard, looking at the opponent, who is fully visible and facing the camera, as the spells or attacks pass between them.",
  "Elevated three-quarter view from about 30 feet up, both wizards large in the frame, the spells or strikes meeting between them.",
  "Tilted (Dutch angle) action shot at the moment of impact, debris flying, one wizard caught mid-movement and the other clearly visible and part of the action.",
  "Side-on view at eye level, one wizard on the left and one on the right, both fully in frame, with the clash between them.",
  "Ground-level shot with arena rubble in the near foreground, a wizard leaping or diving in the middle of the frame as the opposing spell streaks past or strikes.",
  "Low wide shot from just above the ground, the reshaped battlefield stretching between the two wizards, both clearly visible and large enough to read.",
];

// Small deterministic PRNG so the shuffle is stable for a given duel
function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let state = h >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The camera shot for a battle round, stable for a given duel. */
export function getCameraShot(duelId: string, roundNumber: number): string {
  const random = seededRandom(duelId);
  const order = [...CAMERA_SHOTS];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order[Math.max(0, roundNumber - 1) % order.length];
}

/** How worn a wizard looks at a given health, so damage builds up visibly. */
export function healthCondition(health: number): string {
  if (health <= 0) return "defeated, collapsed on the ground";
  if (health < 25)
    return "near collapse: clothing badly torn and singed, bruised, struggling to stay upright";
  if (health < 50)
    return "battered: torn, scorched clothing, scrapes, visibly tired";
  if (health < 80) return "lightly worn: a few scuffs and scorch marks";
  return "fresh and unmarked";
}

/** Rules the art director follows when writing a round's image prompt. */
export const ART_DIRECTION_RULES = `RULES
1. Show ONE moment: the decisive moment of the round from the narration. Do not try to show everything that happened. Each wizard appears exactly once, in a single pose. Never describe a wizard going through a sequence (stumbling and then collapsed), because the image model will draw them twice. Pick the one instant that tells the story.
2. The narration is what actually happened. Where it differs from the declared actions, follow the narration. The OUTCOME numbers are facts too: if a wizard lost health but the narration doesn't say how, show them being hit by the most likely part of their opponent's spell.
3. Name each wizard every time you refer to them. Say where each one is in the frame (left, right, foreground, middle) and which way they face and move.
4. Spells are physical things. For each spell, describe what it is made of, its shape, how big it is compared to the wizards, where it comes from and what it touches. Write "a coil of jagged ice as long as a bus" instead of "blue magic". Never use these vague words unless the spell literally is that thing: energy, magical particles, sparks, glow, glowing aura, swirl, burst of light, magical effects, arcane power.
5. Abstract effects (spoken words, insults, music, illusions, curses, mind magic) must become something you can see, such as a caster mid-shout and a target recoiling as if slapped, or a ghostly copy of a wizard dissolving. Never put written words, letters, numbers, speech bubbles or signs in the image.
6. Make the outcome readable. A wizard who lost health this round is visibly struck, and the reaction matches the damage: under 10 is a flinch or stumble, 10 to 25 knocks them back or off their feet, more than 25 throws or slams them. A wizard who took no damage looks unharmed by this round. A blocked attack is shown meeting the defense. A spell that failed or fizzled is shown failing near the target it was aimed at, never wrapped around its own caster.
7. Show each wizard's condition from their health, as given below, so damage builds up across the duel.
8. Never describe a wizard's usual clothing, colors, hair, body or props. Reference images of the wizards already supply their look, and any description you add will fight them. Only describe what this round changes: a transformation (describe the new form in full, carrying the wizard's colors so they stay recognizable, and say they are no longer in their usual form), a changed feature (for example hair turned orange), something they now hold or have dropped, or damage.
9. Never describe a wizard's size or height (no tall, towering, looming, giant, tiny, small, huge for a wizard). Their heights are set separately. You may describe the size of spells, creatures and objects.
10. Use the given camera shot and state the angle in your first sentence. Both wizards must be fully visible and large enough to read. The wizard being struck is never tiny, hidden or cut off. Only if the given shot would hide the decisive action, use one of the alternative shots instead.
11. This is a single full-bleed image. Never use the words panel, comic, border, page or layout.
12. The colosseum stands and crowd appear only as a thin, distant ring on the horizon, when the camera angle shows the horizon at all. Never put spectators close up, in the foreground or near a spell. Build the background from the CURRENT BATTLEFIELD below plus what this round's spells do to it: the ground, the sky, the weather, the light and any lasting damage. Keep it colorful: no fog, haze or plain grey backdrop. Lasting effects from earlier rounds stay unless a spell clears them.
13. Write 100 to 170 words of plain descriptive sentences in present tense. No lists, no headings, no backstory, no names of real characters or franchises.`;

/** Shared rules appended to every duel scene prompt, after the scene itself. */
export const SCENE_IMAGE_RULES =
  "Each wizard appears exactly once in the image. The image is a single full-bleed scene that fills the whole canvas edge to edge: no border, white margin, frame, panel outline, split panels or caption. Do not draw any text, letters, numbers or speech bubbles. Flat-shaded low poly illustration with bold, saturated colors, not a photorealistic 3D render.";

/** How apparent size should work, so camera angles don't resize the wizards. */
export const PERSPECTIVE_RULE =
  "Apparent size follows distance from the camera: a wizard nearer the camera may look larger, but a wizard farther from the camera must never look larger than their true height allows. Do not exaggerate either wizard's height.";

export type WizardHeight = { name: string; heightFeet: number };

const MIN_HEIGHT_FEET = 0.5;
const MAX_HEIGHT_FEET = 60;
export const DEFAULT_HEIGHT_FEET = 5.75;

/** "about 7 feet", "about 5 feet 9 inches", "about 8 inches" */
export function formatHeight(heightFeet: number): string {
  const totalInches = Math.round(heightFeet * 12);
  if (totalInches < 12) return `about ${totalInches} inches`;
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  const feetText = `${feet} ${feet === 1 ? "foot" : "feet"}`;
  return inches === 0
    ? `about ${feetText}`
    : `about ${feetText} ${inches} ${inches === 1 ? "inch" : "inches"}`;
}

function clampHeight(heightFeet: number): number {
  if (!Number.isFinite(heightFeet)) return DEFAULT_HEIGHT_FEET;
  return Math.min(MAX_HEIGHT_FEET, Math.max(MIN_HEIGHT_FEET, heightFeet));
}

// Where the shorter wizard's head reaches on the taller one, by height ratio
const REACH_POINTS: Array<[number, string]> = [
  [0.88, "chin"],
  [0.78, "shoulder"],
  [0.68, "chest"],
  [0.55, "waist"],
  [0.4, "hip"],
  [0.28, "knee"],
];

/**
 * One fixed sentence describing the two wizards' relative heights. It is
 * repeated word for word in every image of the duel so the model has the same
 * scale every time.
 */
export function describeScale(heights: WizardHeight[]): string {
  const wizards = heights.map((h) => ({
    name: h.name,
    heightFeet: clampHeight(h.heightFeet),
  }));
  if (wizards.length < 2) {
    return wizards.length === 1
      ? `SCALE: ${wizards[0].name} is ${formatHeight(wizards[0].heightFeet)} tall in their usual form.`
      : "";
  }
  const [a, b] = wizards;
  const heightsText = `${a.name} is ${formatHeight(a.heightFeet)} tall and ${b.name} is ${formatHeight(b.heightFeet)} tall in their usual forms`;
  const [taller, shorter] = a.heightFeet >= b.heightFeet ? [a, b] : [b, a];
  const ratio = shorter.heightFeet / taller.heightFeet;

  let comparison: string;
  if (ratio >= 0.95) {
    comparison = "They are about the same height.";
  } else {
    const reach = REACH_POINTS.find(([min]) => ratio >= min);
    comparison = reach
      ? `When they stand at the same distance from the camera, the top of ${shorter.name}'s head reaches ${taller.name}'s ${reach[1]}.`
      : `${taller.name} is about ${Math.round(1 / ratio)} times as tall as ${shorter.name}.`;
  }
  return `SCALE (the same in every image of this duel): ${heightsText}. ${comparison} A transformed wizard takes the size of their new form.`;
}

export type DirectorWizard = {
  name: string;
  description: string;
  action?: string;
  healthChange: number;
  pointsEarned: number;
  healthAfter: number;
};

export type DirectorInput = {
  roundNumber: number;
  totalRounds?: number;
  wizards: DirectorWizard[];
  narration: string;
  result?: string;
  cameraShot: string;
  // What the battlefield looked like after the previous round
  battlefield?: string;
};

/**
 * The facts of a round, laid out for the art director. The judge's own scene
 * note is left out on purpose: it repeated the judge's mistakes (a wizard
 * "partially transformed", a "towering" bard) and the narration covers it.
 */
export function buildDirectorInput(input: DirectorInput): string {
  const { wizards } = input;
  const lines: string[] = [];

  lines.push(
    "WIZARDS (descriptions are for who they are; do not repeat their looks)",
  );
  for (const w of wizards) {
    lines.push(`- ${w.name}: ${w.description}`);
  }

  lines.push("");
  lines.push(
    `ROUND ${input.roundNumber}${input.totalRounds ? ` of ${input.totalRounds}` : ""}`,
  );
  for (const w of wizards) {
    if (w.action) lines.push(`${w.name}'s declared action: ${w.action}`);
  }

  lines.push("");
  lines.push(`NARRATION (what actually happened): ${input.narration}`);
  if (input.result) lines.push(`HEADLINE: ${input.result}`);

  lines.push("");
  lines.push("OUTCOME");
  for (const w of wizards) {
    const change =
      w.healthChange < 0
        ? `took ${-w.healthChange} damage`
        : w.healthChange > 0
          ? `healed ${w.healthChange}`
          : "took no damage";
    lines.push(
      `- ${w.name} ${change} and earned ${w.pointsEarned} points. Health now ${w.healthAfter}/100, so they look ${healthCondition(w.healthAfter)}.`,
    );
  }
  if (wizards.length === 2) {
    const [a, b] = wizards;
    const winner =
      a.pointsEarned === b.pointsEarned
        ? "Neither: the round was even."
        : a.pointsEarned > b.pointsEarned
          ? a.name
          : b.name;
    lines.push(`Round winner: ${winner}`);
  }

  const impacts = impactLines(wizards);
  if (impacts.length > 0) {
    lines.push(
      `MUST BE SHOWN (the moment of the hit, even if the narration doesn't describe it): ${impacts.join(" ")}`,
    );
  }

  lines.push("");
  lines.push(`CAMERA SHOT: ${input.cameraShot}`);
  lines.push(
    `Alternative shots, only if that one would hide the decisive action:\n${CAMERA_SHOTS.filter(
      (s) => s !== input.cameraShot,
    )
      .map((s) => `- ${s}`)
      .join("\n")}`,
  );
  lines.push("");
  lines.push(
    `CURRENT BATTLEFIELD (before this round): ${input.battlefield ?? STARTING_BATTLEFIELD}`,
  );
  lines.push(BATTLEFIELD_RULE);
  return lines.join("\n");
}

/** Health of each wizard after every round, replaying the stored changes. */
export function healthAfterRounds(
  wizardIds: string[],
  rounds: Array<{
    roundNumber: number;
    outcome?: { healthChange?: Record<string, number> };
  }>,
  throughRound: number,
  startingHealth = 100,
): Record<string, number> {
  const health: Record<string, number> = {};
  for (const id of wizardIds) health[id] = startingHealth;
  const ordered = rounds
    .filter((r) => r.roundNumber >= 1 && r.roundNumber <= throughRound)
    .sort((a, b) => a.roundNumber - b.roundNumber);
  for (const round of ordered) {
    for (const id of wizardIds) {
      const change = round.outcome?.healthChange?.[id] ?? 0;
      health[id] = Math.max(0, Math.min(100, health[id] + change));
    }
  }
  return health;
}

/** Checklist the art director runs before answering. */
export const DIRECTOR_SELF_CHECK = `BEFORE YOU ANSWER, reread your prompt and fix it if it does any of these:
- mentions words, letters, writing, text, runes that spell something, or speech bubbles (show the effect without any writing)
- describes a wizard's usual clothing, boots, hat, hair, eyes, skin, colors or props (only changes from this round are allowed)
- gives a wizard a size or height word (towering, tall, tiny, giant, looming)
- calls a transformation partial when the narration doesn't
- uses the words panel, comic, border or page
- puts the stands or spectators anywhere but a thin, distant ring on the horizon
- has a foggy, hazy, grey or empty background instead of a vivid sky and battlefield
- describes a wizard in two different poses or moments, which makes the image model draw them twice
- does not show the wizard who took the most damage at the instant of being hit, or shows a wizard who took no damage as hurt`;

const PROMPT_PROBLEMS: Array<[RegExp, string]> = [
  [
    /\b(words?|letters?|lettering|text|writing|written|inscriptions?|speech bubbles?|captions?)\b/i,
    "It asks for written words or letters. Image models garble text, so show the effect with no writing at all.",
  ],
  [
    /\b(panels?|comic|border)\b/i,
    "It uses the word panel, comic or border, which makes the image model draw a frame.",
  ],
  [
    /\b(towering|looming|very tall|giant|tiny)\s+(bard|wizard|figure|mage|sorcer\w*|spellcaster|witch|warlock|man|woman)\b/i,
    "It gives a wizard a size word. Wizard heights are set separately.",
  ],
  [
    /\b(front[- ]row|nearby (spectators?|crowd)|(spectators?|crowd)[^.]{0,40}\b(foreground|close by|nearby|flee|duck|scatter))\b/i,
    "It brings the crowd close. The stands are only a thin, distant ring on the horizon, far from the spells.",
  ],
  [
    /\bpartially transformed\b/i,
    "It calls a transformation partial. Describe only the new form in full.",
  ],
];

/** Rule breaks a pattern can spot in an art director prompt. */
export function findPromptProblems(prompt: string): string[] {
  return PROMPT_PROBLEMS.filter(([pattern]) => pattern.test(prompt)).map(
    ([, problem]) => problem,
  );
}

/**
 * Required sentences for every wizard who lost health this round, scaled to
 * the damage. The judge's narration doesn't always say how a hit landed, and
 * the lite model then leaves the hit out, so the hits are stated in code.
 */
export function impactLines(wizards: DirectorWizard[]): string[] {
  return wizards
    .filter((w) => w.healthChange < 0)
    .map((w) => {
      const damage = -w.healthChange;
      const opponent = wizards.find((o) => o.name !== w.name)?.name;
      const from = opponent ? ` from ${opponent}'s attack` : "";
      if (w.healthAfter <= 0)
        return `${w.name} has just been knocked out${opponent ? ` by ${opponent}` : ""} and is collapsing to the ground.`;
      if (damage > 25)
        return `${w.name} is being thrown off their feet by a heavy hit${from}.`;
      if (damage >= 10)
        return `${w.name} is being knocked backward by a solid hit${from}.`;
      return `${w.name} flinches from a glancing hit${from}.`;
    });
}
