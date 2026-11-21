"use client";

import { Check, Paintbrush, Sparkles, Wand2 } from "lucide-react";
import { ConvexImage } from "@/components/ConvexImage";
import { cn } from "@/lib/utils";
import type { PortraitStage } from "../../convex/lib/portrait";

const MESSAGES: Record<PortraitStage, (name: string) => string[]> = {
  sketching: (name) => [
    `Sketching ${name}…`,
    "Choosing robes and colors…",
    "Getting the face just right…",
  ],
  painting: () => [
    "Painting the scene…",
    "Adding magic and lighting…",
    "Final brushstrokes…",
  ],
};

const SPARKS = Array.from({ length: 14 }, (_, i) => ({
  left: `${(i * 37 + 11) % 100}%`,
  top: `${(i * 53 + 7) % 100}%`,
  delay: `${(i % 7) * 0.4}s`,
  size: 4 + (i % 3) * 3,
}));

function Step({
  label,
  state,
  compact,
}: {
  label: string;
  state: "done" | "active" | "waiting";
  compact?: boolean;
}) {
  return (
    <li
      className={cn(
        "flex min-w-0 items-center gap-1.5 rounded-full px-2.5 py-1 font-medium backdrop-blur-sm",
        compact ? "text-[11px]" : "text-sm",
        state === "active" && "bg-white/20 text-white ring-1 ring-white/50",
        state === "done" && "bg-white/10 text-white/80",
        state === "waiting" && "bg-black/20 text-white/50",
      )}
    >
      {state === "done" ? (
        <Check className="size-3.5 shrink-0 text-emerald-300" aria-hidden />
      ) : state === "active" ? (
        <Paintbrush
          className="size-3.5 shrink-0 text-amber-200 motion-safe:animate-pulse"
          aria-hidden
        />
      ) : (
        <span
          className="size-3.5 shrink-0 rounded-full border border-white/40"
          aria-hidden
        />
      )}
      <span className="truncate">{label}</span>
    </li>
  );
}

/**
 * Shown while a wizard's portrait is being generated. Two steps mirror the
 * real job: a plain reference sketch, then the themed scene. When a portrait
 * is being redone, the old one sits blurred behind the animation.
 */
export function PortraitPainting({
  stage,
  name,
  backdropStorageId,
  compact = false,
  className,
}: {
  stage: PortraitStage;
  name: string;
  backdropStorageId?: string;
  compact?: boolean;
  className?: string;
}) {
  const messages = MESSAGES[stage](name);
  const step = stage === "sketching" ? 1 : 2;

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-arcane",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={`Painting ${name}'s portrait, step ${step} of 2: ${messages[0]}`}
    >
      {backdropStorageId && (
        <ConvexImage
          storageId={backdropStorageId}
          alt=""
          width={600}
          height={340}
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-md"
        />
      )}
      <div className="absolute inset-0 bg-linear-to-b from-black/10 via-transparent to-black/40" />

      {SPARKS.map((s, i) => (
        <span
          key={i}
          aria-hidden
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

      <div
        aria-hidden
        className={cn(
          "relative flex items-center justify-center",
          compact ? "size-24" : "size-32 sm:size-52",
        )}
      >
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-white/60 motion-safe:animate-[rune-spin_12s_linear_infinite]" />
        <div
          className={cn(
            "absolute rounded-full border border-white/40 motion-safe:animate-[rune-spin_8s_linear_infinite_reverse]",
            compact ? "inset-3" : "inset-4 sm:inset-6",
          )}
        />
        <div
          className={cn(
            "absolute rounded-full bg-white/20 blur-xl motion-safe:animate-[rune-pulse_2.5s_ease-in-out_infinite]",
            compact ? "inset-6" : "inset-8 sm:inset-12",
          )}
        />
        {stage === "sketching" ? (
          <Wand2
            className={cn(
              "relative text-white drop-shadow-lg motion-safe:animate-[rune-pulse_2.5s_ease-in-out_infinite]",
              compact ? "size-9" : "size-12 sm:size-16",
            )}
          />
        ) : (
          <Paintbrush
            className={cn(
              "relative text-white drop-shadow-lg motion-safe:animate-[rune-pulse_2.5s_ease-in-out_infinite]",
              compact ? "size-9" : "size-12 sm:size-16",
            )}
          />
        )}
        <Sparkles className="absolute right-[12%] top-[8%] size-5 text-yellow-200 motion-safe:animate-[twinkle_1.8s_ease-in-out_infinite]" />
        <Sparkles className="absolute bottom-[12%] left-[10%] size-4 text-yellow-200 motion-safe:animate-[twinkle_2.2s_ease-in-out_infinite]" />
      </div>

      {!compact && (
        <div className="relative mt-4 h-7 w-full max-w-md px-4 text-center text-base font-medium text-white sm:text-lg">
          {messages.map((m, i) => (
            <span
              // Restart the message cycle when the stage changes.
              key={`${stage}-${m}`}
              className="absolute inset-x-0 opacity-0 motion-safe:animate-[conjure-msg_12s_ease-in-out_infinite] motion-reduce:hidden"
              style={{ animationDelay: `${i * 4}s` }}
            >
              {m}
            </span>
          ))}
          <span className="motion-safe:hidden">{messages[0]}</span>
        </div>
      )}

      <ol
        className={cn(
          "relative flex max-w-full justify-center gap-1.5 px-3",
          compact ? "mt-3" : "mt-4",
        )}
      >
        <Step
          label="Sketching"
          state={stage === "sketching" ? "active" : "done"}
          compact={compact}
        />
        <Step
          label={compact ? "Painting" : "Painting the scene"}
          state={stage === "painting" ? "active" : "waiting"}
          compact={compact}
        />
      </ol>

      {!compact && (
        <p className="relative mt-3 text-xs text-white/60">
          This usually takes under a minute. You can leave this page.
        </p>
      )}
    </div>
  );
}
