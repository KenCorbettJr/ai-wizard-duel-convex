/** The scripted example round shown on the homepage. Illustrative only. */

export const SPELL_A =
  "A phoenix made of crystalline ice, diving from the storm clouds.";

export interface Score {
  creativity: number;
  strategy: number;
  luck: number;
}

export const SPELLS_B: ReadonlyArray<{
  short: string;
  spell: string;
  image: string;
  alt: string;
  narration: string;
  verdict: string;
  a: Score;
  b: Score;
}> = [
  {
    short: "Flaming umbrella",
    spell: "A wall of roaring flame, shaped like an enormous open umbrella.",
    image: "/images/demo/spell-umbrella.jpg",
    alt: "A flaming umbrella bursts an ice phoenix into steam in a stormy arena",
    narration:
      "The ice phoenix screams down through the thunderheads just as the flaming umbrella snaps open. Ice meets fire in a burst of steam, and the phoenix, half melted and wholly offended, skids across the arena into a very surprised wizard. Points to the umbrella. Dignity to nobody.",
    verdict: "You win the round. Your rival takes 2 damage.",
    a: { creativity: 7, strategy: 5, luck: 6 },
    b: { creativity: 8, strategy: 8, luck: 14 },
  },
  {
    short: "Sleepy dragon",
    spell: "A sleepy dragon who would honestly rather not be here.",
    image: "/images/demo/spell-dragon.jpg",
    alt: "A yawning green dragon as an ice phoenix sails past and a wizard tumbles into snow",
    narration:
      "The dragon yawns just as the phoenix dives, and the warm updraft carries the bird straight past him. Your rival overshoots the arena and lands in a snowdrift of their own making, and the dragon goes back to sleep. Nobody has ever looked less threatened.",
    verdict: "Your rival edges it on style. You score 1 for napping.",
    a: { creativity: 7, strategy: 6, luck: 17 },
    b: { creativity: 9, strategy: 3, luck: 9 },
  },
  {
    short: "Thousand mirrors",
    spell:
      "A thousand tiny mirrors that reflect every spell back at the caster.",
    image: "/images/demo/spell-mirrors.jpg",
    alt: "An ice phoenix shatters into reflected copies over a field of floating mirrors",
    narration:
      "The phoenix shrieks into the glittering field and meets itself a thousand times over. The reflected birds collide, shatter and rain down as glittering frost across both wizards. It is beautiful, and extremely cold for everyone.",
    verdict: "You take the round. Both wizards take 1 damage.",
    a: { creativity: 7, strategy: 4, luck: 11 },
    b: { creativity: 8, strategy: 9, luck: 8 },
  },
];
