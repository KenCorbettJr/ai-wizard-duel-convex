"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { Sparkles, Swords } from "lucide-react";
import { DEMO_WIZARDS } from "@/lib/demoWizards";
import { cn } from "@/lib/utils";

const TYPE_MS = 22;
const PAINT_DELAY_MS = 700;
const HOLD_MS = 4500;

const REDUCE_MOTION = "(prefers-reduced-motion: reduce)";
const subscribeReduceMotion = (onChange: () => void) => {
  const mq = window.matchMedia(REDUCE_MOTION);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};

/**
 * Loops through example wizards: a description is typed out, then the AI's
 * portrait fades in. Shows "a few words in, a champion out" at a glance.
 */
export default function HeroWizardCard() {
  // Start on a finished wizard so the card is never empty on first view.
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState(DEMO_WIZARDS[0].description.length);
  const [painted, setPainted] = useState(true);
  const reduceMotion = useSyncExternalStore(
    subscribeReduceMotion,
    () => window.matchMedia(REDUCE_MOTION).matches,
    () => false,
  );

  const current = DEMO_WIZARDS[index];

  useEffect(() => {
    const full = current.description.length;
    if (reduceMotion) {
      const t = setTimeout(
        () => setIndex((i) => (i + 1) % DEMO_WIZARDS.length),
        7000,
      );
      return () => clearTimeout(t);
    }
    if (typed < full) {
      const t = setTimeout(() => setTyped((n) => n + 1), TYPE_MS);
      return () => clearTimeout(t);
    }
    if (!painted) {
      const t = setTimeout(() => setPainted(true), PAINT_DELAY_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setPainted(false);
      setTyped(0);
      setIndex((i) => (i + 1) % DEMO_WIZARDS.length);
    }, HOLD_MS);
    return () => clearTimeout(t);
  }, [typed, painted, current, reduceMotion]);

  // With reduced motion, skip the typing and show each wizard whole.
  const shown = reduceMotion ? current.description.length : typed;
  const isPainted = reduceMotion || painted;
  const previous = (index + DEMO_WIZARDS.length - 1) % DEMO_WIZARDS.length;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-amber-300/40 bg-[oklch(0.17_0.05_285)]/90 text-left shadow-2xl shadow-black/60 backdrop-blur-md"
      aria-label="Example: a short description becomes an AI-generated wizard"
    >
      <div className="p-4">
        <p className="min-h-16 text-sm text-white sm:text-base">
          <span className="font-semibold text-amber-200">You describe:</span>{" "}
          <span className="italic">
            &ldquo;{current.description.slice(0, shown)}
            {shown < current.description.length && (
              <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-amber-200 align-middle" />
            )}
            {shown >= current.description.length && "”"}
          </span>
        </p>
      </div>
      <div className="relative aspect-video bg-black/40">
        {DEMO_WIZARDS.map((wizard, i) => (
          <Image
            key={wizard.image}
            src={wizard.image}
            alt={i === index ? wizard.alt : ""}
            fill
            sizes="(min-width: 1024px) 45vw, 100vw"
            priority={i === 0}
            className={cn(
              "object-cover transition-opacity duration-700",
              i === index && isPainted
                ? "opacity-100"
                : i === previous && !isPainted
                  ? "opacity-40 blur-sm"
                  : "opacity-0",
            )}
          />
        ))}
        {!isPainted && (
          <div className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            <Sparkles
              className="size-3.5 animate-pulse text-amber-300"
              aria-hidden
            />
            Generating your wizard…
          </div>
        )}
      </div>
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 transition-opacity duration-500",
          isPainted ? "opacity-100" : "opacity-0",
        )}
      >
        <div className="min-w-0">
          <p className="font-display text-lg font-bold text-white">
            {current.name}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {current.traits.map((trait) => (
              <span
                key={trait}
                className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-xs text-white/80"
              >
                {trait}
              </span>
            ))}
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-200">
          <Swords className="size-4" aria-hidden />
          Ready to duel
        </span>
      </div>
    </div>
  );
}
