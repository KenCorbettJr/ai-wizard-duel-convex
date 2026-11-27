"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { ConvexImage } from "@/components/ConvexImage";
import {
  DuelCard,
  DuelCardSkeleton,
  shortTimeAgo,
} from "@/components/DuelCard";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Sparkles, Star, Swords, Crown, X, Copy } from "lucide-react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useMemo, useState } from "react";
import {
  labelDuplicateNames,
  ownerLabelOf,
} from "../../convex/lib/wizardNames";

interface DuelListItemProps {
  duel: {
    _id: string;
    status: string;
    wizards: Id<"wizards">[];
    players: string[];
    shortcode?: string;
    numberOfRounds: number | "TO_THE_DEATH";
    featuredIllustration?: string;
    currentRound?: number;
    createdAt: number;
    winners?: Id<"wizards">[];
    losers?: Id<"wizards">[];
    points?: Record<string, number>;
    hitPoints?: Record<string, number>;
    isCampaignBattle?: boolean;
    forfeitedBy?: Id<"wizards">;
    openings?: Array<{ wizardId: Id<"wizards">; spell: string }>;
    uniqueViewers?: number;
  };
  variant?: "compact" | "card" | "dashboard";
  showActions?: boolean;
  onCopyShortcode?: (shortcode: string) => void;
  /** Show a live count of people watching (card variant). */
  showOnlookers?: boolean;
  /** Load the card's scene eagerly (card variant, above the fold). */
  priority?: boolean;
  /** Spotlight layout (card variant). */
  featured?: boolean;
}

export function DuelListItem({
  duel,
  variant = "card",
  showActions = true,
  onCopyShortcode,
  showOnlookers = false,
  priority = false,
  featured = false,
}: DuelListItemProps) {
  const { user } = useUser();
  const [copySuccess, setCopySuccess] = useState(false);

  // Fetch wizard details for all wizards in the duel
  const rawWizard1 = useQuery(
    api.wizards.getWizardWithOwner,
    duel.wizards[0] ? { wizardId: duel.wizards[0] } : "skip",
  );
  const rawWizard2 = useQuery(
    api.wizards.getWizardWithOwner,
    duel.wizards[1] ? { wizardId: duel.wizards[1] } : "skip",
  );
  const rawWizard3 = useQuery(
    api.wizards.getWizardWithOwner,
    duel.wizards[2] ? { wizardId: duel.wizards[2] } : "skip",
  );
  // Same-named wizards from different players get their owner added.
  const [wizard1, wizard2, wizard3] = useMemo(
    () =>
      labelDuplicateNames([rawWizard1, rawWizard2, rawWizard3], ownerLabelOf),
    [rawWizard1, rawWizard2, rawWizard3],
  );

  const wizards = [wizard1, wizard2, wizard3].filter(
    (w) => w !== undefined && w !== null,
  );
  const isLoading =
    (duel.wizards[0] && wizard1 === undefined) ||
    (duel.wizards[1] && wizard2 === undefined) ||
    (duel.wizards[2] && wizard3 === undefined);

  // The viewer's own wizard first, so "Defeat · X vs Y" always reads from
  // their side.
  const wizardNames = [...wizards]
    .sort(
      (a, b) => Number(b?.owner === user?.id) - Number(a?.owner === user?.id),
    )
    .map((wizard) => wizard?.name)
    .filter(Boolean);
  const duelTitle = wizardNames.length > 0 ? wizardNames.join(" vs ") : "Duel";

  // Determine if user won this duel by checking if any of their wizards are winners
  const userWizards = wizards.filter((wizard) => wizard?.owner === user?.id);
  const userWon =
    duel.winners &&
    userWizards.some((wizard) => duel.winners?.includes(wizard._id));
  const userLost =
    duel.losers &&
    userWizards.some((wizard) => duel.losers?.includes(wizard._id));

  const handleCopyShortcode = async (shortcode: string) => {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/join/${shortcode}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
      onCopyShortcode?.(shortcode);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  const getStatusBadge = () => {
    switch (duel.status) {
      case "WAITING_FOR_PLAYERS":
        return (
          <Badge
            variant="secondary"
            className="bg-warning/80 text-warning-foreground border-warning/50 flex items-center gap-1"
          >
            <Clock className="h-3 w-3" />
            {variant === "compact" ? "Waiting" : "Waiting for Players"}
          </Badge>
        );
      case "IN_PROGRESS":
        return (
          <Badge
            variant="default"
            className="bg-success/80 text-success-foreground border-success/50 flex items-center gap-1"
          >
            <Sparkles className="h-3 w-3" />
            {variant === "compact" ? "Active" : "In Progress"}
          </Badge>
        );
      case "COMPLETED":
        if (duel.status === "COMPLETED" && (userWon || userLost)) {
          return (
            <Badge
              variant={userWon ? "victory" : "defeat"}
              className="flex items-center gap-1"
            >
              {userWon ? (
                <>
                  <Crown className="h-3 w-3" />
                  Victory
                </>
              ) : (
                <>
                  <X className="h-3 w-3" />
                  Defeat
                </>
              )}
            </Badge>
          );
        }
        return (
          <Badge
            variant="outline"
            className="bg-info/80 text-info-foreground border-info/50 flex items-center gap-1"
          >
            <Star className="h-3 w-3" />
            Completed
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge
            variant="destructive"
            className="bg-destructive/80 text-destructive-foreground border-destructive/50 flex items-center gap-1"
          >
            <Swords className="h-3 w-3" />
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            {duel.status}
          </Badge>
        );
    }
  };

  const getRoundInfo = () => {
    const roundInfo = [];

    if (duel.status === "IN_PROGRESS" && duel.currentRound) {
      if (typeof duel.numberOfRounds === "number") {
        roundInfo.push(`Round ${duel.currentRound} of ${duel.numberOfRounds}`);
      } else {
        roundInfo.push(`Round ${duel.currentRound}`);
      }
    }

    if (typeof duel.numberOfRounds === "number") {
      roundInfo.push(`${duel.numberOfRounds} rounds`);
    } else {
      roundInfo.push("To the death");
    }

    return roundInfo.join(" • ");
  };

  if (isLoading) {
    if (variant === "card") return <DuelCardSkeleton />;
    return (
      <div className="flex items-center justify-between p-2 border rounded">
        <div className="flex-1">
          <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-muted rounded w-1/2"></div>
        </div>
        <div className="h-8 w-16 bg-muted rounded"></div>
      </div>
    );
  }

  // Compact variant for dashboard cards
  if (variant === "compact" || variant === "dashboard") {
    const bgClass =
      variant === "dashboard" && duel.status === "COMPLETED"
        ? userWon
          ? "bg-success/10 border-success/40"
          : userLost
            ? "bg-destructive/10 border-destructive/40"
            : ""
        : "";

    return (
      <div
        className={`flex flex-wrap items-center gap-2 sm:gap-3 p-2 sm:p-3 border rounded ${bgClass}`}
        data-testid="duel-list-item"
      >
        {/* The duel's scene when there is one (dashboard rows), else the
            wizards' faces */}
        <div className="flex-shrink-0">
          {variant === "dashboard" && duel.featuredIllustration ? (
            <div className="relative h-12 w-20 overflow-hidden rounded-md">
              <ConvexImage
                storageId={duel.featuredIllustration}
                alt=""
                width={160}
                height={96}
                sizes="80px"
                className="h-full w-full object-cover"
              />
            </div>
          ) : wizards.length > 0 ? (
            <div className="flex -space-x-1">
              {wizards.slice(0, 2).map((wizard, index) => (
                <div
                  key={wizard._id}
                  className="relative w-8 h-8 rounded-full border border-background bg-muted overflow-hidden"
                  style={{ zIndex: wizards.length - index }}
                >
                  {wizard.illustration ? (
                    <ConvexImage
                      storageId={wizard.illustration}
                      alt={`${wizard.name} avatar`}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-arcane flex items-center justify-center text-white font-bold text-xs">
                      {wizard.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              ))}
              {duel.wizards.length > 2 && (
                <div className="relative w-8 h-8 rounded-full border border-background bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                  +{duel.wizards.length - 2}
                </div>
              )}
            </div>
          ) : duel.featuredIllustration ? (
            <div className="w-12 h-12 rounded overflow-hidden">
              <ConvexImage
                storageId={duel.featuredIllustration}
                alt="Duel illustration"
                width={96}
                height={96}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded bg-linear-to-br from-primary to-gold flex items-center justify-center">
              <Swords className="h-6 w-6 text-white" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-[9rem]">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
            {getStatusBadge()}
            {duel.isCampaignBattle && (
              <Badge variant="outline" className="text-xs">
                Campaign
              </Badge>
            )}
            {duel.shortcode && duel.status === "WAITING_FOR_PLAYERS" && (
              <code
                className="text-xs px-1 py-0.5 bg-primary/12 text-primary rounded cursor-pointer hover:bg-primary/20 flex items-center gap-1"
                onClick={() => handleCopyShortcode(duel.shortcode!)}
                title="Click to copy share link"
              >
                {copySuccess ? "Copied!" : duel.shortcode}
                <Copy className="h-3 w-3" />
              </code>
            )}
          </div>
          <p className="text-sm font-medium text-foreground truncate mb-1">
            {duelTitle}
          </p>
          <p className="text-xs text-muted-foreground">
            {getRoundInfo()}
            {variant === "dashboard" && duel.status === "COMPLETED" && (
              <> • {shortTimeAgo(duel.createdAt)}</>
            )}
          </p>
        </div>

        {showActions && (
          <Button
            asChild
            variant={duel.status === "IN_PROGRESS" ? "default" : "outline"}
            size="sm"
            className="ml-auto shrink-0"
          >
            <Link href={`/duels/${duel._id}`}>
              {duel.status === "IN_PROGRESS"
                ? "Resume"
                : duel.status === "COMPLETED"
                  ? "Replay"
                  : "Open"}
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <DuelCard
      duel={duel}
      wizards={wizards}
      viewerId={user?.id}
      showOnlookers={showOnlookers}
      priority={priority}
      featured={featured}
    />
  );
}
