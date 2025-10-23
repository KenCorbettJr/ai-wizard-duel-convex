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
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Crown,
  Wand2,
  Target,
  Sparkles,
  TrendingUp,
  Star,
  Zap,
} from "lucide-react";
import Link from "next/link";
import type { Id } from "../../convex/_generated/dataModel";

interface CampaignProgressTrackerProps {
  wizardId: Id<"wizards">;
  showActions?: boolean;
  compact?: boolean;
}

export function CampaignProgressTracker({
  wizardId,
  showActions = true,
  compact = false,
}: CampaignProgressTrackerProps) {
  // Get wizard details
  const wizard = useQuery(api.wizards.getWizard, { wizardId });

  // Get campaign progress for this wizard
  const campaignProgress = useQuery(api.campaigns.getWizardCampaignProgress, {
    wizardId,
  });

  // Get campaign opponents for display
  const campaignOpponents = useQuery(api.campaigns.getCampaignOpponents);

  // Get effective luck score (includes relic bonus)
  const effectiveLuck = useQuery(api.campaigns.getWizardEffectiveLuck, {
    wizardId,
  });

  // Show loading state
  if (
    wizard === undefined ||
    campaignProgress === undefined ||
    campaignOpponents === undefined ||
    effectiveLuck === undefined
  ) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-8 bg-muted rounded w-2/3"></div>
            <div className="h-2 bg-muted rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!wizard) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Wizard not found
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate progress statistics
  const defeatedCount = campaignProgress?.defeatedOpponents.length || 0;
  const progressPercent = (defeatedCount / 10) * 100;
  const currentOpponent = campaignProgress?.currentOpponent || 1;
  const hasCompletionRelic = campaignProgress?.hasCompletionRelic || false;
  const isCompleted = hasCompletionRelic;
  const nextOpponentNumber = isCompleted ? null : currentOpponent;

  // Get next opponent details
  const nextOpponent = nextOpponentNumber
    ? campaignOpponents.find((o) => o.opponentNumber === nextOpponentNumber)
    : null;

  // Calculate difficulty tier
  const getDifficultyTier = (opponentNumber: number) => {
    if (opponentNumber <= 3) return "BEGINNER";
    if (opponentNumber <= 7) return "INTERMEDIATE";
    return "ADVANCED";
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "BEGINNER":
        return "text-green-600 dark:text-green-400";
      case "INTERMEDIATE":
        return "text-yellow-600 dark:text-yellow-400";
      case "ADVANCED":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-muted-foreground";
    }
  };

  if (compact) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="font-medium text-sm">{wizard.name}</span>
            </div>
            <div className="flex items-center gap-2">
              {hasCompletionRelic && (
                <Badge className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-xs">
                  <Crown className="h-3 w-3 mr-1" />
                  Relic
                </Badge>
              )}
              <span className="text-xs font-medium">{defeatedCount} / 10</span>
            </div>
          </div>
          <Progress value={progressPercent} className="h-1" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            {wizard.name}
          </div>
          {hasCompletionRelic && (
            <Badge className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200">
              <Crown className="h-4 w-4 mr-1" />
              Campaign Master
            </Badge>
          )}
        </CardTitle>
        <CardDescription>{wizard.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Overview */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Campaign Progress</span>
            <span className="text-sm text-muted-foreground">
              {defeatedCount} / 10 opponents defeated
            </span>
          </div>
          <Progress value={progressPercent} className="h-3" />
          <div className="text-xs text-muted-foreground">
            {Math.round(progressPercent)}% complete
          </div>
        </div>

        {/* Wizard Stats with Relic Bonus */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-sm font-medium flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              Effective Luck
            </div>
            <div className="text-lg font-bold">
              {effectiveLuck}
              {hasCompletionRelic && (
                <span className="text-sm text-green-600 dark:text-green-400 ml-1">
                  (+1 relic)
                </span>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium flex items-center gap-1">
              <Trophy className="h-4 w-4 text-green-600 dark:text-green-400" />
              Victories
            </div>
            <div className="text-lg font-bold">{defeatedCount}</div>
          </div>
        </div>

        {/* Next Opponent or Completion Status */}
        {isCompleted ? (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Crown className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
              <div>
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
                  Campaign Completed!
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  This wizard has earned the legendary relic and gained +1 luck
                  permanently.
                </p>
              </div>
            </div>
          </div>
        ) : nextOpponent ? (
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Target className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                Next Challenge
              </h3>
              <Badge
                className={`${getDifficultyColor(nextOpponent.difficulty)} bg-transparent border`}
              >
                {nextOpponent.difficulty}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="font-medium">
                #{nextOpponent.opponentNumber}: {nextOpponent.name}
              </div>
              <div className="text-sm text-muted-foreground">
                {nextOpponent.description}
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Style: {nextOpponent.spellStyle}</span>
                <span>
                  Luck Modifier: {nextOpponent.luckModifier > 0 ? "+" : ""}
                  {nextOpponent.luckModifier}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Ready to start the campaign
            </p>
          </div>
        )}

        {/* Defeated Opponents Summary */}
        {defeatedCount > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              Defeated Opponents
            </h4>
            <div className="flex flex-wrap gap-1">
              {campaignProgress?.defeatedOpponents
                .sort((a: number, b: number) => a - b)
                .map((opponentNumber: number) => {
                  const difficulty = getDifficultyTier(opponentNumber);
                  return (
                    <Badge
                      key={opponentNumber}
                      variant="outline"
                      className={`text-xs ${getDifficultyColor(difficulty)}`}
                    >
                      #{opponentNumber}
                    </Badge>
                  );
                })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {showActions && (
          <div className="flex gap-2">
            {!isCompleted && nextOpponent && (
              <Link
                href={`/campaign/wizard-selection/${nextOpponent.opponentNumber}`}
              >
                <Button className="flex-1">
                  <Zap className="h-4 w-4 mr-2" />
                  Battle {nextOpponent.name}
                </Button>
              </Link>
            )}
            <Link href="/campaign">
              <Button variant="outline" className="flex-1">
                View Campaign
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
