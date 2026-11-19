"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { RuneSpinner } from "@/components/ui/rune-spinner";
import { ChevronsRight, Scroll, Sparkles, Swords } from "lucide-react";

let keyboardLast = false;
if (typeof window !== "undefined") {
  window.addEventListener("keydown", () => (keyboardLast = true), true);
  window.addEventListener("pointerdown", () => (keyboardLast = false), true);
}

export type ReplayStep =
  | { kind: "begin" }
  | { kind: "next"; round: number }
  | { kind: "conclusion" }
  | { kind: "writing-conclusion" }
  | { kind: "cast"; round: number; wizardName: string };

interface ReplayNextStepProps {
  step: ReplayStep;
  onContinue: () => void;
  /** Offered while replaying: reveal everything up to the latest round. */
  onSkipToLatest?: () => void;
  skipLabel?: string;
  /** Watched rounds and total, for the progress dots. Total may be unknown. */
  watched: number;
  total?: number;
}

/**
 * The deliberate "what's next" step shown under the round the viewer just
 * watched. Nothing new appears until they choose it.
 */
export function ReplayNextStep({
  step,
  onContinue,
  onSkipToLatest,
  skipLabel = "Skip to the latest round",
  watched,
  total,
}: ReplayNextStepProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Keep keyboard focus moving forward: when the round the viewer just
  // advanced to finishes, focus lands on the next step.
  const stepKey = JSON.stringify(step);
  useEffect(() => {
    const active = document.activeElement;
    // Move focus only from places that have nothing left to do: the page,
    // a round card itself, or the Skip button that just finished the reveal.
    // Never from audio or other controls the viewer is using.
    const idle =
      !active ||
      active === document.body ||
      (active instanceof HTMLElement &&
        (/^round-\d+$/.test(active.id) ||
          active.hasAttribute("data-reveal-skip")));
    if (idle) {
      focusedAt.current = Date.now();
      // Keyboard users need to see where focus went; pointer users keep
      // their scroll position.
      buttonRef.current?.focus({ preventScroll: !keyboardLast });
    }
  }, [stepKey]);

  // The inline step can end up below the fold (long rounds on phones). Offer
  // the same action in a bar pinned to the bottom until it scrolls into view.
  const sectionRef = useRef<HTMLElement>(null);
  const [inlineVisible, setInlineVisible] = useState(true);
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setInlineVisible(entry.isIntersecting),
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  // A key press that moved focus here shouldn't also activate the button.
  const focusedAt = useRef(0);
  const handleContinue = () => {
    if (Date.now() - focusedAt.current < 350) return;
    onContinue();
  };
  if (step.kind === "writing-conclusion") {
    return (
      <div
        role="status"
        className="mt-2 flex items-center justify-center gap-3 rounded-xl border border-border/50 bg-card/80 p-5 text-muted-foreground animate-in fade-in duration-500 motion-reduce:animate-none"
      >
        <RuneSpinner size="sm" label="Writing the conclusion" />
        The Arcane Arbiter is writing the conclusion...
      </div>
    );
  }

  const { title, hint, label, Icon } =
    step.kind === "begin"
      ? {
          title: "The combatants are ready",
          hint: "Watch the duel unfold one round at a time.",
          label: "Begin Round 1",
          Icon: Swords,
        }
      : step.kind === "next"
        ? {
            title: `Round ${step.round} awaits`,
            hint: "Take your time. The next round starts when you're ready.",
            label: `Continue to Round ${step.round}`,
            Icon: ChevronsRight,
          }
        : step.kind === "conclusion"
          ? {
              title: "The final blow has landed",
              hint: "Only the ending remains.",
              label: "Reveal how it ends",
              Icon: Scroll,
            }
          : {
              title: `Round ${step.round} is yours to shape`,
              hint: `When you've taken in the last round, write ${step.wizardName}'s next move.`,
              label: `Cast your spell for Round ${step.round}`,
              Icon: Sparkles,
            };

  const dots =
    typeof total === "number" && total > 0 && total <= 12
      ? Array.from({ length: total }, (_, i) => i < watched)
      : null;

  return (
    <>
      <section
        ref={sectionRef}
        aria-label="Next step"
        className="mt-2 flex flex-col items-center gap-3 rounded-xl border border-primary/30 bg-card/90 px-4 py-6 text-center shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-bottom-3 duration-500 motion-reduce:animate-none"
      >
        {dots && (
          <ol
            className="flex gap-1.5"
            aria-label={`${watched} of ${total} rounds watched`}
          >
            {dots.map((seen, i) => (
              <li
                key={i}
                className={`h-1.5 w-6 rounded-full ${seen ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </ol>
        )}
        <h3 className="font-display text-xl font-bold text-foreground">
          {title}
        </h3>
        <p className="max-w-sm text-sm text-muted-foreground">{hint}</p>
        <Button
          size="lg"
          ref={buttonRef}
          onClick={handleContinue}
          className="reveal-cta min-h-12 rounded-full px-6 text-base"
        >
          <Icon className="mr-2 h-5 w-5" aria-hidden="true" />
          {label}
        </Button>
        {onSkipToLatest && (
          <button
            type="button"
            onClick={onSkipToLatest}
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:underline"
          >
            {skipLabel}
          </button>
        )}
      </section>
      {!inlineVisible && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:left-64 animate-in fade-in slide-in-from-bottom-4 duration-300 motion-reduce:animate-none">
          <Button
            size="lg"
            tabIndex={-1}
            aria-hidden="true"
            onClick={onContinue}
            className="pointer-events-auto min-h-12 rounded-full px-6 text-base shadow-xl"
          >
            <Icon className="mr-2 h-5 w-5" aria-hidden="true" />
            {label}
          </Button>
        </div>
      )}
    </>
  );
}
