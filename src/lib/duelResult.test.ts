import { explainDuelResult } from "./duelResult";

const names: Record<string, string> = { a: "Grumbleshroom", b: "Zippity" };
const base = { wizardIds: ["a", "b"], nameOf: (id: string) => names[id] };

describe("explainDuelResult", () => {
  it("explains a points win when the winner had less health", () => {
    const text = explainDuelResult({
      ...base,
      winners: ["b"],
      hitPoints: { a: 85, b: 40 },
      points: { a: 31, b: 36 },
    });
    expect(text).toContain("Grumbleshroom had more health left");
    expect(text).toContain("36 points to 31");
    expect(text).toContain("points win");
  });

  it("explains a plain points win", () => {
    const text = explainDuelResult({
      ...base,
      winners: ["a"],
      hitPoints: { a: 70, b: 40 },
      points: { a: 30, b: 20 },
    });
    expect(text).toContain("Grumbleshroom won 30 points to 20");
  });

  it("explains a knockout even with fewer points", () => {
    const text = explainDuelResult({
      ...base,
      winners: ["a"],
      hitPoints: { a: 10, b: 0 },
      points: { a: 12, b: 20 },
    });
    expect(text).toMatch(/^Knockout! Zippity ran out of health/);
  });

  it("explains the health tiebreaker", () => {
    const text = explainDuelResult({
      ...base,
      winners: ["b"],
      hitPoints: { a: 30, b: 55 },
      points: { a: 25, b: 25 },
    });
    expect(text).toContain("tied at 25");
    expect(text).toContain("Zippity had 55 left to Grumbleshroom's 30");
  });

  it("explains draws", () => {
    expect(
      explainDuelResult({
        ...base,
        winners: [],
        hitPoints: { a: 0, b: 0 },
        points: { a: 5, b: 9 },
      }),
    ).toMatch(/^Double knockout/);
    expect(
      explainDuelResult({
        ...base,
        winners: ["a", "b"],
        hitPoints: { a: 50, b: 50 },
        points: { a: 20, b: 20 },
      }),
    ).toMatch(/^Perfectly matched/);
  });

  it("says nothing extra for a forfeit", () => {
    expect(
      explainDuelResult({
        ...base,
        winners: ["a"],
        hitPoints: { a: 100, b: 100 },
        points: {},
        forfeited: true,
      }),
    ).toBeNull();
  });
});
