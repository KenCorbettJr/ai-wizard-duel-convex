import { describe, it, expect } from "vitest";
import { describeTurn } from "./DuelScoreboard";
import type { Id } from "../../convex/_generated/dataModel";

const a = "a" as Id<"wizards">;
const b = "b" as Id<"wizards">;
const nameOf = (id: Id<"wizards">) => (id === a ? "Merlin" : "Morgana");

describe("describeTurn", () => {
  const base = { wizardIds: [a, b], nameOf };

  it("prompts the player whose action is still needed", () => {
    const t = describeTurn({
      ...base,
      duelStatus: "IN_PROGRESS",
      roundStatus: "WAITING_FOR_SPELLS",
      userWizardId: a,
      needActionsFrom: [a, b],
    });
    expect(t.tone).toBe("action");
    expect(t.text).toContain("Your move");
  });

  it("tells a submitted player who they are waiting on", () => {
    const t = describeTurn({
      ...base,
      duelStatus: "IN_PROGRESS",
      roundStatus: "WAITING_FOR_SPELLS",
      userWizardId: a,
      needActionsFrom: [b],
    });
    expect(t.tone).toBe("waiting");
    expect(t.text).toContain("Morgana");
  });

  it("names who spectators are waiting on", () => {
    const t = describeTurn({
      ...base,
      duelStatus: "IN_PROGRESS",
      roundStatus: "WAITING_FOR_SPELLS",
      needActionsFrom: [b],
    });
    expect(t.text).toContain("Morgana");
  });

  it("reports processing and completion without naming a winner", () => {
    expect(
      describeTurn({
        ...base,
        duelStatus: "IN_PROGRESS",
        roundStatus: "PROCESSING",
        needActionsFrom: [],
      }).tone,
    ).toBe("busy");
    expect(
      describeTurn({ ...base, duelStatus: "COMPLETED", needActionsFrom: [] })
        .text,
    ).toBe("Duel complete");
  });
});
