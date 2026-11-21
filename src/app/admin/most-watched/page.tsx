"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { Flame, Sparkles, Star } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useConvexImage } from "@/hooks/useConvexImage";
import { SuperAdminOnly } from "@/components/SuperAdminOnly";
import { PageHeader } from "@/components/PageHeader";
import { OnlookerBadge } from "@/components/arena/OnlookerCount";
import { TimeAgo } from "@/components/TimeAgo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RuneSpinner } from "@/components/ui/rune-spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SortKey = "views" | "unique" | "peak" | "live" | "recent";

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "views", label: "Most views" },
  { value: "unique", label: "Most viewers" },
  { value: "peak", label: "Biggest crowd" },
  { value: "live", label: "Most watched live" },
  { value: "recent", label: "Recently watched" },
];

const STATUS_LABEL: Record<string, string> = {
  WAITING_FOR_PLAYERS: "Waiting",
  IN_PROGRESS: "Live",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

type Row = NonNullable<
  ReturnType<typeof useQuery<typeof api.duelViews.getMostViewedDuels>>
>[number];

function Thumbnail({ storageId, alt }: { storageId?: string; alt: string }) {
  const url = useConvexImage(
    api.wizards.getIllustrationUrl,
    // @ts-expect-error - "skip" is a valid Convex query parameter
    storageId ? { storageId } : "skip",
  );
  return (
    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-secondary/40">
      {url && (
        <Image
          src={url}
          alt={alt}
          fill
          sizes="80px"
          className="object-cover"
          unoptimized
        />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div className="min-w-16 text-center">
      <div
        className={
          emphasis ? "text-2xl font-bold" : "text-lg font-semibold tabular-nums"
        }
      >
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function WatchedRow({
  row,
  rank,
  onToggle,
  pending,
}: {
  row: Row;
  rank: number;
  onToggle: (duelId: Id<"duels">, highlighted: boolean) => void;
  pending: boolean;
}) {
  const highlighted = row.highlightedAt !== undefined;
  const title = row.wizardNames.join(" vs ");
  const signedInShare =
    row.uniqueViewers > 0
      ? Math.round((row.signedInViewers / row.uniqueViewers) * 100)
      : 0;

  return (
    <Card className={highlighted ? "ring-2 ring-gold/60" : undefined}>
      <CardContent className="flex flex-col gap-4 pt-6 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <span className="w-6 shrink-0 text-right font-display text-lg text-muted-foreground">
            {rank}
          </span>
          <Thumbnail storageId={row.featuredIllustration} alt={title} />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/duels/${row.duelId}`}
                className="font-display text-lg font-semibold hover:underline"
              >
                {title}
              </Link>
              <Badge
                variant={row.status === "IN_PROGRESS" ? "default" : "outline"}
              >
                {STATUS_LABEL[row.status] ?? row.status}
              </Badge>
              {highlighted && <Badge variant="gold">Highlighted</Badge>}
              <OnlookerBadge duelId={row.duelId} />
            </div>
            <p className="text-sm text-muted-foreground">
              {row.winnerNames.length > 0 &&
                `Won by ${row.winnerNames.join(", ")} · `}
              {row.numberOfRounds === "TO_THE_DEATH"
                ? "To the Death"
                : `${row.numberOfRounds} rounds`}
              {` · ${new Date(row.createdAt).toLocaleDateString()}`}
            </p>
            <p className="text-xs text-muted-foreground">
              Last watched <TimeAgo timestamp={row.lastViewedAt} />
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <Stat label="views" value={row.views} emphasis />
          <Stat label="viewers" value={row.uniqueViewers} />
          <Stat label="peak crowd" value={row.peakOnlookers} />
          <Stat label="live views" value={row.liveViews} />
          <Stat label="signed in" value={`${signedInShare}%`} />
          <Stat
            label="AI rating"
            value={
              row.aiRating !== undefined ? (
                <span className="inline-flex items-center gap-1">
                  <Star className="size-4 text-gold" aria-hidden="true" />
                  {row.aiRating.toFixed(1)}
                </span>
              ) : (
                <span className="text-muted-foreground">–</span>
              )
            }
          />
        </div>

        {row.status === "COMPLETED" && (
          <Button
            variant={highlighted ? "outline" : "gold"}
            disabled={pending}
            onClick={() => onToggle(row.duelId, !highlighted)}
          >
            <Sparkles aria-hidden="true" />
            {highlighted ? "Remove highlight" : "Highlight"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function MostWatched() {
  const [sortBy, setSortBy] = useState<SortKey>("views");
  const rows = useQuery(api.duelViews.getMostViewedDuels, {
    sortBy,
    limit: 100,
  });
  const setHighlighted = useMutation(api.duelRatingsData.setDuelHighlighted);
  const [pendingId, setPendingId] = useState<Id<"duels"> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggle = async (duelId: Id<"duels">, highlighted: boolean) => {
    setPendingId(duelId);
    setError(null);
    try {
      await setHighlighted({ duelId, highlighted });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update highlight");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Most Watched"
        description="Which duels draw a crowd. Views count onlookers only (duelists watching their own duel don't count), and repeat visits within 30 minutes count once. Anonymous numbers are indicative."
        icon={<Flame className="h-6 w-6" aria-hidden="true" />}
      />
      <div className="mb-6 flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Sort by</span>
        <Select
          value={sortBy}
          onValueChange={(value) => setSortBy(value as SortKey)}
        >
          <SelectTrigger className="w-56" aria-label="Sort duels">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {error}
        </p>
      )}
      {rows === undefined ? (
        <div className="py-12 text-center">
          <RuneSpinner size="md" label="Loading duels…" />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No views yet. Duels show up here once someone other than the
            duelists watches them.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {rows.map((row, i) => (
            <WatchedRow
              key={row.duelId}
              row={row}
              rank={i + 1}
              onToggle={toggle}
              pending={pendingId === row.duelId}
            />
          ))}
        </div>
      )}
    </>
  );
}

export default function MostWatchedPage() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
        <SuperAdminOnly>
          <MostWatched />
        </SuperAdminOnly>
      </div>
    </div>
  );
}
