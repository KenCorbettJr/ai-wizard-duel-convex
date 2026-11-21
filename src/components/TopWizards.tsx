"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "convex/react";
import { Crown, Medal, Trophy } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { useConvexImage } from "@/hooks/useConvexImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const RANK_STYLES = [
  { Icon: Crown, color: "text-gold", ring: "ring-2 ring-gold/70 bg-gold/10" },
  {
    Icon: Trophy,
    color: "text-muted-foreground",
    ring: "ring-2 ring-primary/40 bg-primary/5",
  },
  {
    Icon: Medal,
    color: "text-warning",
    ring: "ring-2 ring-warning/40 bg-warning/5",
  },
] as const;

function TopWizardCard({
  wizard,
  index,
}: {
  wizard: {
    name: string;
    illustration?: string;
    wins?: number;
    losses?: number;
    winRate: number;
    ownerDisplayName?: string;
  };
  index: number;
}) {
  const imageUrl = useConvexImage(
    api.wizards.getIllustrationUrl,
    // @ts-expect-error - "skip" is a valid Convex query parameter
    wizard.illustration ? { storageId: wizard.illustration } : "skip",
  );
  const { Icon, color, ring } = RANK_STYLES[index];

  return (
    <Card className={`h-full overflow-hidden ${ring}`}>
      <div className="relative h-56 bg-secondary/40">
        {imageUrl && (
          <Image
            src={imageUrl}
            alt={`Portrait of ${wizard.name}`}
            fill
            sizes="(min-width: 768px) 33vw, 100vw"
            className="object-cover"
            unoptimized
          />
        )}
        <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-background/80 px-2 py-1 text-sm font-semibold">
          <Icon className={`size-4 ${color}`} aria-hidden="true" />#{index + 1}
        </div>
      </div>
      <CardContent className="space-y-2 pt-4 text-center">
        <h3 className="font-display text-xl font-semibold">{wizard.name}</h3>
        {wizard.ownerDisplayName && (
          <p className="text-sm text-muted-foreground">
            by {wizard.ownerDisplayName}
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-2">
          <Badge variant="secondary">
            {wizard.wins ?? 0}W - {wizard.losses ?? 0}L
          </Badge>
          <Badge variant="outline">
            {(wizard.winRate * 100).toFixed(0)}% win rate
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

/** Top three wizards from the public leaderboard. Renders nothing until at least one qualifies. */
export default function TopWizards() {
  const leaderboard = useQuery(api.wizards.getWizardLeaderboard, {
    limit: 3,
    minDuels: 3,
  });

  if (!leaderboard || leaderboard.length === 0) return null;

  return (
    <section className="bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <h2 className="mb-4 font-display text-3xl font-bold">
            Wizards to Beat
          </h2>
          <p className="text-lg text-muted-foreground">
            Every one of these started as a few sentences. Now they top the
            leaderboard. Can your wizard dethrone them?
          </p>
        </div>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          {leaderboard.map((wizard, i) => (
            <TopWizardCard key={wizard._id} wizard={wizard} index={i} />
          ))}
        </div>
        <div className="mt-8 text-center">
          <Button asChild variant="outline" size="lg">
            <Link href="/leaderboard">See Full Leaderboard</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
