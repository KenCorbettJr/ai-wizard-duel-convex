"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "convex/react";
import { Eye } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { useConvexImage } from "@/hooks/useConvexImage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Duel = NonNullable<
  ReturnType<typeof useQuery<typeof api.duelRatingsData.getHighlightedDuels>>
>[number];

function HighlightedDuelCard({ duel }: { duel: Duel }) {
  const imageUrl = useConvexImage(
    api.wizards.getIllustrationUrl,
    // @ts-expect-error - "skip" is a valid Convex query parameter
    duel.featuredIllustration
      ? { storageId: duel.featuredIllustration }
      : "skip",
  );
  const title = duel.wizardNames.join(" vs ");

  return (
    <Card className="sparkle-hover h-full overflow-hidden">
      <Link href={`/duels/${duel.duelId}`} className="block h-full">
        <div className="relative h-56 bg-secondary/40">
          {imageUrl && (
            <Image
              src={imageUrl}
              alt={`Artwork from the duel ${title}`}
              fill
              sizes="(min-width: 768px) 33vw, 100vw"
              className="object-cover"
              unoptimized
            />
          )}
        </div>
        <CardContent className="space-y-2 pt-4 text-center">
          <h3 className="font-display text-xl font-semibold">{title}</h3>
          {duel.teaser && (
            <p className="text-sm italic text-muted-foreground">
              &ldquo;{duel.teaser}&rdquo;
            </p>
          )}
          {duel.winnerNames.length > 0 && (
            <p className="text-sm font-medium">
              Won by {duel.winnerNames.join(", ")}
            </p>
          )}
        </CardContent>
      </Link>
    </Card>
  );
}

/** Admin-curated duels. Renders nothing until at least one is highlighted. */
export default function HighlightedDuels() {
  const duels = useQuery(api.duelRatingsData.getHighlightedDuels, {
    limit: 3,
  });

  if (!duels || duels.length === 0) return null;

  return (
    <section className="bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <h2 className="mb-4 font-display text-3xl font-bold">
            Duels Worth Watching
          </h2>
          <p className="text-lg text-muted-foreground">
            Hand-picked battles where the spells got weird and the story got
            good. Open one to read the whole thing.
          </p>
        </div>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          {duels.map((duel) => (
            <HighlightedDuelCard key={duel.duelId} duel={duel} />
          ))}
        </div>
        <div className="mt-8 text-center">
          <Button asChild variant="outline" size="lg">
            <Link href="/duels/watch">
              <Eye aria-hidden="true" />
              Browse All Duels
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
