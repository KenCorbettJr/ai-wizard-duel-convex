import { describe, expect, test } from "vitest";
import { pickSocialIllustration } from "./socialIllustration";

type Round = Parameters<typeof pickSocialIllustration>[1][number];
const round = (
  roundNumber: number,
  illustration?: string,
  type: Round["type"] = "SPELL_CASTING",
): Round => ({
  roundNumber,
  type,
  outcome: { narrative: "", illustration },
});

const finished = [
  round(0, "intro"),
  round(1, "r1"),
  round(2, "r2"),
  round(3, "r3"),
  round(4, "r4"),
  round(5, "conclusion", "CONCLUSION"),
];

describe("pickSocialIllustration", () => {
  test("a finished duel uses round 2 as foreshadowing", () => {
    expect(pickSocialIllustration("COMPLETED", finished)).toBe("r2");
  });

  test("falls back to round 3 when round 2 has no image", () => {
    const rounds = finished.map((r) => (r.roundNumber === 2 ? round(2) : r));
    expect(pickSocialIllustration("COMPLETED", rounds)).toBe("r3");
  });

  test("never uses the final round, even when it is round 2 or 3", () => {
    const short = [round(0, "intro"), round(1), round(2), round(3, "r3")];
    expect(pickSocialIllustration("COMPLETED", short)).toBe("intro");
  });

  test("never uses the conclusion", () => {
    const rounds = [round(1), round(2, "conclusion", "CONCLUSION")];
    expect(pickSocialIllustration("COMPLETED", rounds)).toBeUndefined();
  });

  test("a live duel uses its latest illustration", () => {
    const live = [round(0, "intro"), round(1, "r1"), round(2)];
    expect(pickSocialIllustration("IN_PROGRESS", live)).toBe("r1");
  });
});
