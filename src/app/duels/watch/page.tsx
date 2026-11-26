"use client";

import { Suspense, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { DuelListItem } from "@/components/DuelListItem";
import { Button } from "@/components/ui/button";
import { Eye, Layers, Radio, Shield, Swords, Users } from "lucide-react";
import Link from "next/link";
import { DuelCardSkeleton, MOST_WATCHED_MIN } from "@/components/DuelCard";
import { cn } from "@/lib/utils";
import { hasStartedReplay } from "@/hooks/useReplayProgress";
import { RuneSpinner } from "@/components/ui/rune-spinner";
import { PageHeader } from "@/components/PageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DuelKind = "all" | "live" | "players" | "campaign";

const KINDS: Array<{ value: DuelKind; label: string; icon: typeof Eye }> = [
  { value: "all", label: "All", icon: Layers },
  { value: "live", label: "Live", icon: Radio },
  { value: "players", label: "PvP", icon: Users },
  { value: "campaign", label: "Campaign", icon: Shield },
];

const EMPTY_MESSAGE: Record<DuelKind, string> = {
  all: "No duels to watch yet. Start one and give the crowd a show!",
  live: "Nobody is dueling right now. Catch up on a replay, or start a duel of your own.",
  players:
    "No player duels yet. Challenge a friend and give the crowd something to watch!",
  campaign:
    "Nobody has taken on the campaign wizards yet. Be the first to try!",
};

const PAGE_SIZE = 12;
const GRID = "grid grid-cols-1 gap-5 @2xl:grid-cols-2 @5xl:grid-cols-3";

const ANY_OPPONENT = "any";

function isDuelKind(value: string | null): value is DuelKind {
  return (
    value === "all" ||
    value === "live" ||
    value === "players" ||
    value === "campaign"
  );
}

export default function WatchDuelsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen py-24 text-center">
          <RuneSpinner size="md" label="Loading…" />
        </div>
      }
    >
      <WatchDuelsContent />
    </Suspense>
  );
}

function WatchDuelsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // The list grows in place: "Show more" raises the limit instead of paging.
  const [limit, setLimit] = useState(PAGE_SIZE);

  // Filters live in the URL so campaign pages can link straight to them.
  const opponentParam = searchParams.get("opponent");
  const kindParam = searchParams.get("kind");
  const kind: DuelKind = opponentParam
    ? "campaign"
    : isDuelKind(kindParam)
      ? kindParam
      : "all";

  const opponents = useQuery(api.campaigns.getCampaignOpponents);
  const opponent = opponentParam
    ? opponents?.find((o) => o._id === opponentParam)
    : undefined;
  // Wait for the opponent list before querying, so a stale or mistyped link
  // falls back to all campaign battles instead of failing validation.
  const waitingForOpponent = !!opponentParam && opponents === undefined;

  const result = useQuery(
    api.duels.getWatchableDuels,
    waitingForOpponent
      ? "skip"
      : {
          limit,
          offset: 0,
          kind,
          opponentId: opponent?._id as Id<"wizards"> | undefined,
        },
  );
  // Keep the last results on screen while the next ones load: as-is when
  // "Show more" grows the list, dimmed when the filter changed.
  const filterKey = `${kind}:${opponentParam ?? ""}`;
  const [shown, setShown] = useState<{
    key: string;
    result: NonNullable<typeof result>;
  }>();
  if (result !== undefined && result !== shown?.result) {
    setShown({ key: filterKey, result });
  }
  const data = result ?? shown?.result;
  const stale = result === undefined && !!shown && shown.key !== filterKey;
  const duels = data?.duels;
  const total = data?.total ?? 0;
  const hasMore = data?.hasMore ?? false;
  const liveCount = data?.liveCount ?? 0;
  // Live duels sort first; on mixed lists they get their own section.
  const splitLive = kind !== "live";
  const liveDuels =
    splitLive && duels ? duels.filter((d) => d.status === "IN_PROGRESS") : [];
  const otherDuels = duels
    ? splitLive
      ? duels.filter((d) => d.status !== "IN_PROGRESS")
      : duels
    : [];
  // With no live duel to lead with, spotlight a replay so the page has an
  // obvious place to start: the most watched if one has a real crowd,
  // otherwise the newest. Chosen from the first page only, so "Show more"
  // never swaps it, and from duels this viewer hasn't started when possible.
  const candidates = otherDuels.slice(0, PAGE_SIZE);
  const unstarted = candidates.filter((d) => !hasStartedReplay(d._id));
  const pool = unstarted.length > 0 ? unstarted : candidates;
  const mostWatched = pool.length
    ? pool.reduce((best, d) =>
        (d.uniqueViewers ?? 0) > (best.uniqueViewers ?? 0) ? d : best,
      )
    : undefined;
  const featuredDuel =
    kind !== "live" && liveDuels.length === 0 && otherDuels.length >= 4
      ? (mostWatched?.uniqueViewers ?? 0) >= MOST_WATCHED_MIN
        ? mostWatched
        : pool[0]
      : undefined;

  const setFilters = (next: { kind: DuelKind; opponent?: string }) => {
    const params = new URLSearchParams();
    if (next.opponent) params.set("opponent", next.opponent);
    else if (next.kind !== "all") params.set("kind", next.kind);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
    setLimit(PAGE_SIZE);
  };

  return (
    <div className="min-h-screen">
      <div className="@container container mx-auto px-4 py-6 sm:px-6 sm:py-10">
        <PageHeader
          className="mb-5 sm:mb-6"
          title="Watch Duels"
          icon={<Eye className="h-6 w-6" aria-hidden="true" />}
          description="Live battles and spoiler-free replays."
          descriptionClassName="text-sm sm:text-base"
          compactOnMobile
          actions={
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link href="/duels/create">
                <Swords aria-hidden="true" />
                Start a duel
              </Link>
            </Button>
          }
        />

        {/* Filters: one row, scrolls sideways on narrow screens. */}
        <div className="-mx-4 mb-5 flex items-center gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none]">
          <div
            role="group"
            aria-label="Kind of duel"
            className="flex shrink-0 gap-1 rounded-full border bg-card/60 p-1"
          >
            {KINDS.map(({ value, label, icon: Icon }) => {
              const active = kind === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilters({ kind: value })}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium transition-colors sm:px-3.5",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {value === "live" && liveCount > 0 ? (
                    <span className="relative flex size-2" aria-hidden="true">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-70 motion-reduce:hidden" />
                      <span className="relative inline-flex size-2 rounded-full bg-destructive" />
                    </span>
                  ) : (
                    <Icon
                      className="hidden size-4 sm:block"
                      aria-hidden="true"
                    />
                  )}
                  {label}
                  {value === "live" && liveCount > 0 && (
                    <span className="tabular-nums opacity-80">{liveCount}</span>
                  )}
                </button>
              );
            })}
          </div>

          {kind === "campaign" && opponents && opponents.length > 0 && (
            <Select
              value={opponent?._id ?? ANY_OPPONENT}
              onValueChange={(value) =>
                setFilters({
                  kind: "campaign",
                  opponent: value === ANY_OPPONENT ? undefined : value,
                })
              }
            >
              <SelectTrigger
                aria-label="Campaign wizard"
                className="w-52 shrink-0 rounded-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY_OPPONENT}>
                  All campaign wizards
                </SelectItem>
                {opponents.map((o) => (
                  <SelectItem key={o._id} value={o._id}>
                    {o.opponentNumber}. {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            asChild
            size="sm"
            className="ml-auto shrink-0 rounded-full sm:hidden"
          >
            <Link href="/duels/create" aria-label="Start a duel">
              <Swords aria-hidden="true" />
              Duel
            </Link>
          </Button>
        </div>

        {opponent && (
          <h2 className="mb-4 font-display text-xl font-bold text-foreground">
            Battles against {opponent.name}
          </h2>
        )}

        {duels === undefined ? (
          <div className={GRID} role="status" aria-label="Loading duels">
            {Array.from({ length: 4 }, (_, i) => (
              <div
                key={i}
                className={cn(
                  i === 0 &&
                    kind !== "live" &&
                    "@2xl:col-span-2 @5xl:col-span-3",
                )}
              >
                <DuelCardSkeleton />
              </div>
            ))}
          </div>
        ) : duels.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed bg-card/50 px-6 py-14 text-center">
            <Eye
              className="mb-4 size-12 text-muted-foreground"
              aria-hidden="true"
            />
            <h3 className="mb-2 text-xl font-semibold">
              {kind === "live" ? "No live duels right now" : "No duels found"}
            </h3>
            <p className="mb-6 max-w-md text-muted-foreground">
              {opponent
                ? `Nobody has battled ${opponent.name} yet. Check back soon!`
                : EMPTY_MESSAGE[kind]}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {kind !== "all" && (
                <Button
                  variant="outline"
                  onClick={() => setFilters({ kind: "all" })}
                >
                  See all duels
                </Button>
              )}
              <Button asChild>
                <Link href="/duels/create">
                  <Swords aria-hidden="true" />
                  Start a duel
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div
            aria-busy={stale}
            className={cn(
              "transition-opacity",
              stale && "pointer-events-none opacity-60",
            )}
          >
            {liveDuels.length > 0 && (
              <section aria-labelledby="live-now" className="mb-8">
                <SectionHeading id="live-now" live>
                  Live now
                </SectionHeading>
                <div className={GRID}>
                  {liveDuels.map((duel, i) =>
                    // The first live duel leads the page.
                    i === 0 ? (
                      <div
                        key={duel._id}
                        className="@2xl:col-span-2 @5xl:col-span-3"
                      >
                        <DuelListItem
                          duel={duel}
                          variant="card"
                          showOnlookers
                          priority
                          featured
                        />
                      </div>
                    ) : (
                      <DuelListItem
                        key={duel._id}
                        duel={duel}
                        variant="card"
                        showOnlookers
                        priority={i < 4}
                      />
                    ),
                  )}
                </div>
              </section>
            )}
            {otherDuels.length > 0 && (
              <section aria-labelledby="replays">
                {liveDuels.length > 0 ? (
                  <SectionHeading id="replays">Replays</SectionHeading>
                ) : (
                  kind === "all" && (
                    <p
                      id="replays"
                      className="mb-3 flex items-center gap-2 text-xs text-muted-foreground sm:mb-4 sm:text-sm"
                    >
                      <Radio className="size-4" aria-hidden="true" />
                      <span>
                        Nothing live right now.{" "}
                        <Link
                          href="/duels/create"
                          className="font-medium text-primary underline-offset-2 hover:underline"
                        >
                          Start one
                        </Link>
                        , or catch a replay.
                      </span>
                    </p>
                  )
                )}
                <div className={GRID}>
                  {featuredDuel && (
                    <div className="@2xl:col-span-2 @5xl:col-span-3">
                      <DuelListItem
                        duel={featuredDuel}
                        variant="card"
                        showOnlookers
                        priority
                        featured
                      />
                    </div>
                  )}
                  {otherDuels
                    .filter((duel) => duel !== featuredDuel)
                    .map((duel, i) => (
                      <DuelListItem
                        key={duel._id}
                        duel={duel}
                        variant="card"
                        showOnlookers
                        priority={liveDuels.length === 0 && i < 3}
                      />
                    ))}
                  {!hasMore && <StartDuelCard />}
                </div>
              </section>
            )}
            {otherDuels.length === 0 && !hasMore && (
              <div className={cn(GRID, "mt-5")}>
                <StartDuelCard />
              </div>
            )}

            {hasMore && (
              <div className="mt-8 flex flex-col items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setLimit((l) => l + PAGE_SIZE)}
                  disabled={result === undefined}
                >
                  {result === undefined ? "Loading…" : "Show more duels"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Showing {duels.length} of {total}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeading({
  id,
  live = false,
  children,
}: {
  id: string;
  live?: boolean;
  children: React.ReactNode;
}) {
  return (
    <h2
      id={id}
      className="mb-4 flex items-center gap-2 font-display text-xl font-bold text-foreground"
    >
      {live && (
        <span className="relative flex size-2.5" aria-hidden="true">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-70 motion-reduce:hidden" />
          <span className="relative inline-flex size-2.5 rounded-full bg-destructive" />
        </span>
      )}
      {children}
    </h2>
  );
}

/** Closes the list with a nudge to make the next duel worth watching. */
function StartDuelCard() {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-primary/40 bg-linear-to-br from-primary/10 via-card/40 to-gold/5 p-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-arcane text-white shadow-md shadow-primary/30">
        <Swords className="size-6" aria-hidden="true" />
      </div>
      <div>
        <p className="font-display text-lg font-bold">
          Your duel could be next
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Challenge a friend, or test your wizard against the campaign.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild size="sm">
          <Link href="/duels/create">Start a duel</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/campaign">
            <Shield aria-hidden="true" />
            Campaign
          </Link>
        </Button>
      </div>
    </div>
  );
}
