"use client";

import { Sparkles, Wand2 } from "lucide-react";

const MESSAGES = [
  "Summoning your wizard from the astral plane...",
  "Weaving robes of starlight...",
  "Inscribing arcane runes...",
];

const SPARKS = Array.from({ length: 14 }, (_, i) => ({
  left: `${(i * 37 + 11) % 100}%`,
  top: `${(i * 53 + 7) % 100}%`,
  delay: `${(i % 7) * 0.4}s`,
  size: 4 + (i % 3) * 3,
}));

export function WizardConjuringAnimation() {
  return (
    <div
      className="relative w-full h-full bg-arcane flex flex-col items-center justify-center overflow-hidden"
      role="status"
      aria-live="polite"
      aria-label="Conjuring wizard illustration"
    >
      {SPARKS.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white/80 motion-safe:animate-[twinkle_2.8s_ease-in-out_infinite]"
          style={{
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            animationDelay: s.delay,
          }}
        />
      ))}

      <div className="relative w-56 h-56 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-white/60 motion-safe:animate-[rune-spin_12s_linear_infinite]" />
        <div className="absolute inset-6 rounded-full border border-white/40 motion-safe:animate-[rune-spin_8s_linear_infinite_reverse]" />
        <div className="absolute inset-12 rounded-full bg-white/20 blur-xl motion-safe:animate-[rune-pulse_2.5s_ease-in-out_infinite]" />
        <Wand2 className="relative w-16 h-16 text-white drop-shadow-lg motion-safe:animate-[rune-pulse_2.5s_ease-in-out_infinite]" />
        <Sparkles className="absolute top-4 right-6 w-6 h-6 text-yellow-200 motion-safe:animate-[twinkle_1.8s_ease-in-out_infinite]" />
        <Sparkles className="absolute bottom-6 left-6 w-5 h-5 text-yellow-200 motion-safe:animate-[twinkle_2.2s_ease-in-out_infinite]" />
      </div>

      <div className="relative mt-6 h-6 w-full max-w-md text-center text-white/90 text-lg font-medium">
        {MESSAGES.map((m, i) => (
          <span
            key={m}
            className="absolute inset-x-0 opacity-0 motion-safe:animate-[conjure-msg_12s_ease-in-out_infinite]"
            style={{ animationDelay: `${i * 4}s` }}
          >
            {m}
          </span>
        ))}
        <span className="motion-safe:hidden">{MESSAGES[0]}</span>
      </div>
    </div>
  );
}
