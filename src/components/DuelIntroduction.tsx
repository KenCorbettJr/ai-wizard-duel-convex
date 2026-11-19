"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { ConvexImage } from "./ConvexImage";
import { memo, useEffect, useState } from "react";
import { RuneSpinner } from "@/components/ui/rune-spinner";
import { NarratedText } from "@/components/NarratedText";

interface DuelIntroductionProps {
  duelId: Id<"duels">;
}

export const DuelIntroduction = memo(function DuelIntroduction({
  duelId,
}: DuelIntroductionProps) {
  const introRound = useQuery(api.duels.getIntroductionRound, { duelId });
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (introRound) return;
    const t = setTimeout(() => setSlow(true), 60_000);
    return () => clearTimeout(t);
  }, [introRound]);

  if (!introRound) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <RuneSpinner size="md" label="Loading…" />
          <p className="text-muted-foreground">Preparing the arena...</p>
          {slow && (
            <p className="mt-2 text-sm text-muted-foreground">
              This is taking longer than usual. You can still play: the duel
              doesn&apos;t depend on the introduction.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!introRound.outcome) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-pulse h-4 w-32 bg-muted rounded mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            The Arcane Arbiter is preparing the introduction...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Introduction Illustration */}
      {introRound.outcome.illustration && (
        <div className="relative w-full aspect-square max-w-2xl mx-auto rounded-lg overflow-hidden">
          <ConvexImage
            storageId={introRound.outcome.illustration}
            alt="Duel Introduction"
            width={1024}
            height={1024}
            sizes="(min-width: 672px) 672px, 100vw"
            quality={92}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Result teaser, same style as the round cards */}
      {introRound.outcome.result && (
        <div className="whitespace-pre-line text-xl italic text-foreground/90 leading-relaxed">
          {introRound.outcome.result}
        </div>
      )}

      {/* Introduction Text */}
      <div className="prose prose-lg max-w-none dark:prose-invert">
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4 text-center">
            Welcome to the Enchanted Arena!
          </h2>

          <NarratedText narration={introRound.narration}>
            <div className="whitespace-pre-line text-foreground leading-relaxed">
              {introRound.outcome.narrative}
            </div>
          </NarratedText>
        </div>
      </div>
    </div>
  );
});
