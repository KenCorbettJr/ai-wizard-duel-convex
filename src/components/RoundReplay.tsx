"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Dices, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SPELL_A, SPELLS_B, type Score } from "@/lib/demoRound";
import { savePendingSpell } from "@/lib/pendingSpell";

function ScoreRow({
  label,
  score,
  highlight,
}: {
  label: string;
  score: Score;
  highlight: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg px-3 py-2 text-sm",
        highlight
          ? "bg-amber-300/15 ring-1 ring-amber-300/50"
          : "bg-white/5 ring-1 ring-white/10",
      )}
    >
      <span className="font-semibold text-white">{label}</span>
      <span className="flex items-center gap-3 text-white/75 tabular-nums">
        <span>
          Creativity <b className="text-white">{score.creativity}</b>
        </span>
        <span>
          Strategy <b className="text-white">{score.strategy}</b>
        </span>
        <span className="inline-flex items-center gap-1">
          <Dices className="size-3.5" aria-hidden />
          <b className="text-white">{score.luck}</b>
        </span>
      </span>
    </div>
  );
}

const EXAMPLE_SPELL = "A swarm of fireflies that spell out “missed me”";

export default function RoundReplay() {
  const router = useRouter();
  const [choice, setChoice] = useState(0);
  const [ownSpell, setOwnSpell] = useState("");
  const [expanded, setExpanded] = useState(false);
  const picked = SPELLS_B[choice];
  const total = (s: Score) => s.creativity + s.strategy;
  const bWins = total(picked.b) >= total(picked.a);

  return (
    <div className="dark mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-x-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 lg:col-start-1">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-sky-300">
          Your rival cast, in secret
        </p>
        <p className="italic text-white">&ldquo;{SPELL_A}&rdquo;</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 lg:col-start-1">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-amber-200">
          Pick your counter
        </p>
        <div
          role="radiogroup"
          aria-label="Your counter spell"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 lg:flex-col"
        >
          {SPELLS_B.map((option, i) => (
            <button
              key={option.spell}
              type="button"
              role="radio"
              aria-checked={choice === i}
              onClick={() => setChoice(i)}
              className={cn(
                "shrink-0 rounded-xl border px-4 py-2.5 text-left transition-all lg:w-full lg:py-3",
                choice === i
                  ? "border-amber-300 bg-amber-300/10 text-white shadow-[0_0_20px_-6px] shadow-amber-300/60"
                  : "border-white/15 bg-white/[0.03] text-white hover:border-amber-300/60 hover:bg-white/5",
              )}
            >
              <span className="block whitespace-nowrap text-sm font-semibold">
                {option.short}
              </span>
              <span className="hidden text-sm italic text-white/80 lg:block">
                &ldquo;{option.spell}&rdquo;
              </span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm italic text-white/80 lg:hidden">
          &ldquo;{picked.spell}&rdquo;
        </p>
      </div>

      <div
        aria-live="polite"
        className="overflow-hidden rounded-2xl border border-amber-300/50 bg-[oklch(0.2_0.06_288)] shadow-2xl shadow-black/40 lg:col-start-2 lg:row-span-3 lg:row-start-1"
      >
        <div className="relative aspect-video">
          {SPELLS_B.map((option, i) => (
            <Image
              key={option.image}
              src={option.image}
              alt={option.alt}
              fill
              sizes="(min-width: 1024px) 60vw, 100vw"
              className={cn(
                "object-cover transition-opacity duration-500",
                i === choice ? "opacity-100" : "opacity-0",
              )}
              priority={i === 0}
            />
          ))}
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            <Sparkles className="size-3.5 text-amber-300" aria-hidden />
            Painted by the AI for this round
          </span>
        </div>
        <div className="space-y-4 p-4 sm:p-5">
          <div>
            <p
              className={cn(
                "text-white/85",
                !expanded && "line-clamp-3 lg:line-clamp-none",
              )}
            >
              {picked.narration}
            </p>
            {!expanded && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="mt-1 text-sm font-semibold text-amber-200 underline underline-offset-4 lg:hidden"
              >
                Read the whole round
              </button>
            )}
          </div>
          <div className="space-y-2">
            <ScoreRow label="Your rival" score={picked.a} highlight={!bWins} />
            <ScoreRow label="You" score={picked.b} highlight={bWins} />
          </div>
          <p className="text-sm font-semibold text-amber-200">
            {picked.verdict}
          </p>
          <p className="text-xs text-white/50">
            Illustrative example. Every real duel is different.
          </p>
        </div>
      </div>

      <form
        className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 lg:col-start-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (!ownSpell.trim()) {
            // Hand them a starting idea to edit rather than a dead button.
            setOwnSpell(EXAMPLE_SPELL);
            document.getElementById("own-spell")?.focus();
            return;
          }
          savePendingSpell(ownSpell);
          router.push("/sign-up");
        }}
      >
        <label
          htmlFor="own-spell"
          className="mb-2 block text-sm font-semibold text-white"
        >
          Or write your own counter
        </label>
        <textarea
          id="own-spell"
          value={ownSpell}
          onChange={(e) => setOwnSpell(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder={`${EXAMPLE_SPELL}…`}
          className="w-full resize-none rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-base text-white placeholder:text-white/40 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300/40"
        />
        <Button type="submit" variant="gold" className="mt-3 w-full">
          <Wand2 aria-hidden="true" />
          Cast It Free
        </Button>
        <p className="mt-2 text-xs text-white/50">
          Free account, no card. We&apos;ll keep your spell ready for your first
          duel.
        </p>
      </form>
    </div>
  );
}
