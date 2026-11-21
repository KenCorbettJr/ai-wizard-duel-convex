"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle, Crown, Eye, Lock, Swords } from "lucide-react";
import { ConvexImage } from "@/components/ConvexImage";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import type { useStartCampaignBattle } from "@/hooks/useStartCampaignBattle";
import {
  CAMPAIGN_TOTAL_OPPONENTS,
  difficultyLabel,
  type OpponentStatus,
} from "@/lib/campaignStatus";
import { cn } from "@/lib/utils";

interface CampaignOpponentCardProps {
  opponent: Doc<"wizards">;
  status: OpponentStatus;
  /** The player's wizard, needed to start battles. */
  wizardId: Id<"wizards">;
  /** Shared battle starter so busy state is consistent across buttons. */
  battle: ReturnType<typeof useStartCampaignBattle>;
  className?: string;
}

const DIFFICULTY_STYLE: Record<string, string> = {
  BEGINNER: "bg-success/15 text-success",
  INTERMEDIATE: "bg-warning/15 text-warning",
  ADVANCED: "bg-destructive/15 text-destructive",
};

function luckText(modifier: number): string {
  if (modifier > 0) return `+${modifier} Luck`;
  if (modifier < 0) return `${modifier} Luck`;
  return "Standard Luck";
}

export function CampaignOpponentCard({
  opponent,
  status,
  wizardId,
  battle,
  className,
}: CampaignOpponentCardProps) {
  const { start, isStarting, isBusy } = battle;
  const number = opponent.opponentNumber ?? 0;
  const isBoss = number === CAMPAIGN_TOTAL_OPPONENTS;
  const isLocked = status === "locked";
  const isCurrent = status === "current";
  const isDefeated = status === "defeated";
  const starting = isStarting(wizardId, number);

  return (
    <Card
      id={`opponent-${number}`}
      className={cn(
        "relative h-full scroll-mt-24 gap-0 py-0 transition-all duration-200",
        isDefeated && "border-success/40 bg-success/5",
        isCurrent &&
          "border-primary/60 bg-primary/5 ring-2 ring-primary/40 shadow-lg",
        isLocked && "border-border bg-muted/30",
        className,
      )}
    >
      <CardContent className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {isBoss ? "Final Boss" : `Opponent ${number}`}
          </span>
          {isDefeated && (
            <span className="flex items-center gap-1 text-xs font-medium text-success">
              <CheckCircle className="h-4 w-4" aria-hidden />
              Defeated
            </span>
          )}
          {isCurrent && (
            <Badge className="bg-primary text-primary-foreground">
              Up next
            </Badge>
          )}
          {isLocked && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" aria-hidden />
              Locked
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div
            className={cn(
              "h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2",
              isCurrent ? "border-primary/60" : "border-border",
              isLocked && "bg-muted",
            )}
          >
            {isLocked ? (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                {isBoss ? (
                  <Crown className="h-7 w-7" aria-hidden />
                ) : (
                  <span className="text-2xl font-bold" aria-hidden>
                    ?
                  </span>
                )}
              </div>
            ) : opponent.illustration ? (
              <ConvexImage
                storageId={opponent.illustration}
                alt={opponent.name}
                width={128}
                height={128}
                className={cn(
                  "h-full w-full object-cover",
                  isDefeated && "opacity-80",
                )}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-primary/15 to-gold/60 text-xl font-bold text-primary">
                {opponent.name.charAt(0)}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold leading-tight">
              {isLocked ? "Mystery Wizard" : opponent.name}
            </h3>
            <div className="mt-1 flex flex-wrap gap-1">
              <Badge
                className={cn(
                  "text-xs",
                  DIFFICULTY_STYLE[opponent.difficulty ?? ""] ??
                    "bg-muted text-foreground",
                )}
              >
                {difficultyLabel(opponent.difficulty)}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {luckText(opponent.luckModifier ?? 0)}
              </Badge>
            </div>
          </div>
        </div>

        {isLocked ? (
          <p className="text-sm text-muted-foreground">
            Defeat the opponents before this one to reveal this challenger.
            {isBoss && " Beat the boss to earn the Campaign Relic."}
          </p>
        ) : (
          <>
            <p className="line-clamp-3 text-sm text-muted-foreground">
              {opponent.description}
            </p>
            {opponent.spellStyle && (
              <p className="text-xs">
                <span className="font-semibold uppercase tracking-wide text-muted-foreground">
                  Style:{" "}
                </span>
                {opponent.spellStyle}
              </p>
            )}
            {isCurrent && (opponent.personalityTraits?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1">
                {opponent.personalityTraits?.slice(0, 3).map((trait) => (
                  <Badge key={trait} variant="outline" className="text-xs">
                    {trait}
                  </Badge>
                ))}
              </div>
            )}
          </>
        )}

        {isCurrent && (
          <Button
            className="mt-auto w-full"
            onClick={() => start(wizardId, number)}
            disabled={isBusy}
            aria-label={`Battle ${opponent.name}`}
          >
            <Swords className="mr-2 h-4 w-4" aria-hidden />
            {starting ? "Entering the arena..." : "Battle Now"}
          </Button>
        )}

        {/* Locked opponents stay a mystery, so only revealed ones link out */}
        {!isLocked && (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className={cn("w-full", !isCurrent && "mt-auto")}
          >
            <Link href={`/duels/watch?opponent=${opponent._id}`}>
              <Eye className="mr-2 h-4 w-4" aria-hidden />
              Watch battles
              <span className="sr-only"> against {opponent.name}</span>
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
