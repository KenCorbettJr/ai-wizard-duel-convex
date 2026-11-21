"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Sparkles } from "lucide-react";
import { HERO_ROUNDS as SPELLS_B } from "@/lib/demoRound";
import { cn } from "@/lib/utils";

const TYPE_MS = 18;
const PAINT_DELAY_MS = 500;
const HOLD_MS = 4200;

/**
 * Loops through the demo round: a spell is typed out, then the AI's painting
 * and verdict fade in. Shows "words in, painting out" at a glance.
 */
export default function HeroSpellCard() {
  // Start on a finished round so the card is never empty on first view.
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState(SPELLS_B[0].spell.length);
  const [painted, setPainted] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);

  const current = SPELLS_B[index];

  useEffect(() => {
    setReduceMotion(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }, []);

  useEffect(() => {
    const full = current.spell.length;
    if (reduceMotion) {
      const t = setTimeout(() => setIndex((i) => (i + 1) % SPELLS_B.length), 7000);
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
      setIndex((i) => (i + 1) % SPELLS_B.length);
    }, HOLD_MS);
    return () => clearTimeout(t);
  }, [typed, painted, current, reduceMotion]);

  // With reduced motion, skip the typing and show each result whole.
  const shown = reduceMotion ? current.spell.length : typed;
  const isPainted = reduceMotion || painted;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-amber-300/40 bg-[oklch(0.17_0.05_285)]/90 text-left shadow-2xl shadow-black/60 backdrop-blur-md"
      aria-label="Example round: a typed spell becomes an AI-painted scene"
    >
      <div className="space-y-2 p-4">
        <p className="text-sm text-white/75">
          <span className="font-semibold text-sky-300">Rival cast:</span>{" "}
          <span className="italic">{current.rival}</span>
        </p>
        <p className="min-h-12 text-sm text-white sm:text-base">
          <span className="font-semibold text-amber-200">You cast:</span>{" "}
          <span className="italic">
            &ldquo;{current.spell.slice(0, shown)}
            {shown < current.spell.length && (
              <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-amber-200 align-middle" />
            )}
            {shown >= current.spell.length && "”"}
          </span>
        </p>
      </div>
      <div className="relative aspect-video bg-black/40">
        {SPELLS_B.map((option, i) => (
          <Image
            key={option.image}
            src={option.image}
            alt={i === index ? option.alt : ""}
            fill
            sizes="(min-width: 1024px) 45vw, 100vw"
            priority={i === 0}
            className={cn(
              "object-cover transition-opacity duration-700",
              i === index && isPainted
                ? "opacity-100"
                : i === (index + SPELLS_B.length - 1) % SPELLS_B.length &&
                    !isPainted
                  ? "opacity-60"
                  : "opacity-0",
            )}
          />
        ))}
        {!isPainted && (
          <div className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            <Sparkles className="size-3.5 animate-pulse text-amber-300" aria-hidden />
            Painting the next round…
          </div>
        )}
      </div>
      <p
        className={cn(
          "px-4 py-3 text-sm font-semibold transition-colors duration-500",
          isPainted ? "text-amber-200" : "text-white/60",
        )}
      >
        {isPainted ? current.verdict : "The AI is judging…"}
      </p>
    </div>
  );
}
