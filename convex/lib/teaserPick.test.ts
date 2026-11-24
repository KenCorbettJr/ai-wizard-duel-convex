import { describe, expect, it } from "vitest";
import {
  chooseSceneRounds,
  spoilerSafeRounds,
  teaserScore,
  type TeaserRound,
} from "./teaserPick";

const round = (
  roundNumber: number,
  overrides: Partial<TeaserRound> = {},
): TeaserRound => ({
  roundNumber,
  type: "SPELL_CASTING",
  status: "COMPLETED",
  narrative: `Round ${roundNumber} happened.`,
  illustration: `img${roundNumber}`,
  ...overrides,
});

describe("spoilerSafeRounds", () => {
  it("drops the deciding round and the conclusion", () => {
    const rounds = [
      round(0),
      round(1),
      round(2),
      round(3),
      round(4, { type: "CONCLUSION" }),
    ];
    expect(spoilerSafeRounds(rounds).map((r) => r.roundNumber)).toEqual([
      0, 1, 2,
    ]);
  });

  it("never uses a final round, even out of order", () => {
    const rounds = [round(2, { type: "FINAL_ROUND" }), round(1), round(0)];
    expect(spoilerSafeRounds(rounds).map((r) => r.roundNumber)).toEqual([0, 1]);
  });

  it("ignores rounds that haven't finished", () => {
    const rounds = [
      round(0),
      round(1),
      round(2),
      round(3, { status: "PROCESSING", narrative: undefined }),
    ];
    // Round 2 is the last played round, so it is the deciding one.
    expect(spoilerSafeRounds(rounds).map((r) => r.roundNumber)).toEqual([0, 1]);
  });

  it("leaves only the intro for a one-round duel", () => {
    expect(
      spoilerSafeRounds([round(0), round(1)]).map((r) => r.roundNumber),
    ).toEqual([0]);
  });
});

describe("chooseSceneRounds", () => {
  it("prefers the latest played rounds, in story order", () => {
    const safe = [round(0), round(1), round(2), round(3), round(4)];
    expect(chooseSceneRounds(safe, 3).map((r) => r.roundNumber)).toEqual([
      2, 3, 4,
    ]);
  });

  it("fills with the intro and skips rounds without pictures", () => {
    const safe = [round(0), round(1, { illustration: undefined }), round(2)];
    expect(chooseSceneRounds(safe, 3).map((r) => r.roundNumber)).toEqual([
      0, 2,
    ]);
  });
});

describe("teaserScore", () => {
  it("ranks a watched duel above an unwatched one with the same rating", () => {
    const watched = teaserScore({
      uniqueViewers: 20,
      signedInViewers: 5,
      peakOnlookers: 4,
      aiRating: 6,
    });
    const quiet = teaserScore({
      uniqueViewers: 0,
      signedInViewers: 0,
      peakOnlookers: 0,
      aiRating: 6,
    });
    expect(watched).toBeGreaterThan(quiet);
  });

  it("lets the rating decide when nobody watched", () => {
    const base = { uniqueViewers: 0, signedInViewers: 0, peakOnlookers: 0 };
    expect(teaserScore({ ...base, aiRating: 9 })).toBeGreaterThan(
      teaserScore({ ...base, aiRating: 4 }),
    );
    expect(teaserScore(base)).toBe(5);
  });
});
