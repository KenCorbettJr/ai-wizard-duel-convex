"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, X, Clock, Wand2, Target, Calendar, Sword } from "lucide-react";
import type { Id } from "../../convex/_generated/dataModel";

interface CampaignBattleHistoryProps {
  wizardId?: Id<"wizards">;
  userId?: string;
  opponentNumber?: number;
  limit?: number;
  showWizardName?: boolean;
}

export function CampaignBattleHistory({
  wizardId,
  userId,
  opponentNumber,
  limit = 10,
  showWizardName = true,
}: CampaignBattleHistoryProps) {
  // Get battle history based on provided filters
  const wizardBattles = useQuery(
    api.campaigns.getWizardCampaignBattles,
    wizardId ? { wizardId } : "skip"
  );

  const opponentBattles = useQuery(
    api.campaigns.getUserOpponentBattles,
    userId && opponentNumber ? { userId, opponentNumber } : "skip"
  );

  // Get campaign opponents for display names
  const campaignOpponents = useQuery(api.campaigns.getCampaignOpponents);

  // Get wizard details if showing wizard names
  const wizards = useQuery(
    api.wizards.getUserWizards,
    showWizardName ? {} : "skip"
  );

  // Determine which battles to show
  const battles = wizardBattles || opponentBattles || [];

  // Show loading state
  if (battles === undefined || campaignOpponents === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sword className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            Battle History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                <div className="h-6 bg-muted rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort battles by creation time (most recent first) and apply limit
  const sortedBattles = battles
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);

  // Helper function to get opponent name
  const getOpponentName = (opponentNumber: number) => {
    const opponent = campaignOpponents?.find(
      (o) => o.opponentNumber === opponentNumber
    );
    return opponent?.name || `Opponent #${opponentNumber}`;
  };

  // Helper function to get wizard name
  const getWizardName = (wizardId: Id<"wizards">) => {
    if (!showWizardName || !wizards) return "";
    const wizard = wizards.find((w) => w._id === wizardId);
    return wizard?.name || "Unknown Wizard";
  };

  // Helper function to format date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sword className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          Battle History
        </CardTitle>
        <CardDescription>
          {wizardId
            ? "Recent campaign battles for this wizard"
            : opponentNumber
              ? `Battles against ${getOpponentName(opponentNumber)}`
              : "Recent campaign battles"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sortedBattles.length === 0 ? (
          <div className="text-center py-8">
            <Sword className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Battles Yet</h3>
            <p className="text-muted-foreground">
              Start a campaign battle to see your history here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedBattles.map((battle) => (
              <div
                key={battle._id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {showWizardName && (
                      <div className="flex items-center gap-2">
                        <Wand2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        <span className="font-medium text-sm">
                          {getWizardName(battle.wizardId)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-sm">
                        vs {getOpponentName(battle.opponentNumber)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {battle.status === "WON" && (
                      <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                        <Trophy className="h-3 w-3 mr-1" />
                        Victory
                      </Badge>
                    )}
                    {battle.status === "LOST" && (
                      <Badge className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200">
                        <X className="h-3 w-3 mr-1" />
                        Defeat
                      </Badge>
                    )}
                    {battle.status === "IN_PROGRESS" && (
                      <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                        <Clock className="h-3 w-3 mr-1" />
                        In Progress
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Started: {formatDate(battle.createdAt)}</span>
                    </div>
                    {battle.completedAt && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Completed: {formatDate(battle.completedAt)}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-xs">
                    Opponent #{battle.opponentNumber}
                  </div>
                </div>

                {/* Battle duration if completed */}
                {battle.completedAt && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Duration:{" "}
                    {Math.round(
                      (battle.completedAt - battle.createdAt) / (1000 * 60)
                    )}{" "}
                    minutes
                  </div>
                )}
              </div>
            ))}

            {battles.length > limit && (
              <div className="text-center pt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {limit} of {battles.length} battles
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
