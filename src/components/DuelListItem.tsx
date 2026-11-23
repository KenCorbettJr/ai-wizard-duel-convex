"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { ConvexImage } from "@/components/ConvexImage";

import { Badge } from "@/components/ui/badge";
import { OnlookerBadge } from "@/components/arena/OnlookerCount";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Clock,
  Sparkles,
  Star,
  Swords,
  Shield,
  Crown,
  X,
  Calendar,
  Users,
  Copy,
} from "lucide-react";
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
  };
  variant?: "compact" | "card" | "dashboard";
  showActions?: boolean;
  onCopyShortcode?: (shortcode: string) => void;
  /** Show a live count of people watching (card variant). */
  showOnlookers?: boolean;
}

export function DuelListItem({
  duel,
  variant = "card",
  showActions = true,
  onCopyShortcode,
  showOnlookers = false,
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

  const wizardNames = wizards.map((wizard) => wizard?.name).filter(Boolean);
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
    return (
      <div
        className={
          variant === "card"
            ? "border rounded p-4"
            : "flex items-center justify-between p-2 border rounded"
        }
      >
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
        {/* Wizard avatars or featured illustration */}
        <div className="flex-shrink-0">
          {wizards.length > 0 ? (
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
              <> • {new Date(duel.createdAt).toLocaleDateString()}</>
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
              {duel.status === "IN_PROGRESS" ? "Resume" : "View"}
            </Link>
          </Button>
        )}
      </div>
    );
  }

  // Card variant for main pages - Facebook-style post card
  return (
    <Link href={`/duels/${duel._id}`} className="block">
      <Card
        className="hover:shadow-lg cursor-pointer overflow-hidden hover:scale-105 transition-transform duration-200 pt-0"
        data-testid="duel-list-item"
      >
        {/* Featured illustration with floating wizard avatars */}
        <div className="relative w-full h-64">
          {duel.featuredIllustration ? (
            <ConvexImage
              storageId={duel.featuredIllustration}
              alt="Duel illustration"
              width={800}
              height={512}
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-arcane flex items-center justify-center">
              <Swords className="h-16 w-16 text-white/70" />
            </div>
          )}

          {/* Floating wizard avatars */}
          {wizards.length >= 1 && (
            <div className="absolute -bottom-10 left-2 flex flex-col items-center">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-card border-4 border-card shadow-lg mb-2">
                {wizards[0].illustration ? (
                  <ConvexImage
                    storageId={wizards[0].illustration}
                    alt={`${wizards[0].name} avatar`}
                    width={256}
                    height={256}
                    sizes="128px"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-arcane flex items-center justify-center text-white font-bold text-lg">
                    {wizards[0].name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="text-foreground max-w-36 text-center truncate font-black">
                {wizards[0].name}
              </div>
            </div>
          )}

          {wizards.length >= 2 && (
            <>
              {/* VS indicator in the middle */}
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-card border-4 border-card shadow-lg rounded-full w-12 h-12 flex items-center justify-center z-10">
                <span className="text-foreground font-bold text-sm">VS</span>
              </div>

              <div className="absolute -bottom-10 right-2 flex flex-col items-center">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-card border-4 border-card shadow-lg mb-2">
                  {wizards[1].illustration ? (
                    <ConvexImage
                      storageId={wizards[1].illustration}
                      alt={`${wizards[1].name} avatar`}
                      width={256}
                      height={256}
                      sizes="128px"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-linear-to-br from-info to-info/70 flex items-center justify-center text-white font-bold text-lg">
                      {wizards[1].name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="text-foreground max-w-36 text-center truncate font-black">
                  {wizards[1].name}
                </div>
              </div>
            </>
          )}

          {/* Additional wizards indicator */}
          {wizards.length > 2 && (
            <div className="absolute top-4 right-4 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">
              +{wizards.length - 2} more
            </div>
          )}
        </div>

        <CardContent className="p-0 pt-4">
          {/* Header with status and date */}
          <div className="flex items-center justify-between p-4 pb-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>{new Date(duel.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              {showOnlookers && (
                <OnlookerBadge duelId={duel._id as Id<"duels">} />
              )}
              {duel.isCampaignBattle && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Shield className="h-3 w-3" aria-hidden="true" />
                  Campaign
                </Badge>
              )}
              {getStatusBadge()}
            </div>
          </div>

          {/* Main content */}
          <div className="px-4 space-y-3">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{duel.wizards.length} wizards</span>
              </div>
              <span>•</span>
              <span>{getRoundInfo()}</span>
            </div>

            {/* Share code for waiting duels */}
            {duel.shortcode && duel.status === "WAITING_FOR_PLAYERS" && (
              <div className="flex items-center gap-2 p-2 bg-primary/8 rounded-lg">
                <span className="text-sm text-muted-foreground">
                  Share code:
                </span>
                <code
                  className="text-sm px-2 py-1 bg-primary/12 text-primary rounded cursor-pointer hover:bg-primary/20 flex items-center gap-1"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCopyShortcode(duel.shortcode!);
                  }}
                  title="Click to copy share link"
                >
                  {copySuccess ? "Copied!" : duel.shortcode}
                  <Copy className="h-3 w-3" />
                </code>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
