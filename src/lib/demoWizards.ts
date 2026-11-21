/**
 * Example wizards for the homepage hero. The portraits are real ones the game
 * painted from descriptions like these (they're the campaign rivals).
 */
export interface DemoWizard {
  name: string;
  description: string;
  image: string;
  alt: string;
  traits: string[];
}

export const DEMO_WIZARDS: ReadonlyArray<DemoWizard> = [
  {
    name: "Bumbling Boris",
    description:
      "A clumsy, good-hearted wizard whose spells backfire in spectacular ways. He never, ever gives up.",
    image: "/images/wizards/boris.jpg",
    alt: "A wizard in a tall blue hat surrounded by misfiring sparkles and a startled rubber duck",
    traits: ["Mishap magic", "Determined"],
  },
  {
    name: "Mystic Marina",
    description:
      "A sea sorceress who moves like the tide, bending waves and ice to her will.",
    image: "/images/wizards/marina.jpg",
    alt: "A sorceress in flowing blue robes raising a swirl of seawater on a moonlit shore",
    traits: ["Water & ice", "Adaptable"],
  },
  {
    name: "Firebrand Felix",
    description:
      "A passionate fire wizard whose temper burns as bright as his flames.",
    image: "/images/wizards/felix.jpg",
    alt: "A red-haired wizard hurling a fireball across a volcanic landscape",
    traits: ["Fire magic", "Fiery temper"],
  },
  {
    name: "Stormcaller Zara",
    description:
      "A legendary storm wizard with lightning at her fingertips and thunder in her voice.",
    image: "/images/wizards/zara.jpg",
    alt: "A wizard with silver hair summoning crackling lightning in a dark storm",
    traits: ["Storm magic", "Commanding"],
  },
];
