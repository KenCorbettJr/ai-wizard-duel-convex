"use client";

import Link from "next/link";
import { memo, useId, type CSSProperties } from "react";
import {
  AlertTriangle,
  Award,
  Hourglass,
  Scroll,
  Sparkles,
  Swords,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConvexImage } from "@/components/ConvexImage";
import { PortraitPainting } from "@/components/PortraitPainting";
import { usePortraitStage } from "@/hooks/usePortraitStage";
import { cn } from "@/lib/utils";
import type { Id } from "../../convex/_generated/dataModel";

export const CAMPAIGN_OPPONENT_COUNT = 10;
/** Base luck before relic bonuses (shown when the server omits it). */
const BASE_LUCK = 10;

/** Flavor titles earned from multiplayer wins, lowest first. */
const RANKS = [
  { title: "Novice", wins: 0 },
  { title: "Apprentice", wins: 1 },
  { title: "Adept", wins: 3 },
  { title: "Sorcerer", wins: 10 },
  { title: "Archmage", wins: 25 },
] as const;

/** Current rank title and, if any, the next one with wins still needed. */
export function wizardRank(wins: number): {
  title: string;
  next?: { title: string; winsNeeded: number };
  /** 0–1 progress from the current rank to the next (1 at max rank). */
  progress: number;
} {
  let i = 0;
  while (i + 1 < RANKS.length && wins >= RANKS[i + 1].wins) i++;
  const next = RANKS[i + 1];
  return {
    title: RANKS[i].title,
    next: next && { title: next.title, winsNeeded: next.wins - wins },
    progress: next ? (wins - RANKS[i].wins) / (next.wins - RANKS[i].wins) : 1,
  };
}

export interface RosterLiveDuel {
  duelId: Id<"duels">;
  status: "WAITING_FOR_PLAYERS" | "IN_PROGRESS";
  yourTurn: boolean;
  isCampaignBattle: boolean;
}

interface RosterWizardCardProps {
  wizard: {
    _id: Id<"wizards">;
    name: string;
    description?: string;
    illustration?: string;
    illustrationStatus?: "sketching" | "painting" | "failed";
    illustrationRequestedAt?: number;
    wins?: number;
    losses?: number;
    hasCompletionRelic?: boolean;
    effectiveLuckScore?: number;
  };
  /** Opponents defeated in the current campaign season, if started. */
  campaignDefeated?: number;
  /** Most urgent live duel this wizard is in, if any. */
  liveDuel?: RosterLiveDuel;
  /** Load the portrait eagerly (cards in the first screenful). */
  priority?: boolean;
  /** Position in the grid, used to stagger the entrance animation. */
  index?: number;
  /** Reached a new rank since the player's last visit. */
  rankedUp?: boolean;
}

/**
 * Compact, art-first card for the owner's roster on My Wizards. Name, rank
 * and record sit on the portrait so two cards fit side by side on a phone.
 */
export const RosterWizardCard = memo(function RosterWizardCard({
  wizard,
  campaignDefeated,
  liveDuel,
  priority = false,
  index = 0,
  rankedUp = false,
}: RosterWizardCardProps) {
  const portraitStage = usePortraitStage(wizard);
  const wins = wizard.wins ?? 0;
  const losses = wizard.losses ?? 0;
  const duels = wins + losses;
  const winRate = duels > 0 ? Math.round((wins / duels) * 100) : null;
  const relic = !!wizard.hasCompletionRelic;
  const portraitFailed =
    !portraitStage && wizard.illustrationStatus === "failed";
  const yourTurn = !!liveDuel?.yourTurn;
  const liveShort = !liveDuel
    ? null
    : yourTurn
      ? "Turn!"
      : liveDuel.status === "WAITING_FOR_PLAYERS"
        ? "Lobby"
        : "Live";
  const liveLabel = !liveDuel
    ? null
    : yourTurn
      ? "Your turn"
      : liveDuel.status === "WAITING_FOR_PLAYERS"
        ? "Waiting"
        : liveDuel.isCampaignBattle
          ? "In battle"
          : "In duel";
  const rank = wizardRank(wins);
  const nameId = useId();
  const campaignStarted =
    !relic &&
    campaignDefeated !== undefined &&
    campaignDefeated > 0 &&
    campaignDefeated < CAMPAIGN_OPPONENT_COUNT;

  return (
    <article
      aria-labelledby={nameId}
      style={
        { "--rise-delay": `${Math.min(index, 11) * 45}ms` } as CSSProperties
      }
      className={cn(
        "@container group relative flex w-full flex-col overflow-hidden rounded-xl border bg-card shadow-md transition-all duration-200 animate-rise-in",
        "pointer-fine:hover:-translate-y-0.5 pointer-fine:hover:shadow-xl pointer-fine:hover:shadow-primary/20",
        "has-[a[data-overlay]:active]:scale-[0.98]",
        yourTurn
          ? "border-gold ring-2 ring-gold/60 shadow-gold/30"
          : relic
            ? "border-gold/70 ring-1 ring-gold/40"
            : "border-gold/25 pointer-fine:hover:border-primary/50",
      )}
    >
      <Link
        href={`/wizards/${wizard._id}`}
        aria-label={`View ${wizard.name}`}
        data-overlay
        className="absolute inset-0 z-10 rounded-xl focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset"
      />

      {/* Portrait with overlaid name and record */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-arcane">
        {portraitStage ? (
          <PortraitPainting
            stage={portraitStage}
            name={wizard.name}
            backdropStorageId={wizard.illustration}
            compact
            // The step pills don't fit a two-up phone card; the overlay below
            // names the stage instead.
            className="[&_ol]:hidden"
          />
        ) : wizard.illustration ? (
          <ConvexImage
            storageId={wizard.illustration}
            alt=""
            width={480}
            height={600}
            priority={priority}
            sizes="(min-width: 1536px) calc((100vw - 16rem) / 5), (min-width: 1280px) calc((100vw - 16rem) / 4), (min-width: 1024px) calc((100vw - 16rem) / 3), (min-width: 768px) calc((100vw - 16rem) / 2), 50vw"
            className="h-full w-full rounded-none object-cover object-top transition-transform duration-500 pointer-fine:group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span
              aria-hidden="true"
              className="font-display text-5xl font-bold text-white/85 drop-shadow-lg sm:text-6xl"
            >
              {wizard.name.trim().charAt(0).toUpperCase() || "?"}
            </span>
          </div>
        )}

        {/* Top chips */}
        <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between gap-1 text-xs">
          {relic ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 font-bold text-gold-foreground shadow-md">
              <Award className="size-3.5" aria-hidden="true" />
              <span
                className={cn(
                  (liveDuel || portraitFailed) && "hidden @min-[11rem]:inline",
                )}
              >
                Relic{" "}
              </span>
              +1
              <span className="sr-only">
                {" "}
                luck (luck {wizard.effectiveLuckScore ?? BASE_LUCK + 1})
              </span>
            </span>
          ) : campaignStarted ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 font-semibold text-white backdrop-blur-sm">
              <Scroll className="size-3.5" aria-hidden="true" />
              {campaignDefeated}/{CAMPAIGN_OPPONENT_COUNT}
              <span className="sr-only"> campaign foes defeated</span>
            </span>
          ) : (
            <span />
          )}
          {liveDuel ? (
            <span
              className={cn(
                "inline-flex min-w-0 items-center gap-1 rounded-full px-2 py-0.5 font-bold shadow-md",
                yourTurn
                  ? "bg-gold text-gold-foreground"
                  : "bg-black/60 text-white backdrop-blur-sm",
              )}
            >
              {yourTurn ? (
                <Zap
                  className="size-3.5 motion-safe:animate-pulse"
                  aria-hidden="true"
                />
              ) : liveDuel.status === "WAITING_FOR_PLAYERS" ? (
                <Hourglass className="size-3.5" aria-hidden="true" />
              ) : (
                <Swords className="size-3.5" aria-hidden="true" />
              )}
              <span className="hidden truncate @min-[10rem]:inline">
                {liveLabel}
              </span>
              <span aria-hidden="true" className="@min-[10rem]:hidden">
                {liveShort}
              </span>
              <span className="sr-only @min-[10rem]:hidden">{liveLabel}</span>
            </span>
          ) : portraitFailed ? (
            <span className="inline-flex min-w-0 items-center gap-1 rounded-full bg-destructive/90 px-2 py-0.5 font-semibold text-white shadow-md">
              <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="sr-only @min-[10rem]:not-sr-only">
                Art failed
              </span>
            </span>
          ) : duels === 0 && !portraitStage && !liveDuel ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 font-semibold text-primary-foreground shadow-md">
              <Sparkles className="size-3.5" aria-hidden="true" />
              New
            </span>
          ) : null}
        </div>

        {/* Rank-up flourish */}
        {rankedUp && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
          >
            <Sparkles className="animate-twinkle absolute top-[30%] left-[18%] size-5 text-gold" />
            <Sparkles className="animate-twinkle absolute top-[22%] right-[16%] size-4 text-amber-200 [animation-delay:0.6s]" />
            <Sparkles className="animate-twinkle absolute top-[46%] right-[28%] size-3 text-gold [animation-delay:1.2s]" />
          </div>
        )}

        {/* Name, rank and record over a gradient */}
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/90 via-black/70 via-45% to-transparent px-3 pb-2.5",
            portraitStage ? "pt-6" : "pt-8 @min-[13rem]:pt-12",
          )}
        >
          <p
            className={cn(
              "flex items-baseline justify-between gap-2 text-xs [text-shadow:0_1px_2px_rgb(0_0_0/0.85)]",
              portraitStage && "hidden",
            )}
          >
            <span className="sr-only">Rank: </span>
            {rankedUp ? (
              <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-gold px-1 font-bold tracking-wider text-gold-foreground uppercase motion-safe:animate-pulse">
                <span aria-hidden="true">▲</span>
                <span className="sr-only">Ranked up to </span>
                {rank.title}
              </span>
            ) : (
              <span className="shrink-0 font-semibold tracking-wider text-amber-200 uppercase">
                {rank.title}
              </span>
            )}
            {rank.next && (
              <span
                className={cn(
                  "truncate text-white/75",
                  rankedUp && "hidden @min-[13rem]:inline",
                )}
              >
                {rank.next.winsNeeded}
                <span aria-hidden="true" className="@min-[13rem]:hidden">
                  {" "}
                  to go
                </span>
                <span className="sr-only @min-[13rem]:not-sr-only">
                  {" "}
                  {rank.next.winsNeeded === 1 ? "win" : "wins"} to{" "}
                  {rank.next.title}
                </span>
              </span>
            )}
          </p>
          <div
            className={cn(
              "mt-1 mb-1.5 h-1 w-full overflow-hidden rounded-full bg-white/20",
              portraitStage && "hidden",
            )}
            aria-hidden="true"
          >
            <div
              className="h-full rounded-full bg-linear-to-r from-gold to-amber-200 transition-[width] duration-700"
              style={{ width: `${rank.progress * 100}%` }}
            />
          </div>
          {portraitStage && (
            <p className="mb-0.5 text-xs font-semibold text-amber-200">
              {portraitStage === "sketching"
                ? "Sketching portrait…"
                : "Painting the scene…"}
            </p>
          )}
          <h2
            id={nameId}
            className="line-clamp-2 font-display text-base leading-tight font-bold text-white drop-shadow @min-[13rem]:text-lg"
          >
            {wizard.name}
          </h2>
          {wizard.description && !portraitStage && (
            <p className="mt-0.5 hidden text-xs leading-snug text-white/70 italic @min-[13rem]:line-clamp-1 @min-[16rem]:line-clamp-2">
              {wizard.description}
            </p>
          )}
          <p
            className={cn(
              "mt-1 flex items-center gap-2 text-xs font-medium @min-[13rem]:text-sm",
              portraitStage && "hidden",
            )}
          >
            {duels === 0 ? (
              <span className="text-white/80">Awaiting first duel</span>
            ) : (
              <>
                <span className="text-emerald-300">
                  {wins}W<span className="sr-only">ins</span>
                </span>
                <span className="text-rose-300">
                  {losses}L<span className="sr-only">osses</span>
                </span>
                <span className="text-amber-200">
                  {winRate}%<span className="sr-only"> win rate</span>
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="relative z-20 mt-auto flex gap-1.5 p-2">
        {/* One primary action: resume a live duel, else start a new one */}
        <Button
          asChild
          size="sm"
          variant={yourTurn ? "gold" : "default"}
          className="min-w-0 flex-1 gap-1 px-1 text-xs font-semibold has-[>svg]:px-1 @min-[12rem]:px-1.5 @min-[13rem]:text-sm"
        >
          {liveDuel ? (
            <Link
              href={`/duels/${liveDuel.duelId}`}
              aria-label={
                yourTurn
                  ? `Your turn: cast a spell with ${wizard.name}`
                  : liveDuel.status === "WAITING_FOR_PLAYERS"
                    ? `Open ${wizard.name}'s duel lobby`
                    : `Resume ${wizard.name}'s duel`
              }
            >
              {yourTurn ? (
                <Zap className="size-3.5" aria-hidden="true" />
              ) : liveDuel.status === "WAITING_FOR_PLAYERS" ? (
                <Hourglass
                  className="hidden size-3.5 @min-[11rem]:block"
                  aria-hidden="true"
                />
              ) : (
                <Swords
                  className="hidden size-3.5 @min-[11rem]:block"
                  aria-hidden="true"
                />
              )}
              <span className="truncate">
                {yourTurn
                  ? "Cast!"
                  : liveDuel.status === "WAITING_FOR_PLAYERS"
                    ? "Lobby"
                    : "Resume"}
              </span>
            </Link>
          ) : (
            <Link
              href={`/duels/create?wizardId=${wizard._id}`}
              aria-label={`Duel with ${wizard.name}`}
            >
              <Swords className="size-3.5" aria-hidden="true" />
              Duel
            </Link>
          )}
        </Button>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="min-w-0 flex-1 gap-1 px-1 text-xs has-[>svg]:px-1 @min-[12rem]:px-1.5 @min-[13rem]:text-sm"
        >
          <Link
            href={`/campaign/wizard/${wizard._id}`}
            aria-label={
              campaignStarted
                ? `Continue campaign with ${wizard.name}: ${campaignDefeated} of ${CAMPAIGN_OPPONENT_COUNT} foes defeated`
                : `Campaign with ${wizard.name}`
            }
          >
            <Scroll
              className="hidden size-3.5 @min-[12rem]:block"
              aria-hidden="true"
            />
            <span className="truncate">Campaign</span>
          </Link>
        </Button>
      </div>
    </article>
  );
});

/** Skeleton matching RosterWizardCard's shape, for loading states. */
export function RosterWizardCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-gold/20 bg-card">
      <div className="aspect-[4/5] w-full animate-pulse bg-muted" />
      <div className="flex gap-1.5 p-2">
        <div className="h-11 flex-1 animate-pulse rounded-md bg-muted sm:h-9 pointer-coarse:min-h-11" />
        <div className="h-11 flex-1 animate-pulse rounded-md bg-muted sm:h-9 pointer-coarse:min-h-11" />
      </div>
    </div>
  );
}
