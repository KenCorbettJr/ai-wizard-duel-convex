"use client";

import { memo, useEffect, useRef } from "react";
import { Check, Loader2, Clock } from "lucide-react";
import { Doc, Id } from "../../convex/_generated/dataModel";

interface RoundTimelineProps {
  rounds: Doc<"duelRounds">[];
  wizardIds: Id<"wizards">[];
  currentRound: number;
  wizardNames: [string, string];
  /** Total rounds for fixed-length duels, to show upcoming rounds. */
  totalRounds?: number;
}

const fmt = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** One chip per round with each wizard's HP change. Chips jump to the round. */
export const RoundTimeline = memo(function RoundTimeline({
  rounds,
  wizardIds,
  currentRound,
  wizardNames,
  totalRounds,
}: RoundTimelineProps) {
  const currentChip = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => {
    // Scroll only the chip strip, never the page.
    const chip = currentChip.current;
    const ol = list.current;
    if (!chip || !ol) return;
    ol.scrollTo({
      left: chip.offsetLeft - ol.clientWidth / 2 + chip.clientWidth / 2,
    });
  }, [currentRound, rounds.length]);
  const items = rounds
    .filter((r) => r.roundNumber > 0 && r.type !== "CONCLUSION")
    .sort((a, b) => a.roundNumber - b.roundNumber);
  if (items.length < 1 && totalRounds === undefined) return null;
  const short = wizardNames.map(
    (n) => n.trim().split(/\s+/)[0].slice(0, 6) || "?",
  ) as [string, string];
  if (short[0].toLowerCase() === short[1].toLowerCase()) {
    short[0] = "P1";
    short[1] = "P2";
  }
  const upcoming =
    typeof totalRounds === "number" && totalRounds <= 12
      ? Array.from(
          { length: Math.max(0, totalRounds - items.length) },
          (_, i) => (items[items.length - 1]?.roundNumber ?? 0) + 1 + i,
        )
      : [];

  const jump = (n: number) => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    window.dispatchEvent(
      new CustomEvent("duel-expand-round", { detail: { roundNumber: n } }),
    );
    // Let a collapsed round expand first, so the scroll target doesn't move.
    setTimeout(() => {
      document.getElementById(`round-${n}`)?.scrollIntoView({
        behavior: reduce ? "auto" : "smooth",
        block: "start",
      });
    }, 120);
  };

  return (
    <nav aria-label="Round timeline" className="mt-3">
      <ol ref={list} className="relative flex gap-2 overflow-x-auto pb-1">
        {items.map((r) => {
          const done = r.status === "COMPLETED";
          const changes = wizardIds
            .slice(0, 2)
            .map((id) => r.outcome?.healthChange?.[id] ?? 0);
          const isCurrent = r.roundNumber === currentRound && !done;
          return (
            <li key={r._id} className="shrink-0">
              <button
                type="button"
                ref={isCurrent ? currentChip : undefined}
                onClick={() => jump(r.roundNumber)}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`Round ${r.roundNumber}, ${
                  done
                    ? `complete. Health changes: ${wizardNames[0]} ${fmt(changes[0])}, ${wizardNames[1]} ${fmt(changes[1])}`
                    : r.status === "PROCESSING"
                      ? "being resolved"
                      : "waiting for actions"
                }`}
                className={`flex items-center gap-1.5 min-h-8 rounded-full border px-2.5 py-1 text-xs transition-colors sm:px-3 sm:py-1 focus-visible:ring-2 focus-visible:ring-primary/50 ${
                  isCurrent
                    ? "border-primary bg-primary/10 font-semibold text-foreground"
                    : "border-border/60 bg-card/80 text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="font-semibold">R{r.roundNumber}</span>
                {done ? (
                  <>
                    <Check
                      className="h-3 w-3 text-success"
                      aria-hidden="true"
                    />
                    <span>
                      {short[0]} {fmt(changes[0])} · {short[1]}{" "}
                      {fmt(changes[1])}
                    </span>
                  </>
                ) : r.status === "PROCESSING" ? (
                  <Loader2
                    className="h-3 w-3 animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                ) : (
                  <Clock className="h-3 w-3" aria-hidden="true" />
                )}
              </button>
            </li>
          );
        })}
        {totalRounds === undefined && (
          <li
            aria-hidden="true"
            className="shrink-0 rounded-full border border-dashed border-border/60 px-3 py-1 text-xs text-muted-foreground/70"
          >
            to the death…
          </li>
        )}
        {upcoming.map((n) => (
          <li
            key={`upcoming-${n}`}
            className="shrink-0 rounded-full border border-dashed border-border/60 px-3 py-1 text-xs text-muted-foreground/70"
          >
            <span className="sr-only">Upcoming round </span>R{n}
          </li>
        ))}
      </ol>
    </nav>
  );
});
