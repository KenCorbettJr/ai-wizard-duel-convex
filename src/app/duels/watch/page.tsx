"use client";

import { Suspense, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { DuelListItem } from "@/components/DuelListItem";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, Layers, Shield, Users } from "lucide-react";
import { RuneSpinner } from "@/components/ui/rune-spinner";
import { PageHeader } from "@/components/PageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DuelKind = "all" | "players" | "campaign";

const KINDS: Array<{ value: DuelKind; label: string; icon: typeof Eye }> = [
  { value: "all", label: "All duels", icon: Layers },
  { value: "players", label: "Player vs player", icon: Users },
  { value: "campaign", label: "Campaign battles", icon: Shield },
];

const EMPTY_MESSAGE: Record<DuelKind, string> = {
  all: "There are no duels to watch yet. Check back later for epic magical battles!",
  players:
    "No player duels yet. Challenge a friend and give the crowd something to watch!",
  campaign:
    "Nobody has taken on the campaign wizards yet. Be the first to try!",
};

const ANY_OPPONENT = "any";

function isDuelKind(value: string | null): value is DuelKind {
  return value === "all" || value === "players" || value === "campaign";
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
  const [offset, setOffset] = useState(0);
  const limit = 20;

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
          offset,
          kind,
          opponentId: opponent?._id as Id<"wizards"> | undefined,
        },
  );
  const duels = result?.duels;
  const total = result?.total ?? 0;
  const hasMore = result?.hasMore ?? false;

  const setFilters = (next: { kind: DuelKind; opponent?: string }) => {
    const params = new URLSearchParams();
    if (next.opponent) params.set("opponent", next.opponent);
    else if (next.kind !== "all") params.set("kind", next.kind);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
    setOffset(0);
  };

  const loadMore = () => {
    setOffset((prev) => prev + limit);
  };

  const loadPrevious = () => {
    setOffset((prev) => Math.max(0, prev - limit));
  };

  return (
    <div className="min-h-screen">
      <div className="@container container mx-auto px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8">
          <PageHeader
            className="mb-0"
            title="Watch Duels"
            icon={<Eye className="h-6 w-6" aria-hidden="true" />}
            description="
            Witness epic magical battles from wizards across the platform. Watch
            duels between players, see how others fare against the campaign
            wizards, and replay completed battles to see how they unfolded.
          "
          />
        </div>

        {/* Duels List */}
        <div className="mb-8">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-display text-2xl font-bold text-foreground">
              {opponent ? `Battles against ${opponent.name}` : "Recent Duels"}
            </h2>
            <div
              role="group"
              aria-label="Kind of duel"
              className="flex flex-wrap gap-2"
            >
              {KINDS.map(({ value, label, icon: Icon }) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={kind === value ? "default" : "outline"}
                  aria-pressed={kind === value}
                  onClick={() => setFilters({ kind: value })}
                >
                  <Icon aria-hidden="true" />
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {kind === "campaign" && opponents && opponents.length > 0 && (
            <div className="mb-6 flex justify-end">
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
                  className="w-full sm:w-72"
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
            </div>
          )}

          {duels === undefined ? (
            <div className="text-center py-12">
              <RuneSpinner size="md" label="Loading…" />
              <p className="text-muted-foreground mt-4">Loading duels...</p>
            </div>
          ) : duels.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Eye className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No duels found</h3>
                <p className="text-muted-foreground">
                  {opponent
                    ? `Nobody has battled ${opponent.name} yet. Check back soon!`
                    : EMPTY_MESSAGE[kind]}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 @3xl:grid-cols-2 @6xl:grid-cols-3">
              {duels.map((duel) => (
                <DuelListItem
                  key={duel._id}
                  duel={duel}
                  variant="card"
                  showOnlookers
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {(offset > 0 || hasMore) && (
          <div className="flex justify-center gap-4">
            {offset > 0 && (
              <Button
                variant="outline"
                onClick={loadPrevious}
                disabled={duels === undefined}
              >
                Previous
              </Button>
            )}
            {hasMore && (
              <Button onClick={loadMore} disabled={duels === undefined}>
                Load More
              </Button>
            )}
          </div>
        )}

        {/* Pagination Info */}
        {total > 0 && (
          <div className="text-center mt-4 text-sm text-muted-foreground">
            Showing {offset + 1} - {Math.min(offset + limit, total)} of {total}{" "}
            duels
          </div>
        )}
      </div>
    </div>
  );
}
