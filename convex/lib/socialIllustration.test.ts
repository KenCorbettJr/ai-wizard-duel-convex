import { describe, expect, test } from "vitest";
import { pickTeaserIllustration } from "./socialIllustration";

type Round = Parameters<typeof pickTeaserIllustration>[1][number];
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

describe("pickTeaserIllustration", () => {
  test("a finished duel uses round 2 as foreshadowing", () => {
    expect(pickTeaserIllustration("COMPLETED", finished)).toBe("r2");
  });

  test("falls back to round 3 when round 2 has no image", () => {
    const rounds = finished.map((r) => (r.roundNumber === 2 ? round(2) : r));
    expect(pickTeaserIllustration("COMPLETED", rounds)).toBe("r3");
  });

  test("never uses the final round, even when it is round 2 or 3", () => {
    const short = [round(0, "intro"), round(1), round(2), round(3, "r3")];
    expect(pickTeaserIllustration("COMPLETED", short)).toBe("intro");
  });

  test("never uses the conclusion", () => {
    const rounds = [round(1), round(2, "conclusion", "CONCLUSION")];
    expect(pickTeaserIllustration("COMPLETED", rounds)).toBeUndefined();
  });

  test("a live duel moves past the introduction as rounds are drawn", () => {
    const live = [round(0, "intro"), round(1, "r1"), round(2)];
    expect(pickTeaserIllustration("IN_PROGRESS", live)).toBe("r1");
    live[2] = round(2, "r2");
    expect(pickTeaserIllustration("IN_PROGRESS", live)).toBe("r2");
  });

  test("a live duel can use its latest round, which isn't the ending yet", () => {
    const live = [round(0, "intro"), round(1, "r1"), round(2, "r2")];
    expect(pickTeaserIllustration("IN_PROGRESS", live)).toBe("r2");
  });
});
