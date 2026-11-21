"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "convex/react";
import { ArrowRight, Crown, Swords, Zap } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { useConvexImage } from "@/hooks/useConvexImage";
import { Button } from "@/components/ui/button";
import { CAMPAIGN_TOTAL_OPPONENTS } from "@/lib/campaignStatus";
import { cn } from "@/lib/utils";

type Opponent = Doc<"wizards">;

const TIERS = [
  {
    key: "BEGINNER",
    label: "Apprentices",
    range: "1–3",
    luck: "they roll −2 luck",
    ring: "ring-emerald-400/80",
    pill: "bg-emerald-400/15 text-emerald-300 border-emerald-400/40",
  },
  {
    key: "INTERMEDIATE",
    label: "Adepts",
    range: "4–7",
    luck: "an even fight",
    ring: "ring-sky-400/80",
    pill: "bg-sky-400/15 text-sky-300 border-sky-400/40",
  },
  {
    key: "ADVANCED",
    label: "Archmages",
    range: "8–10",
    luck: "they roll +2 luck",
    ring: "ring-rose-400/80",
    pill: "bg-rose-400/15 text-rose-300 border-rose-400/40",
  },
] as const;

function tierFor(opponent: Opponent) {
  return TIERS.find((t) => t.key === opponent.difficulty) ?? TIERS[1];
}

function Portrait({
  opponent,
  sizes,
  className,
}: {
  opponent: Opponent;
  sizes: string;
  className?: string;
}) {
  const url = useConvexImage(
    api.wizards.getIllustrationUrl,
    // @ts-expect-error - "skip" is a valid Convex query parameter
    opponent.illustration ? { storageId: opponent.illustration } : "skip",
  );
  return (
    <div className={cn("relative overflow-hidden bg-white/5", className)}>
      {url ? (
        <Image
          src={url}
          alt={`Portrait of ${opponent.name}`}
          fill
          sizes={sizes}
          className="object-cover"
          unoptimized
        />
      ) : (
        <div className="absolute inset-0 animate-pulse bg-white/10" />
      )}
    </div>
  );
}

/** Opponents 1–9 as a path of portraits leading to the boss. */
function Ladder({ opponents }: { opponents: Opponent[] }) {
  return (
    <div className="relative -mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-auto md:max-w-5xl md:overflow-visible md:px-0">
      <ol className="relative flex w-max gap-4 md:grid md:w-auto md:grid-cols-9 md:gap-3">
        {/* The path */}
        <li
          aria-hidden
          className="absolute left-10 right-10 top-10 h-1 rounded-full bg-linear-to-r from-emerald-400/60 via-sky-400/60 to-rose-400/70"
        />
        {opponents.map((opponent) => {
          const number = opponent.opponentNumber ?? 0;
          const tier = tierFor(opponent);
          return (
            <li
              key={opponent._id}
              className="relative flex w-20 flex-col items-center gap-2 md:w-auto"
            >
              <div className="relative">
                <Portrait
                  opponent={opponent}
                  sizes="96px"
                  className={cn(
                    "size-20 rounded-full ring-[3px] ring-offset-4 ring-offset-[oklch(0.17_0.05_285)]",
                    tier.ring,
                  )}
                />
                <span className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-white text-xs font-bold text-[oklch(0.2_0.05_285)] shadow">
                  {number}
                </span>
              </div>
              <span className="line-clamp-2 text-center text-xs leading-tight text-white/80">
                {opponent.name}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-center text-xs text-white/50 md:hidden">
        Swipe to see the whole ladder →
      </p>
    </div>
  );
}

/** A low-poly gold d20 with the relic's bonus on its face. */
function RelicDie({ bonus, rolling }: { bonus: number; rolling: boolean }) {
  return (
    <div className="relative flex size-40 shrink-0 items-center justify-center">
      <div
        aria-hidden
        className="animate-rune-pulse absolute inset-2 rounded-full bg-amber-300/40 blur-2xl"
      />
      <div
        className={cn(
          "relative flex size-32 items-center justify-center bg-linear-to-br from-amber-100 via-amber-400 to-amber-700 shadow-2xl shadow-amber-500/60",
          rolling ? "animate-relic-roll" : "opacity-0 motion-reduce:opacity-100",
        )}
        style={{
          clipPath:
            "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)",
        }}
      >
        {/* Facets */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(150deg,rgba(255,255,255,0.55)_0%,transparent_35%),linear-gradient(30deg,transparent_60%,rgba(120,53,15,0.35)_100%)]"
        />
        <div
          aria-hidden
          className="absolute inset-[18%] bg-amber-300/60"
          style={{ clipPath: "polygon(50% 0%, 100% 85%, 0% 85%)" }}
        />
        <span className="relative font-display text-4xl font-bold text-amber-950 [text-shadow:0_1px_0_rgba(255,255,255,0.6)]">
          +{bonus}
        </span>
      </div>
    </div>
  );
}

export default function CampaignShowcase() {
  const opponents = useQuery(api.campaigns.getCampaignOpponents);
  const season = useQuery(api.campaignSeasons.getActiveCampaignSeason);

  // Roll the relic die once the reward panel scrolls into view, then reveal
  // the boosted roll after it lands.
  const relicRef = useRef<HTMLDivElement>(null);
  const [rolling, setRolling] = useState(false);
  const [landed, setLanded] = useState(false);
  useEffect(() => {
    const el = relicRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setRolling(true);
        observer.disconnect();
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!rolling) return;
    const t = setTimeout(() => setLanded(true), 1000);
    return () => clearTimeout(t);
  }, [rolling]);

  const relicName = season?.completionRelic.name ?? "Arcane Mastery";
  const luckBonus = season?.completionRelic.luckBonus ?? 1;
  const boss = opponents?.find(
    (o) => o.opponentNumber === CAMPAIGN_TOTAL_OPPONENTS,
  );
  const path = (opponents ?? []).filter(
    (o) => o.opponentNumber !== CAMPAIGN_TOTAL_OPPONENTS,
  );

  return (
    <section className="relative overflow-hidden bg-[oklch(0.17_0.05_285)] py-14 sm:py-20 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.5_0.22_293/0.35),transparent_60%),radial-gradient(ellipse_at_bottom_right,oklch(0.8_0.15_85/0.18),transparent_55%)]"
      />
      <div className="container relative mx-auto px-4">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-200">
            <Swords className="size-3.5" aria-hidden />
            Single-player campaign
          </span>
          <h2 className="mb-4 font-display text-3xl font-bold sm:text-4xl">
            Beat Ten Wizards. Win a Relic That Makes You{" "}
            <span className="text-gold-gradient">Luckier Forever.</span>
          </h2>
          <p className="text-lg text-white/75">
            No one online? Climb a ladder of AI rivals, each with a personality
            and a spell style to match. Lost a fight? Try again. Each battle
            costs one token.
          </p>
        </div>

        {opponents === undefined ? (
          <div className="mx-auto grid max-w-5xl grid-cols-3 gap-6 sm:grid-cols-5 md:grid-cols-9">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="mx-auto size-20 animate-pulse rounded-full bg-white/10"
              />
            ))}
          </div>
        ) : (
          path.length > 0 && <Ladder opponents={path} />
        )}

        <div className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-2">
          {TIERS.map((tier) => (
            <span
              key={tier.key}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium",
                tier.pill,
              )}
            >
              {tier.range} {tier.label}: {tier.luck}
            </span>
          ))}
        </div>

        {/* Boss → relic */}
        <div
          ref={relicRef}
          className="mx-auto mt-14 max-w-5xl overflow-hidden rounded-3xl border border-amber-300/40 bg-linear-to-br from-[oklch(0.24_0.08_290)] via-[oklch(0.2_0.06_288)] to-amber-300/15 shadow-2xl shadow-amber-500/10">
          <div className="grid items-center gap-8 p-6 sm:p-10 md:grid-cols-[auto_auto_1fr]">
            {boss && (
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="relative">
                  <Portrait
                    opponent={boss}
                    sizes="176px"
                    className="size-36 rounded-2xl ring-4 ring-amber-300 shadow-[0_0_40px_6px] shadow-amber-400/40 sm:size-44"
                  />
                  <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-amber-300 px-2.5 py-0.5 text-xs font-bold text-amber-950 shadow">
                    <Crown className="size-3.5" aria-hidden />
                    Final Boss
                  </span>
                </div>
                <div>
                  <p className="font-display text-lg font-bold">{boss.name}</p>
                  <p className="max-w-48 text-sm italic text-white/70">
                    &ldquo;I was old when your kingdom was young.&rdquo;
                  </p>
                </div>
              </div>
            )}
            <ArrowRight
              className="mx-auto size-8 rotate-90 text-amber-300/70 md:rotate-0"
              aria-hidden
            />
            <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left md:flex-col md:items-start lg:flex-row lg:items-center">
              <RelicDie bonus={luckBonus} rolling={rolling} />
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-amber-200">
                  Defeat the boss to claim
                </p>
                <h3 className="mb-3 font-display text-2xl font-bold sm:text-3xl">
                  The {relicName} Relic
                </h3>
                <p className="mb-4 text-white/80">
                  Every round, both wizards roll a d20 for luck. With the relic,
                  your d20 becomes a{" "}
                  <strong className="text-amber-200">d20+{luckBonus}</strong>.
                  In every duel, forever, friends included.
                </p>
                <p className="inline-flex items-center gap-2 rounded-lg border border-amber-300/50 bg-amber-300/10 px-3 py-1.5 text-sm text-amber-100">
                  You roll 13
                  <ArrowRight className="size-3.5" aria-hidden />
                  <strong
                    className={cn(
                      "inline-block tabular-nums transition-all duration-500",
                      landed && "scale-110 text-amber-200",
                    )}
                  >
                    {landed ? `it counts as ${13 + luckBonus}` : "…"}
                  </strong>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 text-center">
          <Button asChild size="lg" variant="gold" className="text-lg">
            <Link href="/sign-up">
              <Zap aria-hidden="true" />
              Start the Campaign Free
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
