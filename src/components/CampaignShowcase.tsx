"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "convex/react";
import { Crown, Dices, Gem, Swords, Zap } from "lucide-react";
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
    luck: "They roll −2 luck",
    ring: "ring-emerald-400/80",
    pill: "bg-emerald-400/15 text-emerald-300 border-emerald-400/40",
  },
  {
    key: "INTERMEDIATE",
    label: "Adepts",
    range: "4–7",
    luck: "An even fight",
    ring: "ring-sky-400/80",
    pill: "bg-sky-400/15 text-sky-300 border-sky-400/40",
  },
  {
    key: "ADVANCED",
    label: "Archmages",
    range: "8–10",
    luck: "They roll +2 luck",
    ring: "ring-rose-400/80",
    pill: "bg-rose-400/15 text-rose-300 border-rose-400/40",
  },
] as const;

function tierFor(opponent: Opponent) {
  return TIERS.find((t) => t.key === opponent.difficulty) ?? TIERS[1];
}

const FEATURED: Record<number, string> = {
  1: "“I read the manual, I swear!” Nervous and fumbling, he may be his own worst enemy.",
  8: "“Your shadow already works for me.” Distrust any spell that looks too easy.",
  10: "“I was old when your kingdom was young.” The final boss stands between you and the relic.",
};

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

/** The ten-step ladder of opponent portraits ending at the relic. */
function Ladder({ opponents }: { opponents: Opponent[] }) {
  return (
    <ol className="relative mx-auto grid max-w-5xl grid-cols-5 gap-x-2 gap-y-6 sm:gap-x-4 md:grid-cols-10">
      {opponents.map((opponent) => {
        const number = opponent.opponentNumber ?? 0;
        const isBoss = number === CAMPAIGN_TOTAL_OPPONENTS;
        const tier = tierFor(opponent);
        return (
          <li key={opponent._id} className="flex flex-col items-center gap-2">
            <div className="relative">
              <Portrait
                opponent={opponent}
                sizes="80px"
                className={cn(
                  "size-14 rounded-full ring-2 ring-offset-2 ring-offset-[oklch(0.17_0.05_285)] sm:size-16",
                  tier.ring,
                  isBoss &&
                    "ring-[3px] ring-amber-300 shadow-[0_0_24px_4px] shadow-amber-400/50",
                )}
              />
              <span
                className={cn(
                  "absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full text-xs font-bold shadow",
                  isBoss
                    ? "bg-amber-300 text-amber-950"
                    : "bg-white text-[oklch(0.2_0.05_285)]",
                )}
              >
                {isBoss ? <Crown className="size-3.5" aria-hidden /> : number}
              </span>
            </div>
            <span className="line-clamp-2 text-center text-[11px] leading-tight text-white/70 sm:text-xs">
              {opponent.name}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function FeaturedCard({ opponent }: { opponent: Opponent }) {
  const number = opponent.opponentNumber ?? 0;
  const isBoss = number === CAMPAIGN_TOTAL_OPPONENTS;
  const tier = tierFor(opponent);
  return (
    <div
      className={cn(
        "group overflow-hidden rounded-2xl border bg-[oklch(0.21_0.06_288)] shadow-xl",
        isBoss
          ? "border-amber-300/60 shadow-amber-400/20"
          : "border-white/10 shadow-black/30",
      )}
    >
      <div className="relative">
        <Portrait
          opponent={opponent}
          sizes="(min-width: 768px) 33vw, 100vw"
          className="aspect-[4/3] w-full transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-linear-to-t from-[oklch(0.21_0.06_288)] via-transparent to-transparent" />
        <span
          className={cn(
            "absolute left-3 top-3 rounded-full border px-2.5 py-0.5 text-xs font-semibold backdrop-blur-sm",
            isBoss
              ? "border-amber-300/70 bg-amber-300 text-amber-950"
              : tier.pill,
          )}
        >
          {isBoss ? "Final Boss" : `Opponent ${number} · ${tier.label}`}
        </span>
      </div>
      <div className="space-y-2 p-5 pt-1">
        <h3 className="font-display text-xl font-bold text-white">
          {opponent.name}
        </h3>
        <p className="text-sm text-white/70">{FEATURED[number]}</p>
      </div>
    </div>
  );
}

export default function CampaignShowcase() {
  const opponents = useQuery(api.campaigns.getCampaignOpponents);
  const season = useQuery(api.campaignSeasons.getActiveCampaignSeason);

  const relicName = season?.completionRelic.name ?? "Arcane Mastery";
  const luckBonus = season?.completionRelic.luckBonus ?? 1;
  const featured = (opponents ?? []).filter(
    (o) => o.opponentNumber && FEATURED[o.opponentNumber],
  );

  return (
    <section className="relative overflow-hidden bg-[oklch(0.17_0.05_285)] py-20 text-white">
      {/* Ambient glow */}
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
            No friends online? Climb a ladder of AI rivals, from fumbling
            apprentices to an ancient archmage. Each one has a personality and
            casts like it. Lost a fight? Try again. Each battle costs one token.
          </p>
        </div>

        {/* Ladder */}
        {opponents === undefined ? (
          <div className="mx-auto grid max-w-5xl grid-cols-5 gap-4 md:grid-cols-10">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="mx-auto size-14 animate-pulse rounded-full bg-white/10 sm:size-16"
              />
            ))}
          </div>
        ) : (
          opponents.length > 0 && <Ladder opponents={opponents} />
        )}

        {/* Tier legend */}
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

        {/* Featured opponents */}
        {featured.length > 0 && (
          <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
            {featured.map((o) => (
              <FeaturedCard key={o._id} opponent={o} />
            ))}
          </div>
        )}

        {/* The reward */}
        <div className="mx-auto mt-14 max-w-4xl overflow-hidden rounded-3xl border border-amber-300/40 bg-linear-to-br from-amber-300/15 via-[oklch(0.22_0.07_290)] to-[oklch(0.2_0.06_288)] p-6 shadow-2xl shadow-amber-500/10 sm:p-10">
          <div className="flex flex-col items-center gap-8 md:flex-row">
            <div className="relative flex size-32 shrink-0 items-center justify-center">
              <div
                aria-hidden
                className="animate-rune-pulse absolute inset-0 rounded-full bg-amber-300/30 blur-2xl"
              />
              <div className="relative flex size-24 items-center justify-center rounded-full bg-linear-to-b from-amber-200 via-amber-400 to-amber-600 shadow-lg shadow-amber-500/50 ring-4 ring-amber-200/40">
                <Gem className="size-11 text-amber-950" aria-hidden />
              </div>
            </div>
            <div className="text-center md:text-left">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-amber-200">
                Your reward for beating the final boss
              </p>
              <h3 className="mb-3 font-display text-2xl font-bold sm:text-3xl">
                The {relicName} Relic
              </h3>
              <p className="mb-5 text-white/80">
                Every round of every duel, both wizards roll a d20 for luck, and
                the AI factors it into who lands their spell. The relic adds{" "}
                <strong className="text-amber-200">+{luckBonus}</strong> to
                every luck roll your wizard makes, permanently: in friend duels,
                rematches, and every campaign to come.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 text-sm md:justify-start">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-white/70">
                  <Dices className="size-4" aria-hidden />
                  Everyone: d20
                </span>
                <span className="text-white/40" aria-hidden>
                  →
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300/60 bg-amber-300/15 px-3 py-1.5 font-semibold text-amber-100">
                  <Crown className="size-4" aria-hidden />
                  Relic holders: d20 + {luckBonus}
                </span>
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
