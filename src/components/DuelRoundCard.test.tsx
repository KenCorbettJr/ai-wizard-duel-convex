import { StrictMode } from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Doc, Id } from "../../convex/_generated/dataModel";

vi.mock("@clerk/nextjs", () => ({ useUser: () => ({ user: null }) }));
vi.mock("convex/react", () => ({
  useQuery: () => undefined,
  useMutation: () => vi.fn(),
}));
vi.mock("@/hooks/useConclusionReveal", () => ({
  useConclusionReveal: () => ({ revealed: true, reveal: vi.fn() }),
}));
vi.mock("@/components/ConvexImage", () => ({ ConvexImage: () => null }));
vi.mock("@/components/SpellReactions", () => ({ SpellReactions: () => null }));

import { DuelRoundCard } from "./DuelRoundCard";

const w1 = "w1" as Id<"wizards">;
const w2 = "w2" as Id<"wizards">;
const wizard = (id: Id<"wizards">, name: string) =>
  ({ _id: id, name, owner: `owner-${id}` }) as unknown as Doc<"wizards">;

const duel = {
  _id: "d1",
  wizards: [w1, w2],
  players: ["owner-w1", "owner-w2"],
  status: "IN_PROGRESS",
  hitPoints: {},
  points: {},
} as unknown as Doc<"duels">;

const round = {
  _id: "r2",
  _creationTime: 0,
  duelId: "d1",
  roundNumber: 2,
  type: "SPELL_CASTING",
  status: "COMPLETED",
  spells: {
    [w1]: { description: "Fireball", castBy: w1, timestamp: 1 },
    [w2]: { description: "Ice wall", castBy: w2, timestamp: 2 },
  },
  outcome: { narrative: "Steam fills the arena.", result: "A draw." },
} as unknown as Doc<"duelRounds">;

describe("DuelRoundCard reveal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Element.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => vi.useRealTimers());

  // The page mounts a newly resolved round with its reveal token already set.
  // Strict Mode then runs the effects twice, which must not strand the reveal.
  it("finishes a reveal that starts on mount under Strict Mode", async () => {
    const onRevealComplete = vi.fn();
    render(
      <StrictMode>
        <DuelRoundCard
          round={round}
          duel={duel}
          wizard1={wizard(w1, "Merlin")}
          wizard2={wizard(w2, "Morgana")}
          revealToken={123}
          onRevealComplete={onRevealComplete}
        />
      </StrictMode>,
    );
    expect(screen.getByText("Skip")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(screen.queryByText("Skip")).not.toBeInTheDocument();
    expect(onRevealComplete).toHaveBeenCalledWith(2);
  });
});
