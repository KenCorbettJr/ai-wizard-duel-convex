import { describe, expect, it } from "vitest";
import {
  ART_DIRECTION_RULES,
  BATTLEFIELD_RULE,
  COLOSSEUM_RULE,
  STARTING_BATTLEFIELD,
  CAMERA_SHOTS,
  buildDirectorInput,
  describeScale,
  findPromptProblems,
  formatHeight,
  getCameraShot,
  healthAfterRounds,
  healthCondition,
  impactLines,
} from "./sceneDirection";

describe("describeScale", () => {
  it("says where the shorter wizard's head reaches", () => {
    const text = describeScale([
      { name: "Baph", heightFeet: 7 },
      { name: "Zara", heightFeet: 5.75 },
    ]);
    expect(text).toContain("Baph is about 7 feet tall");
    expect(text).toContain("Zara is about 5 feet 9 inches tall");
    expect(text).toContain("the top of Zara's head reaches Baph's shoulder");
  });

  it("calls near-equal heights the same", () => {
    const text = describeScale([
      { name: "A", heightFeet: 5.75 },
      { name: "B", heightFeet: 5.9 },
    ]);
    expect(text).toContain("about the same height");
  });

  it("uses a multiple for very different sizes", () => {
    const text = describeScale([
      { name: "Pip", heightFeet: 1 },
      { name: "Drake", heightFeet: 20 },
    ]);
    expect(text).toContain("Drake is about 20 times as tall as Pip");
  });

  it("clamps nonsense heights", () => {
    const text = describeScale([
      { name: "A", heightFeet: Number.NaN },
      { name: "B", heightFeet: 1000 },
    ]);
    expect(text).toContain("A is about 5 feet 9 inches tall");
    expect(text).toContain("B is about 60 feet tall");
  });
});

describe("formatHeight", () => {
  it("formats feet and inches", () => {
    expect(formatHeight(7)).toBe("about 7 feet");
    expect(formatHeight(6.3)).toBe("about 6 feet 4 inches");
    expect(formatHeight(0.5)).toBe("about 6 inches");
    expect(formatHeight(1)).toBe("about 1 foot");
  });
});

describe("getCameraShot", () => {
  it("uses every shot once before repeating, stable per duel", () => {
    const shots = CAMERA_SHOTS.map((_, i) => getCameraShot("duel-abc", i + 1));
    expect(new Set(shots).size).toBe(CAMERA_SHOTS.length);
    expect(getCameraShot("duel-abc", 3)).toBe(shots[2]);
    expect(getCameraShot("duel-abc", CAMERA_SHOTS.length + 1)).toBe(shots[0]);
  });

  it("has no shots that shrink or hide the wizards", () => {
    const all = CAMERA_SHOTS.join(" ").toLowerCase();
    expect(all).not.toContain("straight down");
    expect(all).not.toContain("close-up on one wizard's face");
    expect(all).not.toContain("behind the crowd");
  });
});

describe("healthCondition", () => {
  it("gets more worn as health drops", () => {
    expect(healthCondition(100)).toBe("fresh and unmarked");
    expect(healthCondition(60)).toContain("lightly worn");
    expect(healthCondition(30)).toContain("battered");
    expect(healthCondition(10)).toContain("near collapse");
    expect(healthCondition(0)).toContain("defeated");
  });
});

describe("healthAfterRounds", () => {
  it("replays health changes up to the given round", () => {
    const rounds = [
      { roundNumber: 0, outcome: {} },
      { roundNumber: 1, outcome: { healthChange: { a: -15, b: 0 } } },
      { roundNumber: 2, outcome: { healthChange: { a: -15, b: 0 } } },
      { roundNumber: 3, outcome: { healthChange: { a: 0, b: -35 } } },
    ];
    expect(healthAfterRounds(["a", "b"], rounds, 2)).toEqual({ a: 70, b: 100 });
    expect(healthAfterRounds(["a", "b"], rounds, 3)).toEqual({ a: 70, b: 65 });
  });

  it("keeps health between 0 and 100", () => {
    const rounds = [
      { roundNumber: 1, outcome: { healthChange: { a: 20, b: -150 } } },
    ];
    expect(healthAfterRounds(["a", "b"], rounds, 1)).toEqual({ a: 100, b: 0 });
  });
});

describe("buildDirectorInput", () => {
  const base = {
    roundNumber: 5,
    totalRounds: 5,
    narration: "Zara melts the instruments with silver rain.",
    result: "Liquid silver traps the bard.",
    cameraShot: CAMERA_SHOTS[2],
  };

  it("lays out the outcome, condition and winner", () => {
    const text = buildDirectorInput({
      ...base,
      wizards: [
        {
          name: "Baph",
          description: "A bard",
          action: "Animate my instruments",
          healthChange: -35,
          pointsEarned: 6,
          healthAfter: 65,
        },
        {
          name: "Zara",
          description: "A storm wizard",
          action: "Silver rain",
          healthChange: 0,
          pointsEarned: 8,
          healthAfter: 55,
        },
      ],
    });
    expect(text).toContain("ROUND 5 of 5");
    expect(text).toContain("Baph's declared action: Animate my instruments");
    expect(text).toContain("Baph took 35 damage");
    expect(text).toContain("Zara took no damage");
    expect(text).toContain("Health now 55/100");
    expect(text).toContain("Round winner: Zara");
    expect(text).toContain(`CAMERA SHOT: ${CAMERA_SHOTS[2]}`);
    // The chosen shot isn't repeated in the alternatives
    expect(text.split(CAMERA_SHOTS[2]).length).toBe(2);
  });

  it("calls an even round even", () => {
    const wizard = {
      description: "x",
      healthChange: 0,
      pointsEarned: 5,
      healthAfter: 100,
    };
    const text = buildDirectorInput({
      ...base,
      wizards: [
        { ...wizard, name: "A" },
        { ...wizard, name: "B" },
      ],
    });
    expect(text).toContain("Round winner: Neither");
  });
});

describe("ART_DIRECTION_RULES", () => {
  it("covers the problems seen in real duels", () => {
    expect(ART_DIRECTION_RULES).toContain(
      "Never describe a wizard's usual clothing",
    );
    expect(ART_DIRECTION_RULES).toContain(
      "Never describe a wizard's size or height",
    );
    expect(ART_DIRECTION_RULES).toContain("Never put written words");
    expect(ART_DIRECTION_RULES).toContain(
      "never wrapped around its own caster",
    );
    expect(ART_DIRECTION_RULES).toContain("Never use the words panel, comic");
  });
});

describe("findPromptProblems", () => {
  it("passes a clean prompt", () => {
    expect(
      findPromptProblems(
        "Side-on view at eye level. Zara on the left hurls a coil of jagged ice as long as a bus at Baph, who is knocked off his feet. A towering storm cloud fills the sky.",
      ),
    ).toEqual([]);
  });

  it("catches requests for writing", () => {
    expect(
      findPromptProblems("Glowing crimson words strike her chest."),
    ).toHaveLength(1);
  });

  it("catches frame words and wizard size words", () => {
    const problems = findPromptProblems(
      "A dramatic comic panel. The towering bard raises his hands. Mega Wiz is partially transformed.",
    );
    expect(problems).toHaveLength(3);
  });
});

describe("impactLines", () => {
  const wizard = (name: string, healthChange: number, healthAfter: number) => ({
    name,
    description: "x",
    healthChange,
    pointsEarned: 5,
    healthAfter,
  });

  it("scales the hit to the damage and names the attacker", () => {
    expect(
      impactLines([wizard("Baph", -35, 65), wizard("Zara", 0, 55)]),
    ).toEqual([
      "Baph is being thrown off their feet by a heavy hit from Zara's attack.",
    ]);
    expect(impactLines([wizard("A", -15, 85), wizard("B", -5, 95)])).toEqual([
      "A is being knocked backward by a solid hit from B's attack.",
      "B flinches from a glancing hit from A's attack.",
    ]);
  });

  it("shows a knockout and ignores healing", () => {
    expect(impactLines([wizard("A", -20, 0), wizard("B", 10, 100)])).toEqual([
      "A has just been knocked out by B and is collapsing to the ground.",
    ]);
  });

  it("is empty when nobody was hurt", () => {
    expect(impactLines([wizard("A", 0, 100), wizard("B", 0, 100)])).toEqual([]);
  });
});

describe("battlefield", () => {
  const wizards = [
    {
      name: "A",
      description: "x",
      healthChange: 0,
      pointsEarned: 5,
      healthAfter: 100,
    },
  ];
  const base = {
    roundNumber: 1,
    wizards,
    narration: "n",
    cameraShot: CAMERA_SHOTS[0],
  };

  it("starts from a clean floor and carries the last battlefield forward", () => {
    expect(buildDirectorInput(base)).toContain(
      `CURRENT BATTLEFIELD (before this round): ${STARTING_BATTLEFIELD}`,
    );
    expect(
      buildDirectorInput({ ...base, battlefield: "Needles and storm clouds." }),
    ).toContain(
      "CURRENT BATTLEFIELD (before this round): Needles and storm clouds.",
    );
  });

  it("keeps the crowd a distant ring on the horizon", () => {
    expect(buildDirectorInput(base)).toContain(BATTLEFIELD_RULE);
    expect(BATTLEFIELD_RULE).toContain(COLOSSEUM_RULE);
    expect(CAMERA_SHOTS.join(" ")).not.toMatch(/spectator|front row/i);
    expect(
      findPromptProblems("Spectators in the foreground duck as Zara attacks."),
    ).toHaveLength(1);
    // A distant crowd, and "stands" as a verb, are fine
    expect(
      findPromptProblems(
        "Zara stands firm on the cracked floor; the crowd is a thin ring of tiny specks on the far horizon.",
      ),
    ).toEqual([]);
  });
});
