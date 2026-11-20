"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { Sparkles, Star } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useConvexImage } from "@/hooks/useConvexImage";
import { SuperAdminOnly } from "@/components/SuperAdminOnly";
import { PageHeader } from "@/components/PageHeader";
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

type SortKey =
  "overall" | "cool" | "funny" | "engaging" | "unpredictable" | "recent";

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "overall", label: "Overall" },
  { value: "cool", label: "Coolest" },
  { value: "funny", label: "Funniest" },
  { value: "engaging", label: "Most engaging" },
  { value: "unpredictable", label: "Most unpredictable" },
  { value: "recent", label: "Most recently rated" },
];

type Row = NonNullable<
  ReturnType<typeof useQuery<typeof api.duelRatingsData.listDuelRatings>>
>[number];

function Thumbnail({ storageId, alt }: { storageId?: string; alt: string }) {
  const url = useConvexImage(
    api.wizards.getIllustrationUrl,
    // @ts-expect-error - "skip" is a valid Convex query parameter
    storageId ? { storageId } : "skip",
  );
  return (
    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-secondary/40">
      {url && (
        <Image
          src={url}
          alt={alt}
          fill
          sizes="96px"
          className="object-cover"
          unoptimized
        />
      )}
    </div>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function RatingRow({
  row,
  onToggle,
  pending,
}: {
  row: Row;
  onToggle: (duelId: Id<"duels">, highlighted: boolean) => void;
  pending: boolean;
}) {
  const highlighted = row.highlightedAt !== undefined;
  const title = row.wizardNames.join(" vs ");
  return (
    <Card className={highlighted ? "ring-2 ring-gold/60" : undefined}>
      <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center">
        <Thumbnail storageId={row.featuredIllustration} alt={title} />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/duels/${row.duelId}`}
              className="font-display text-lg font-semibold hover:underline"
            >
              {title}
            </Link>
            {highlighted && <Badge variant="gold">Highlighted</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {row.winnerNames.length > 0
              ? `Won by ${row.winnerNames.join(", ")}`
              : "No winner"}{" "}
            ·{" "}
            {row.numberOfRounds === "TO_THE_DEATH"
              ? "To the Death"
              : `${row.numberOfRounds} rounds`}
            {row.completedAt &&
              ` · ${new Date(row.completedAt).toLocaleDateString()}`}
          </p>
          {row.summary && <p className="text-sm italic">{row.summary}</p>}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="flex items-center gap-1 text-2xl font-bold">
              <Star className="size-5 text-gold" aria-hidden="true" />
              {row.overall.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">overall</div>
          </div>
          <Score label="cool" value={row.cool} />
          <Score label="funny" value={row.funny} />
          <Score label="engaging" value={row.engaging} />
          <Score label="surprising" value={row.unpredictable} />
        </div>
        <Button
          variant={highlighted ? "outline" : "gold"}
          disabled={pending}
          onClick={() => onToggle(row.duelId, !highlighted)}
        >
          <Sparkles aria-hidden="true" />
          {highlighted ? "Remove highlight" : "Highlight"}
        </Button>
      </CardContent>
    </Card>
  );
}

function DuelRatings() {
  const rows = useQuery(api.duelRatingsData.listDuelRatings, { limit: 200 });
  const setHighlighted = useMutation(api.duelRatingsData.setDuelHighlighted);
  const [sortBy, setSortBy] = useState<SortKey>("overall");
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

  const sorted = rows
    ? [...rows].sort((a, b) =>
        sortBy === "recent" ? b.ratedAt - a.ratedAt : b[sortBy] - a[sortBy],
      )
    : [];

  return (
    <>
      <PageHeader
        title="Duel Ratings"
        description="Every finished player duel is rated by AI for how cool, funny, engaging and unpredictable it was. Highlight the best to feature them on the homepage. Ratings are private."
        icon={<Star className="h-6 w-6" aria-hidden="true" />}
      />
      <div className="mb-6 flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Sort by</span>
        <Select
          value={sortBy}
          onValueChange={(value) => setSortBy(value as SortKey)}
        >
          <SelectTrigger className="w-56" aria-label="Sort ratings">
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
          <RuneSpinner size="md" label="Loading ratings…" />
        </div>
      ) : sorted.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No rated duels yet. Ratings appear after a player duel finishes.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sorted.map((row) => (
            <RatingRow
              key={row.duelId}
              row={row}
              onToggle={toggle}
              pending={pendingId === row.duelId}
            />
          ))}
        </div>
      )}
    </>
  );
}

export default function DuelRatingsPage() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
        <SuperAdminOnly>
          <DuelRatings />
        </SuperAdminOnly>
      </div>
    </div>
  );
}
