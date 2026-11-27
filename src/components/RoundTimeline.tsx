"use client";

import { memo, useEffect, useRef } from "react";
import { Crown, Loader2, Clock, Eye } from "lucide-react";
import { Doc, Id } from "../../convex/_generated/dataModel";

interface RoundTimelineProps {
  rounds: Doc<"duelRounds">[];
  wizardIds: Id<"wizards">[];
  currentRound: number;
  wizardNames: [string, string];
  /** Total rounds for fixed-length duels, to show upcoming rounds. */
  totalRounds?: number;
  /**
   * Rounds after this one haven't been watched yet. Their results are hidden
   * and their chips skip ahead instead of jumping.
   */
  revealedThrough?: number;
  onRevealTo?: (roundNumber: number) => void;
}

const fmt = (n: number) => (n > 0 ? `+${n}` : `${n}`);
/** "-35 HP", or a dash when nothing changed ("0 HP" reads as knocked out). */
const hpText = (n: number) => (n === 0 ? "—" : `${fmt(n)} HP`);

/** One chip per round with each wizard's HP change. Chips jump to the round. */
export const RoundTimeline = memo(function RoundTimeline({
  rounds,
  wizardIds,
  currentRound,
  wizardNames,
  totalRounds,
  revealedThrough,
  onRevealTo,
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
  const short = wizardNames.map((n) => n.trim().split(/\s+/)[0] || "?") as [
    string,
    string,
  ];
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
      <ol ref={list} className="relative flex flex-wrap gap-2 pb-1">
        {items.map((r) => {
          const unseen =
            revealedThrough !== undefined && r.roundNumber > revealedThrough;
          const done = r.status === "COMPLETED" && !unseen;
          if (unseen && r.status === "COMPLETED") {
            return (
              <li key={r._id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => onRevealTo?.(r.roundNumber)}
                  aria-label={`Round ${r.roundNumber}, not watched yet. Skip ahead to it`}
                  title="Not watched yet. Skip ahead"
                  className="flex items-center gap-1.5 min-h-8 rounded-full border border-dashed border-border/60 bg-card/60 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground sm:px-3 focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <span className="font-semibold">R{r.roundNumber}</span>
                  <Eye className="h-3 w-3 opacity-60" aria-hidden="true" />
                </button>
              </li>
            );
          }
          const changes = wizardIds
            .slice(0, 2)
            .map((id) => r.outcome?.healthChange?.[id] ?? 0);
          // Who took the round: more points, or (on equal points) less hurt.
          const pts = wizardIds
            .slice(0, 2)
            .map((id) => r.outcome?.pointsAwarded?.[id] ?? 0);
          const roundWinner =
            pts[0] !== pts[1]
              ? pts[0] > pts[1]
                ? 0
                : 1
              : changes[0] !== changes[1]
                ? changes[0] > changes[1]
                  ? 0
                  : 1
                : null;
          const isCurrent = r.roundNumber === currentRound && !done;
          return (
            <li key={r._id} className="shrink-0">
              <button
                type="button"
                title={
                  done
                    ? `${wizardNames[0]} ${hpText(changes[0])}, ${wizardNames[1]} ${hpText(changes[1])}`
                    : undefined
                }
                ref={isCurrent ? currentChip : undefined}
                onClick={() => jump(r.roundNumber)}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`Round ${r.roundNumber}, ${
                  done
                    ? `${roundWinner !== null ? `won by ${wizardNames[roundWinner]}` : "even"}. Health changes: ${wizardNames[0]} ${fmt(changes[0])}, ${wizardNames[1]} ${fmt(changes[1])}`
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
                    {roundWinner !== null ? (
                      <>
                        <Crown
                          className="h-3 w-3 text-gold"
                          aria-hidden="true"
                        />
                        <span className="max-w-[9ch] truncate">
                          {short[roundWinner]}
                        </span>
                        <span>won</span>
                      </>
                    ) : (
                      <span>Even</span>
                    )}
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
