import { describe, expect, it } from "vitest";
import { buildOpponentSpellPrompt } from "./campaignOpponentPrompt";

const felix = {
  id: "felix",
  name: "Firebrand Felix",
  description: "A fiery, passionate wizard.",
  spellStyle: "fire",
  personalityTraits: ["passionate", "hot-tempered"],
  difficulty: "INTERMEDIATE" as const,
};
const bard = {
  id: "bard",
  name: "Baph'ra'ph",
  description: "A towering bard.",
};

describe("buildOpponentSpellPrompt", () => {
  const prompt = buildOpponentSpellPrompt({
    wizard: felix,
    opponent: bard,
    roundNumber: 3,
    totalRounds: 5,
    hitPoints: { felix: 90, bard: 100 },
    previousRounds: [
      { roundNumber: 0 },
      {
        roundNumber: 2,
        spells: {
          felix: { description: "Felix hurls a ring of embers." },
          bard: { description: "I animate my beard." },
        },
        outcome: {
          result: "Embers scorch a giant beard.",
          pointsAwarded: { felix: 0, bard: 1 },
          healthChange: { felix: -10, bard: 0 },
        },
      },
      {
        roundNumber: 1,
        spells: {
          felix: { description: "Felix sweeps up a wall of flame." },
          bard: { description: "I play an electric song." },
        },
      },
    ],
  });

  it("shows both wizards' earlier spells in round order", () => {
    expect(prompt).toContain("Your spell: Felix sweeps up a wall of flame.");
    expect(prompt).toContain("Baph'ra'ph's spell: I animate my beard.");
    expect(prompt.indexOf("Round 1:")).toBeLessThan(prompt.indexOf("Round 2:"));
    expect(prompt).not.toContain("Round 0:");
  });

  it("includes the outcome of earlier rounds", () => {
    expect(prompt).toContain("What happened: Embers scorch a giant beard.");
    expect(prompt).toContain("Round went to: Baph'ra'ph");
    expect(prompt).toContain("Health: you -10, Baph'ra'ph 0");
  });

  it("includes personality, difficulty and the current situation", () => {
    expect(prompt).toContain("passionate, hot-tempered");
    expect(prompt).toContain("intermediate duelist");
    expect(prompt).toContain("Round 3 of 5");
    expect(prompt).toContain("You: 90/100 health");
  });

  it("asks for variety and an attempt to win", () => {
    expect(prompt).toMatch(/different tactic from your earlier spells/);
    expect(prompt).toMatch(/Do NOT repeat/);
    expect(prompt).toMatch(/Play to win/);
  });

  it("marks the final round", () => {
    const last = buildOpponentSpellPrompt({
      wizard: felix,
      opponent: bard,
      roundNumber: 5,
      totalRounds: 5,
      hitPoints: {},
      previousRounds: [],
    });
    expect(last).toContain("Round 5 of 5 (the final round)");
    expect(last).not.toContain("The duel so far");
  });
});
