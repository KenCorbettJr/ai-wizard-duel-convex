"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RoundStageProps {
  /** "Round 3", "Conclusion"… */
  label: string;
  /** "of 5", when the duel has a fixed length. */
  sublabel?: string;
  onPrev?: () => void;
  prevLabel?: string;
  onNext?: () => void;
  nextLabel?: string;
  /** Changes whenever a different round goes on the stage. */
  transitionKey: string | number;
  /** 1 when moving forward, -1 when going back. */
  direction: 1 | -1;
  /** Shown under the round label, e.g. a switch to the full-page view. */
  extra?: ReactNode;
  children: ReactNode;
}

/** Ignore keys and swipes aimed at something that handles its own. */
function ownsInput(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el?.closest?.(
    "input, textarea, select, [contenteditable], [role=dialog], [role=slider], [role=radiogroup], [role=tablist], [data-no-swipe]",
  );
}

/**
 * One round at a time. Arrows (or the arrow keys, or a swipe on a phone)
 * move between rounds, and each new round slides in from that side.
 */
export function RoundStage({
  label,
  sublabel,
  onPrev,
  prevLabel = "Previous round",
  onNext,
  nextLabel = "Next round",
  transitionKey,
  direction,
  extra,
  children,
}: RoundStageProps) {
  const nav = useRef({ onPrev, onNext });
  useEffect(() => {
    nav.current = { onPrev, onNext };
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (ownsInput(e.target)) return;
      if (document.querySelector('[role="dialog"]')) return;
      const go =
        e.key === "ArrowLeft" ? nav.current.onPrev : nav.current.onNext;
      if (!go) return;
      e.preventDefault();
      go();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1 || ownsInput(e.target)) {
      touch.current = null;
      return;
    }
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    // A deliberate sideways swipe, not a scroll that drifted.
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0) nav.current.onNext?.();
    else nav.current.onPrev?.();
  };

  return (
    <section
      aria-label="Duel rounds"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="mb-3 grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={!onPrev}
          aria-label={prevLabel}
          title={prevLabel}
          className="min-h-10 min-w-10"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Back</span>
        </Button>
        <div className="min-w-0 text-center">
          <p
            className="font-display text-lg font-semibold text-foreground"
            aria-live="polite"
          >
            {label}
            {sublabel && (
              <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                {sublabel}
              </span>
            )}
          </p>
          {extra}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={!onNext}
          aria-label={nextLabel}
          title={nextLabel}
          className="min-h-10 min-w-10"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      <div
        key={transitionKey}
        className={`animate-in fade-in duration-300 motion-reduce:animate-none ${
          direction > 0 ? "slide-in-from-right-8" : "slide-in-from-left-8"
        }`}
      >
        {children}
      </div>
    </section>
  );
}
