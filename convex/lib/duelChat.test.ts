import { describe, expect, test } from "vitest";
import {
  chatPhase,
  cleanChatText,
  messageReached,
  textBlockedReason,
} from "./duelChat";
import { containsContactInfo } from "./watcherRules";

const live = {
  status: "IN_PROGRESS" as const,
  players: ["a", "b"],
  currentRound: 2,
};

describe("chatPhase", () => {
  test("a live duel is after the rounds before the one in play", () => {
    expect(chatPhase(live)).toEqual({ afterRound: 1 });
    expect(chatPhase({ ...live, currentRound: 1 })).toEqual({ afterRound: 0 });
  });

  test("before the duel starts is round 0", () => {
    expect(
      chatPhase({ ...live, status: "WAITING_FOR_PLAYERS", currentRound: 1 }),
    ).toEqual({ afterRound: 0 });
  });

  test("a finished duel is post-duel", () => {
    expect(
      chatPhase({ ...live, status: "COMPLETED", currentRound: 3 }),
    ).toEqual({ afterRound: 3, postDuel: true });
  });
});

describe("messageReached", () => {
  test("shows a message once the viewer has watched the rounds before it", () => {
    const msg = { afterRound: 2 };
    expect(messageReached(msg, 1, false)).toBe(false);
    expect(messageReached(msg, 2, false)).toBe(true);
  });

  test("post-duel messages wait for the result", () => {
    const gg = { afterRound: 3, postDuel: true };
    expect(messageReached(gg, 3, false)).toBe(false);
    expect(messageReached(gg, 3, true)).toBe(true);
  });
});

describe("textBlockedReason", () => {
  test("allows duelists in a live duel", () => {
    expect(textBlockedReason(live, "a", 0)).toBeNull();
  });

  test("blocks spectators, chat-off duels and campaign battles", () => {
    expect(textBlockedReason(live, "c", 0)).toMatch(/duelists/);
    expect(textBlockedReason({ ...live, chatEnabled: false }, "a", 0)).toMatch(
      /off/,
    );
    expect(
      textBlockedReason({ ...live, isCampaignBattle: true }, "a", 0),
    ).toMatch(/campaign/);
  });

  test("waits for an opponent", () => {
    expect(
      textBlockedReason(
        { ...live, status: "WAITING_FOR_PLAYERS", players: ["a"] },
        "a",
        0,
      ),
    ).toMatch(/opponent joins/);
  });
});

describe("cleanChatText", () => {
  test("collapses whitespace and rejects empty or long text", () => {
    expect(cleanChatText("  hi   there ")).toEqual({
      ok: true,
      text: "hi there",
    });
    expect(cleanChatText("   ").ok).toBe(false);
    expect(cleanChatText("x".repeat(201)).ok).toBe(false);
  });
});

describe("containsContactInfo", () => {
  test.each([
    "https://example.com",
    "www.mysite",
    "find me on tiktok.com",
    "discord.gg/xyz",
    "me@example.com",
    "555-123-4567",
    "(555) 123-4567",
    "+44 7911 123456",
  ])("catches %s", (text) => {
    expect(containsContactInfo(text)).toBe(true);
  });

  test.each([
    "I cast a fireball. Then another!",
    "9999999 damage",
    "Round 3, 2 points",
    "good game.wow",
  ])("allows %s", (text) => {
    expect(containsContactInfo(text)).toBe(false);
  });
});
