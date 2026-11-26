"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Check,
  Flame,
  Clock,
  Copy,
  History,
  Play,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Users,
} from "lucide-react";
import type { Id } from "../../convex/_generated/dataModel";
import { ConvexImage } from "@/components/ConvexImage";
import { OnlookerBadge } from "@/components/arena/OnlookerCount";
import { Crown } from "@/components/ui/crown-icon";
import { useConclusionReveal } from "@/hooks/useConclusionReveal";
import { useReplayProgress } from "@/hooks/useReplayProgress";
import { ownerLabelOf } from "../../convex/lib/wizardNames";
import { cn } from "@/lib/utils";

export interface DuelCardWizard {
  _id: Id<"wizards">;
  name: string;
  illustration?: string;
  owner?: string;
  ownerUserId?: string;
  ownerDisplayName?: string;
}

export interface DuelCardDuel {
  _id: string;
  status: string;
  wizards: Id<"wizards">[];
  players: string[];
  shortcode?: string;
  numberOfRounds: number | "TO_THE_DEATH";
  featuredIllustration?: string;
  currentRound?: number;
  createdAt: number;
  winners?: Id<"wizards">[];
  isCampaignBattle?: boolean;
  forfeitedBy?: Id<"wizards">;
  /** Spells from the first resolved round: a hook that spoils nothing. */
  openings?: Array<{ wizardId: Id<"wizards">; spell: string }>;
  uniqueViewers?: number;
}

/** How long a finished duel counts as "New" to someone who hasn't seen it. */
const NEW_FOR_MS = 48 * 60 * 60 * 1000;
/** Below this, a view count signals an empty room, not a crowd. */
const MIN_VIEWERS_SHOWN = 5;
/** Viewers at which a replay earns a "Popular" pill. */
const POPULAR_MIN = 25;
/** Below this, calling a duel "most watched" overclaims. */
export const MOST_WATCHED_MIN = 10;

/** "3h ago", "2d ago": dates matter less than freshness when browsing. */
export function shortTimeAgo(timestamp: number, now = Date.now()): string {
  const minutes = Math.floor((now - timestamp) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Spectator card for a duel: the round scene is the hero, with a compact
 * matchup row underneath. Finished duels stay spoiler-free unless the viewer
 * fought in it or has already revealed the result.
 */
export function DuelCard({
  duel,
  wizards,
  viewerId,
  showOnlookers = false,
  priority = false,
  featured = false,
}: {
  duel: DuelCardDuel;
  wizards: DuelCardWizard[];
  viewerId?: string;
  showOnlookers?: boolean;
  /** Load the scene eagerly (first cards above the fold). */
  priority?: boolean;
  /** Spotlight layout: scene beside the details when there's room. */
  featured?: boolean;
}) {
  const { revealed } = useConclusionReveal(duel._id);
  const { stored: watchedThrough } = useReplayProgress(duel._id);
  const [copied, setCopied] = useState(false);
  // Read once: freshness labels don't need to tick while the page is open.
  const [now] = useState(() => Date.now());

  const live = duel.status === "IN_PROGRESS";
  const completed = duel.status === "COMPLETED";
  const waiting = duel.status === "WAITING_FOR_PLAYERS";
  const participant = !!viewerId && duel.players.includes(viewerId);
  const showResult = completed && (participant || revealed);
  const winnerIds = showResult ? (duel.winners ?? []) : [];
  const [left, right] = wizards;
  const title = wizards.map((w) => w.name).join(" vs ") || "Duel";
  const viewers = duel.uniqueViewers ?? 0;
  const openings = (duel.openings ?? []).flatMap((o) => {
    const caster = wizards.find((w) => w._id === o.wizardId);
    return caster
      ? [{ ...o, caster, side: caster._id === left?._id ? "left" : "right" }]
      : [];
  });

  const copyShortcode = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!duel.shortcode) return;
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/join/${duel.shortcode}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  return (
    // The link is stretched over the card rather than wrapping it, so the
    // share-code button isn't nested inside a link and the link's name stays
    // short for screen readers.
    <div
      className="@container/card group relative h-full min-w-0 rounded-xl has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-gold"
      data-testid="duel-list-item"
    >
      <article
        className={cn(
          "flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition duration-200",
          "group-hover:-translate-y-0.5 group-hover:border-primary/60 group-hover:shadow-lg group-hover:shadow-primary/15 motion-reduce:transform-none",
          live && "border-destructive/50",
          featured && "@3xl/card:flex-row",
          featured && !live && "border-gold/40",
        )}
      >
        {/* Scene: the hero. Nothing covers the middle of it. */}
        <div
          className={cn(
            // Wider and shorter on phones so more duels fit on a screen.
            "relative aspect-[2/1] shrink-0 overflow-hidden bg-arcane sm:aspect-video",
            featured && "@3xl/card:aspect-[16/10] @3xl/card:w-1/2",
          )}
        >
          {duel.featuredIllustration ? (
            <ConvexImage
              storageId={duel.featuredIllustration}
              alt={`Scene from ${title}`}
              width={800}
              height={450}
              sizes={
                featured
                  ? "(min-width: 768px) 60vw, 100vw"
                  : "(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
              }
              priority={priority}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transform-none"
            />
          ) : (
            <SplitPortraits left={left} right={right} />
          )}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-linear-to-b from-black/60 to-transparent"
          />

          <div className="absolute left-2.5 top-2.5 flex flex-wrap items-center gap-1.5">
            <StatusPill
              duel={duel}
              showResult={showResult}
              participant={participant}
              watchedThrough={watchedThrough}
              now={now}
            />
          </div>
          <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5 [&>*]:border-white/20 [&>*]:bg-black/60 [&>*]:text-white [&>*]:backdrop-blur-sm">
            {/* Only live duels: one presence subscription per card adds up. */}
            {showOnlookers && live && (
              <OnlookerBadge duelId={duel._id as Id<"duels">} />
            )}
          </div>

          {/* Play affordance on hover (pointer devices), clear of the action. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-end justify-end p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-black/55 text-white shadow-lg ring-1 ring-white/30 backdrop-blur-sm">
              <Play className="ml-0.5 size-5 fill-current" />
            </span>
          </div>
        </div>

        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col",
            featured && "@3xl/card:justify-center @3xl/card:py-3",
          )}
        >
          {featured && (
            <p className="mx-3 mt-3 flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-widest text-gold sm:mx-4">
              <Sparkles className="size-3.5" aria-hidden="true" />
              {live
                ? "Happening now"
                : viewers >= MOST_WATCHED_MIN
                  ? "Most watched"
                  : now - duel.createdAt < NEW_FOR_MS
                    ? "Fresh from the arena"
                    : "Featured replay"}
            </p>
          )}
          {/* Matchup */}
          <div className="flex items-center gap-2 px-3 pt-3 sm:px-4">
            <Combatant
              wizard={left}
              align="left"
              large={featured}
              isWinner={!!left && winnerIds.includes(left._id)}
              isLoser={
                !!left && winnerIds.length > 0 && !winnerIds.includes(left._id)
              }
            />
            <span
              aria-hidden="true"
              className="shrink-0 font-display text-sm font-bold text-gold"
            >
              VS
            </span>
            <Combatant
              wizard={right}
              align="right"
              large={featured}
              isWinner={!!right && winnerIds.includes(right._id)}
              isLoser={
                !!right &&
                winnerIds.length > 0 &&
                !winnerIds.includes(right._id)
              }
            />
          </div>

          {/* Every watchable card gets the box, so a missing quote never
              hints that a duel ended in its first round. */}
          {(openings.length > 0 || live || completed) && (
            <div
              className={cn(
                "mx-3 mt-3 rounded-lg bg-muted/40 px-2.5 py-2 sm:mx-4",
                featured && "@3xl/card:mt-4 @3xl/card:px-3 @3xl/card:py-3",
              )}
            >
              <p
                className={cn(
                  "mb-1 text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground",
                  !featured && "sr-only",
                )}
              >
                Opening exchange
              </p>
              {openings.length === 0 && (
                <p className="py-0.5 text-sm italic leading-snug text-muted-foreground">
                  {live
                    ? "The first spells are being cast…"
                    : "Watch it unfold from the first spell."}
                </p>
              )}
              <ul className="space-y-1">
                {openings.map((o) => (
                  <li
                    key={o.wizardId}
                    className={cn(
                      "flex min-w-0 items-start gap-2 border-l-2 pl-2 text-sm leading-snug",
                      featured && "@3xl/card:text-base",
                      o.side === "left" ? "border-gold" : "border-info",
                    )}
                  >
                    {/* The caster's face, not their name: the matchup row
                        above already names them, and the quote gets the room. */}
                    <span className="mt-px size-4.5 shrink-0 overflow-hidden rounded-full bg-muted">
                      {o.caster.illustration && (
                        <ConvexImage
                          storageId={o.caster.illustration}
                          alt=""
                          width={36}
                          height={36}
                          sizes="18px"
                          className="h-full w-full object-cover"
                        />
                      )}
                    </span>
                    <span className="sr-only">{o.caster.name}:</span>
                    <span
                      className={cn(
                        "min-w-0 italic text-foreground/85",
                        featured
                          ? "line-clamp-2"
                          : "line-clamp-2 sm:line-clamp-3",
                      )}
                      title={o.spell}
                    >
                      “{o.spell}”
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* One quiet line of context */}
          <div
            className={cn(
              "mt-auto flex items-end gap-3 px-3 pb-3 pt-2.5 text-xs text-muted-foreground sm:px-4",
              featured && "@3xl/card:mt-4",
            )}
          >
            <div
              className={cn(
                "flex min-w-0 flex-1 items-center gap-x-3 whitespace-nowrap",
                featured ? "flex-wrap gap-y-1" : "overflow-hidden",
              )}
            >
              {duel.numberOfRounds === "TO_THE_DEATH" ? (
                <span className="flex items-center gap-1 rounded-full bg-gold/15 px-1.5 py-0.5 font-semibold text-gold">
                  <Skull className="size-3.5" aria-hidden="true" />
                  To the death
                </span>
              ) : (
                <RoundMarkers
                  total={duel.numberOfRounds as number}
                  filled={
                    live
                      ? Math.max(0, (duel.currentRound ?? 1) - 1)
                      : showResult
                        ? (duel.numberOfRounds as number)
                        : Math.min(
                            watchedThrough ?? 0,
                            duel.numberOfRounds as number,
                          )
                  }
                  live={live}
                />
              )}
              {viewers >= MIN_VIEWERS_SHOWN &&
                !(completed && viewers >= POPULAR_MIN) && (
                  <>
                    <span className="flex items-center gap-1">
                      <Users className="size-3.5" aria-hidden="true" />
                      {viewers.toLocaleString()} viewers
                    </span>
                  </>
                )}
              {/* A live duel's age says nothing useful; its pill has the round. */}
              {!live && (
                <span className="flex items-center gap-1">
                  <Clock className="size-3.5" aria-hidden="true" />
                  {shortTimeAgo(duel.createdAt, now)}
                </span>
              )}
              {wizards.length > 2 && (
                <>
                  <span>+{wizards.length - 2} more wizards</span>
                </>
              )}
            </div>
            {!waiting && duel.status !== "CANCELLED" && (
              <span
                aria-hidden="true"
                className={cn(
                  "flex shrink-0 items-center gap-1 font-semibold transition-colors",
                  featured
                    ? cn(
                        "rounded-full px-4 py-2 text-sm text-white shadow-md transition-transform group-hover:scale-105 motion-reduce:transform-none",
                        live
                          ? "bg-destructive shadow-destructive/30"
                          : "bg-arcane shadow-primary/30",
                      )
                    : cn(
                        "rounded-full px-3 py-1.5 text-xs text-white shadow-sm",
                        live
                          ? "bg-destructive"
                          : "bg-primary group-hover:bg-primary/85",
                      ),
                )}
              >
                <Play
                  className={cn(
                    "fill-current",
                    featured ? "size-3.5" : "size-3",
                  )}
                />
                {live ? "Watch live" : featured ? "Watch replay" : "Watch"}
              </span>
            )}
            {waiting && duel.shortcode && (
              <button
                type="button"
                onClick={copyShortcode}
                className="relative z-10 flex shrink-0 items-center gap-1 rounded bg-primary/12 px-1.5 py-0.5 font-mono text-primary hover:bg-primary/20"
                title="Copy share link"
              >
                {copied ? "Copied!" : duel.shortcode}
                <Copy className="size-3" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </article>
      <Link
        href={`/duels/${duel._id}`}
        aria-label={`${live ? "Watch live" : waiting ? "Open duel" : "Watch replay"}: ${title}`}
        className="absolute inset-0 rounded-xl focus-visible:outline-none"
      />
    </div>
  );
}

function StatusPill({
  duel,
  showResult,
  participant,
  watchedThrough,
  now,
}: {
  duel: DuelCardDuel;
  showResult: boolean;
  participant: boolean;
  watchedThrough: number | null | undefined;
  now: number;
}) {
  const base =
    "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-md backdrop-blur-sm";

  if (duel.status === "IN_PROGRESS") {
    const of =
      typeof duel.numberOfRounds === "number" ? `/${duel.numberOfRounds}` : "";
    return (
      <span className={cn(base, "bg-destructive text-white")}>
        <span className="relative flex size-2" aria-hidden="true">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-75 motion-reduce:hidden" />
          <span className="relative inline-flex size-2 rounded-full bg-white" />
        </span>
        LIVE
        {duel.currentRound ? (
          <span className="font-medium opacity-90">
            · Round {duel.currentRound}
            {of}
          </span>
        ) : null}
      </span>
    );
  }

  if (duel.status === "WAITING_FOR_PLAYERS") {
    return (
      <span className={cn(base, "bg-warning text-warning-foreground")}>
        Waiting for players
      </span>
    );
  }

  if (duel.status === "CANCELLED") {
    return (
      <span className={cn(base, "bg-black/60 text-white/80")}>Cancelled</span>
    );
  }

  if (showResult) {
    return (
      <span className={cn(base, "bg-black/60 text-white")}>
        {participant ? (
          <History className="size-3.5" aria-hidden="true" />
        ) : (
          <Check className="size-3.5" aria-hidden="true" />
        )}
        {participant ? "Your duel" : "Watched"}
        {duel.forfeitedBy && (
          <span className="font-medium opacity-80">· forfeit</span>
        )}
      </span>
    );
  }

  if (watchedThrough && watchedThrough > 0) {
    // No round number: how many rounds a duel lasted can give away a
    // forfeit or a knockout. The replay picks up where the viewer left off.
    return (
      <span className={cn(base, "bg-black/70 text-gold ring-1 ring-gold/50")}>
        <Play className="size-3 fill-current" aria-hidden="true" />
        Continue replay
      </span>
    );
  }

  if (duel.status === "COMPLETED" && (duel.uniqueViewers ?? 0) >= POPULAR_MIN) {
    return (
      <span className={cn(base, "bg-black/60 text-white")}>
        <Flame className="size-3.5 text-gold" aria-hidden="true" />
        Popular · {(duel.uniqueViewers ?? 0).toLocaleString()} watched
      </span>
    );
  }

  // Fresh and unstarted: worth a nudge. Otherwise the scene speaks for itself.
  if (
    watchedThrough === null &&
    duel.status === "COMPLETED" &&
    now - duel.createdAt < NEW_FOR_MS
  ) {
    return (
      <span className={cn(base, "bg-gold text-gold-foreground")}>
        <Sparkles className="size-3.5" aria-hidden="true" />
        New
      </span>
    );
  }
  return null;
}

function Combatant({
  wizard,
  align,
  isWinner,
  isLoser,
  large = false,
}: {
  wizard?: DuelCardWizard;
  align: "left" | "right";
  isWinner: boolean;
  isLoser: boolean;
  large?: boolean;
}) {
  if (!wizard) return <div className="min-w-0 flex-1" />;
  const owner = ownerLabelOf(wizard);
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2",
        align === "right" && "flex-row-reverse text-right",
        isLoser && "opacity-55",
      )}
    >
      <div className="relative shrink-0">
        <div
          className={cn(
            "size-10 overflow-hidden rounded-full bg-muted ring-2 ring-border sm:size-11",
            large && "@3xl/card:size-14",
            isWinner && "ring-gold",
          )}
        >
          {wizard.illustration ? (
            <ConvexImage
              storageId={wizard.illustration}
              alt=""
              width={88}
              height={88}
              sizes="44px"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-arcane text-sm font-bold text-white">
              {wizard.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        {isWinner && (
          <Crown
            aria-hidden="true"
            className="absolute -top-2.5 left-1/2 size-4 -translate-x-1/2 fill-gold text-gold drop-shadow"
          />
        )}
      </div>
      <div className="min-w-0">
        <p
          className={cn(
            // One line keeps every card's rows aligned across the grid.
            "truncate text-sm font-bold leading-tight text-foreground",
            large && "@3xl/card:text-lg",
          )}
          title={wizard.name}
        >
          {wizard.name}
          {isWinner && <span className="sr-only"> (winner)</span>}
        </p>
        {owner && (
          <p
            className={cn(
              "flex items-center gap-1 text-xs text-muted-foreground",
              align === "right" && "justify-end",
            )}
          >
            {owner === "Campaign" && (
              <Shield
                className="size-3 shrink-0 text-gold"
                aria-hidden="true"
              />
            )}
            <span className="truncate">{owner}</span>
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * One diamond per planned round, filled as far as this viewer has watched
 * (or as far as a live duel has got). Planned rounds, never rounds played,
 * so an early finish stays hidden.
 */
function RoundMarkers({
  total,
  filled,
  live,
}: {
  total: number;
  filled: number;
  live: boolean;
}) {
  const shown = Math.min(total, 10);
  const label = live
    ? `Round ${filled + 1} of ${total}`
    : filled > 0
      ? `${filled} of ${total} rounds watched`
      : `${total} rounds`;
  return (
    <span className="flex items-center gap-1.5" title={label}>
      {/* Markers only when there's progress to show; empty ones read as 0/N. */}
      {!(live || filled > 0) && (
        <Swords className="size-3.5" aria-hidden="true" />
      )}
      <span
        className={cn(
          "flex items-center gap-0.5",
          !(live || filled > 0) && "hidden",
        )}
        aria-hidden="true"
      >
        {Array.from({ length: shown }, (_, i) => (
          <span
            key={i}
            className={cn(
              "size-2 rotate-45 rounded-[2px] border",
              i < filled
                ? live
                  ? "border-destructive bg-destructive"
                  : "border-gold bg-gold"
                : i === filled && live
                  ? "animate-pulse border-destructive motion-reduce:animate-none"
                  : "border-muted-foreground/50",
            )}
          />
        ))}
      </span>
      <span>
        {total} rounds<span className="sr-only">. {label}</span>
      </span>
    </span>
  );
}

/** Fallback scene before a round illustration exists: the two portraits. */
function SplitPortraits({
  left,
  right,
}: {
  left?: DuelCardWizard;
  right?: DuelCardWizard;
}) {
  if (!left?.illustration && !right?.illustration) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Swords className="size-14 text-white/70" aria-hidden="true" />
      </div>
    );
  }
  return (
    <div className="grid h-full w-full grid-cols-2">
      {[left, right].map((w, i) => (
        <div key={w?._id ?? i} className="relative overflow-hidden">
          {w?.illustration && (
            <ConvexImage
              storageId={w.illustration}
              alt=""
              width={400}
              height={450}
              sizes="(min-width: 768px) 25vw, 50vw"
              className="h-full w-full object-cover"
            />
          )}
        </div>
      ))}
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 bg-gold/80 shadow-[0_0_16px_var(--gold)]"
      />
    </div>
  );
}

/** Placeholder with the card's own shape, so the grid doesn't jump. */
export function DuelCardSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-xl border bg-card"
      aria-hidden="true"
    >
      <div className="aspect-video animate-pulse bg-muted" />
      <div className="flex items-center gap-2 px-4 pt-3">
        <div className="size-11 animate-pulse rounded-full bg-muted" />
        <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
        <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
        <div className="size-11 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="mx-4 mt-3 h-16 animate-pulse rounded-lg bg-muted/60" />
      <div className="mx-4 mb-3 mt-3 flex justify-between">
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-3 w-12 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
