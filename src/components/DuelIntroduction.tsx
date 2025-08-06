"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { ConvexImage } from "./ConvexImage";

interface DuelIntroductionProps {
  duelId: Id<"duels">;
}

export function DuelIntroduction({ duelId }: DuelIntroductionProps) {
  const introRound = useQuery(api.duels.getIntroductionRound, { duelId });

  if (!introRound) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Preparing the arena...</p>
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
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Introduction Text */}
      <div className="prose prose-lg max-w-none dark:prose-invert">
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4 text-center">
            Welcome to the Enchanted Arena!
          </h2>

          <div className="whitespace-pre-line text-foreground leading-relaxed">
            {introRound.outcome.narrative}
          </div>

          {introRound.outcome.result && (
            <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-center font-semibold text-primary">
                {introRound.outcome.result}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
