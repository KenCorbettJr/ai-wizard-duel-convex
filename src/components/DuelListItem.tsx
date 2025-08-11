"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { ConvexImage } from "@/components/ConvexImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Clock,
  Sparkles,
  Star,
  Swords,
  Crown,
  X,
  Calendar,
  Users,
  Copy,
} from "lucide-react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useState } from "react";

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
  };
  variant?: "compact" | "card" | "dashboard";
  showActions?: boolean;
  onCopyShortcode?: (shortcode: string) => void;
}

export function DuelListItem({
  duel,
  variant = "card",
  showActions = true,
  onCopyShortcode,
}: DuelListItemProps) {
  const { user } = useUser();
  const [copySuccess, setCopySuccess] = useState(false);

  // Fetch wizard details for all wizards in the duel
  const wizard1 = useQuery(
    api.wizards.getWizard,
    duel.wizards[0] ? { wizardId: duel.wizards[0] } : "skip"
  );
  const wizard2 = useQuery(
    api.wizards.getWizard,
    duel.wizards[1] ? { wizardId: duel.wizards[1] } : "skip"
  );
  const wizard3 = useQuery(
    api.wizards.getWizard,
    duel.wizards[2] ? { wizardId: duel.wizards[2] } : "skip"
  );

  const wizards = [wizard1, wizard2, wizard3].filter(
    (w) => w !== undefined && w !== null
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
    const url = `${window.location.origin}/join/${shortcode}`;
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
            className="bg-orange-100/80 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200 border-orange-200/50 dark:border-orange-700/30 flex items-center gap-1"
          >
            <Clock className="h-3 w-3" />
            {variant === "compact" ? "Waiting" : "Waiting for Players"}
          </Badge>
        );
      case "IN_PROGRESS":
        return (
          <Badge
            variant="default"
            className="bg-green-100/80 dark:bg-green-900/50 text-green-800 dark:text-green-200 border-green-200/50 dark:border-green-700/30 flex items-center gap-1"
          >
            <Sparkles className="h-3 w-3" />
            {variant === "compact" ? "Active" : "In Progress"}
          </Badge>
        );
      case "COMPLETED":
        if (duel.status === "COMPLETED" && (userWon || userLost)) {
          return (
            <Badge
              variant={userWon ? "default" : "secondary"}
              className={
                userWon
                  ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-100 flex items-center gap-1"
                  : "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-100 flex items-center gap-1"
              }
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
            className="bg-blue-100/80 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border-blue-200/50 dark:border-blue-700/30 flex items-center gap-1"
          >
            <Star className="h-3 w-3" />
            Completed
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge
            variant="destructive"
            className="bg-red-100/80 dark:bg-red-900/50 text-red-800 dark:text-red-200 border-red-200/50 dark:border-red-700/30 flex items-center gap-1"
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
          ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800"
          : userLost
            ? "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
            : ""
        : "";

    return (
      <div
        className={`flex items-center gap-3 p-2 border rounded ${bgClass}`}
        data-testid="duel-list-item"
      >
        {/* Featured illustration thumbnail */}
        {duel.featuredIllustration && (
          <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
            <ConvexImage
              storageId={duel.featuredIllustration}
              alt="Duel illustration"
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {getStatusBadge()}
            {duel.shortcode && duel.status === "WAITING_FOR_PLAYERS" && (
              <code
                className="text-xs px-1 py-0.5 bg-purple-100 text-purple-800 rounded cursor-pointer hover:bg-purple-200 flex items-center gap-1"
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
          <Link href={`/duels/${duel._id}`}>
            <Button variant="outline" size="sm">
              View
            </Button>
          </Link>
        )}
      </div>
    );
  }

  // Card variant for main pages
  return (
    <Card
      className="hover:shadow-md transition-shadow"
      data-testid="duel-list-item"
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {new Date(duel.createdAt).toLocaleDateString()}
            </span>
            {duel.shortcode && duel.status === "WAITING_FOR_PLAYERS" && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Code:</span>
                <code
                  className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded cursor-pointer hover:bg-purple-200 dark:hover:bg-purple-800 flex items-center gap-1"
                  onClick={() => handleCopyShortcode(duel.shortcode!)}
                  title="Click to copy share link"
                >
                  {copySuccess ? "Copied!" : duel.shortcode}
                  <Copy className="h-3 w-3" />
                </code>
              </div>
            )}
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex items-center gap-3">
          {/* Featured illustration thumbnail */}
          {duel.featuredIllustration && (
            <div className="w-16 h-16 rounded overflow-hidden flex-shrink-0">
              <ConvexImage
                storageId={duel.featuredIllustration}
                alt="Duel illustration"
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground mb-1 truncate">
              {duelTitle}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Users className="h-3 w-3" />
              <span>{duel.wizards.length} wizards</span>
              <span>•</span>
              <span>{getRoundInfo()}</span>
            </div>
            {duel.status === "COMPLETED" &&
              duel.points &&
              userWizards.length > 0 && (
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {userWizards.map((wizard) => (
                    <div key={wizard._id} className="flex items-center gap-2">
                      <span>Points: {duel.points?.[wizard._id] || 0}</span>
                      <span>HP: {duel.hitPoints?.[wizard._id] || 0}/100</span>
                    </div>
                  ))}
                </div>
              )}
          </div>

          {showActions && (
            <div className="flex gap-2">
              <Link href={`/duels/${duel._id}`}>
                <Button variant="outline" size="sm">
                  View Details
                </Button>
              </Link>
              {duel.status === "WAITING_FOR_PLAYERS" &&
                !duel.players.includes(user?.id || "") && (
                  <Link href="/duels/join">
                    <Button size="sm">Join</Button>
                  </Link>
                )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
