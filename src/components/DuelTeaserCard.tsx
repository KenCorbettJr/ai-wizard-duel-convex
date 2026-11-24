"use client";

import { useQuery } from "convex/react";
import { Clapperboard, ExternalLink } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Card, CardContent } from "@/components/ui/card";

/**
 * The published teaser for a duel, if it has one. Teasers stop before the
 * ending, so this is safe to show before a viewer reaches the result.
 */
export function DuelTeaserCard({ duelId }: { duelId: Id<"duels"> }) {
  const teaser = useQuery(api.teasers.getDuelTeaser, { duelId });
  if (!teaser?.videoUrl) return null;
  return (
    <Card className="mb-8 border-gold/40 bg-card/90 shadow-lg">
      <CardContent className="flex flex-col items-center gap-5 pt-6 sm:flex-row sm:items-start">
        <video
          src={teaser.videoUrl}
          controls
          playsInline
          preload="metadata"
          className="aspect-9/16 w-48 shrink-0 rounded-lg bg-black"
          aria-label={teaser.title ?? "Duel teaser"}
        />
        <div className="space-y-2 text-center sm:text-left">
          <p className="flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-wide text-gold sm:justify-start">
            <Clapperboard className="size-4" aria-hidden="true" />
            Featured duel
          </p>
          {teaser.title && (
            <h2 className="font-display text-xl font-bold">{teaser.title}</h2>
          )}
          <p className="text-sm text-muted-foreground">
            This duel was picked for a teaser trailer. It stops before the
            ending, so watching it won&apos;t spoil anything.
          </p>
          {teaser.youtubeUrl && (
            <a
              href={teaser.youtubeUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Watch it on YouTube
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
