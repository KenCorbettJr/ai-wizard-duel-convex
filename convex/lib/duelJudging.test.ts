import { describe, expect, it } from "vitest";
import {
  describeLuckEdge,
  getDuelResult,
  isFullStalemate,
  stalemateWarning,
  trailingStalemateCount,
} from "./duelJudging";

const a = (luck: number) => ({ id: "a", name: "Aria", luck });
const b = (luck: number) => ({ id: "b", name: "Bram", luck });

describe("describeLuckEdge", () => {
  it("calls a small gap even", () => {
    expect(describeLuckEdge(a(11), b(12))).toMatch(/roughly even/);
  });

  it("gives the luckier wizard a modest edge", () => {
    const text = describeLuckEdge(a(9), b(14));
    expect(text).toMatch(/Bram has a modest edge/);
  });

  it("gives a clear edge but leaves room for a more creative spell", () => {
    const text = describeLuckEdge(a(18), b(10));
    expect(text).toMatch(/Aria has a clear edge/);
    expect(text).toMatch(/Bram can still win the round/);
  });

  it("gives a strong edge on a huge gap and flags both extremes", () => {
    const text = describeLuckEdge(a(20), b(4));
    expect(text).toMatch(/Aria has a strong edge/);
    expect(text).toMatch(/Bram's roll is very unfavorable/);
    expect(text).toMatch(/Aria's roll is very favorable/);
  });
});

const round = (
  roundNumber: number,
  points: [number, number],
  health: [number, number] = [0, 0],
) => ({
  roundNumber,
  outcome: {
    pointsAwarded: { a: points[0], b: points[1] },
    healthChange: { a: health[0], b: health[1] },
  },
});

describe("stalemates", () => {
  it("needs equal points and no damage", () => {
    expect(isFullStalemate(round(1, [7, 7]), ["a", "b"])).toBe(true);
    expect(isFullStalemate(round(1, [7, 6]), ["a", "b"])).toBe(false);
    expect(isFullStalemate(round(1, [7, 7], [-5, 0]), ["a", "b"])).toBe(
      false,
    );
  });

  it("counts only the trailing run of stalemates, ignoring the intro", () => {
    const rounds = [
      { roundNumber: 0 },
      round(1, [7, 7]),
      round(2, [8, 5], [0, -10]),
      round(4, [6, 6]),
      round(3, [7, 7]),
    ];
    expect(trailingStalemateCount(rounds, ["a", "b"])).toBe(2);
  });

  it("only warns when there was a stalemate", () => {
    expect(stalemateWarning(0)).toBe("");
    expect(stalemateWarning(1)).toMatch(/previous round/);
    expect(stalemateWarning(3)).toMatch(/last 3 rounds/);
  });
});

describe("getDuelResult", () => {
  it("reads a single winner as a win", () => {
    expect(
      getDuelResult({
        wizards: ["a", "b"],
        winners: ["b"],
        hitPoints: { a: 0, b: 40 },
      }),
    ).toEqual({ kind: "win", winnerId: "b", loserId: "a" });
  });

  it("reads two winners as a draw", () => {
    expect(
      getDuelResult({
        wizards: ["a", "b"],
        winners: ["a", "b"],
        hitPoints: { a: 100, b: 100 },
      }),
    ).toEqual({ kind: "draw", bothFell: false });
  });

  it("reads no winners after a double knockout as a draw where both fell", () => {
    expect(
      getDuelResult({
        wizards: ["a", "b"],
        winners: [],
        hitPoints: { a: 0, b: 0 },
      }),
    ).toEqual({ kind: "draw", bothFell: true });
  });
});
