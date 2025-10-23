import { expect, test, describe } from "vitest";
import {
  CAMPAIGN_OPPONENTS_DATA,
  CAMPAIGN_DIFFICULTIES,
} from "./campaignOpponents";

describe("Campaign Opponents Data", () => {
  test("should have exactly 10 opponents", () => {
    expect(CAMPAIGN_OPPONENTS_DATA).toHaveLength(10);
  });

  test("should have opponents numbered 1-10", () => {
    const opponentNumbers = CAMPAIGN_OPPONENTS_DATA.map(
      (op) => op.opponentNumber
    ).sort((a, b) => a - b);
    expect(opponentNumbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  test("should have correct difficulty distribution", () => {
    const beginnerOpponents = CAMPAIGN_OPPONENTS_DATA.filter(
      (op) => op.difficulty === CAMPAIGN_DIFFICULTIES.BEGINNER
    );
    const intermediateOpponents = CAMPAIGN_OPPONENTS_DATA.filter(
      (op) => op.difficulty === CAMPAIGN_DIFFICULTIES.INTERMEDIATE
    );
    const advancedOpponents = CAMPAIGN_OPPONENTS_DATA.filter(
      (op) => op.difficulty === CAMPAIGN_DIFFICULTIES.ADVANCED
    );

    expect(beginnerOpponents).toHaveLength(3); // Opponents 1-3
    expect(intermediateOpponents).toHaveLength(4); // Opponents 4-7
    expect(advancedOpponents).toHaveLength(3); // Opponents 8-10
  });

  test("should have correct luck modifiers", () => {
    // Beginner opponents (1-3) should have -2 luck
    const beginnerOpponents = CAMPAIGN_OPPONENTS_DATA.filter(
      (op) => op.opponentNumber <= 3
    );
    beginnerOpponents.forEach((op) => {
      expect(op.luckModifier).toBe(-2);
      expect(op.difficulty).toBe(CAMPAIGN_DIFFICULTIES.BEGINNER);
    });

    // Intermediate opponents (4-7) should have 0 luck
    const intermediateOpponents = CAMPAIGN_OPPONENTS_DATA.filter(
      (op) => op.opponentNumber >= 4 && op.opponentNumber <= 7
    );
    intermediateOpponents.forEach((op) => {
      expect(op.luckModifier).toBe(0);
      expect(op.difficulty).toBe(CAMPAIGN_DIFFICULTIES.INTERMEDIATE);
    });

    // Advanced opponents (8-10) should have +2 luck
    const advancedOpponents = CAMPAIGN_OPPONENTS_DATA.filter(
      (op) => op.opponentNumber >= 8
    );
    advancedOpponents.forEach((op) => {
      expect(op.luckModifier).toBe(2);
      expect(op.difficulty).toBe(CAMPAIGN_DIFFICULTIES.ADVANCED);
    });
  });

  test("should have all required fields for each opponent", () => {
    CAMPAIGN_OPPONENTS_DATA.forEach((opponent) => {
      expect(opponent.opponentNumber).toBeTypeOf("number");
      expect(opponent.name).toBeTypeOf("string");
      expect(opponent.description).toBeTypeOf("string");
      expect(Array.isArray(opponent.personalityTraits)).toBe(true);
      expect(opponent.spellStyle).toBeTypeOf("string");
      expect(opponent.difficulty).toBeTypeOf("string");
      expect(opponent.luckModifier).toBeTypeOf("number");
      expect(opponent.illustrationPrompt).toBeTypeOf("string");

      // Ensure non-empty strings
      expect(opponent.name.length).toBeGreaterThan(0);
      expect(opponent.description.length).toBeGreaterThan(0);
      expect(opponent.spellStyle.length).toBeGreaterThan(0);
      expect(opponent.illustrationPrompt.length).toBeGreaterThan(0);

      // Ensure personality traits array is not empty
      expect(opponent.personalityTraits.length).toBeGreaterThan(0);
    });
  });

  test("should have unique names", () => {
    const names = CAMPAIGN_OPPONENTS_DATA.map((op) => op.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  test("should have meaningful personality traits", () => {
    CAMPAIGN_OPPONENTS_DATA.forEach((opponent) => {
      expect(opponent.personalityTraits.length).toBeGreaterThanOrEqual(3);
      expect(opponent.personalityTraits.length).toBeLessThanOrEqual(5);

      // Each trait should be a non-empty string
      opponent.personalityTraits.forEach((trait) => {
        expect(trait).toBeTypeOf("string");
        expect(trait.length).toBeGreaterThan(0);
      });
    });
  });
});
