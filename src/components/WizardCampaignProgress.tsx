"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Scroll, Target, Crown, Swords, ArrowRight } from "lucide-react";
import Link from "next/link";

interface WizardCampaignProgressProps {
  wizardId: Id<"wizards">;
  isOwner: boolean;
}

export function WizardCampaignProgress({
  wizardId,
  isOwner,
}: WizardCampaignProgressProps) {
  // Get wizard's campaign progress
  const wizardProgress = useQuery(
    api.campaigns.getWizardCampaignProgress,
    wizardId ? { wizardId } : "skip"
  );

  // Get campaign opponents for context
  const campaignOpponents = useQuery(api.campaigns.getCampaignOpponents);

  if (wizardProgress === undefined || campaignOpponents === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scroll className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            Campaign Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-2 bg-muted rounded mb-4"></div>
            <div className="h-8 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const defeatedCount = wizardProgress?.defeatedOpponents.length || 0;
  const isCompleted = defeatedCount === 10;
  const progressPercentage = (defeatedCount / 10) * 100;
  const currentOpponent = wizardProgress?.currentOpponent || 1;
  const hasStarted = wizardProgress !== null;

  // Get current opponent info
  const currentOpponentInfo = campaignOpponents.find(
    (opponent) => opponent.opponentNumber === currentOpponent
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scroll className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          Campaign Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasStarted ? (
          // Campaign not started
          <div className="text-center py-4">
            <div className="mb-4">
              <Scroll className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <h3 className="font-semibold text-muted-foreground mb-1">
                Campaign Not Started
              </h3>
              <p className="text-sm text-muted-foreground">
                Challenge 10 unique AI opponents to earn a powerful relic
              </p>
            </div>
            {isOwner && (
              <Link href={`/campaign/wizard/${wizardId}`}>
                <Button>
                  <Swords className="h-4 w-4 mr-2" />
                  Start Campaign
                </Button>
              </Link>
            )}
          </div>
        ) : (
          // Campaign in progress or completed
          <>
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Progress</span>
                <span className="text-muted-foreground">
                  {defeatedCount}/10 opponents defeated
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            {/* Status */}
            <div className="flex items-center justify-between">
              {isCompleted ? (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <Crown className="h-4 w-4" />
                  <span className="font-medium">Campaign Completed!</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <Target className="h-4 w-4" />
                  <span className="font-medium">
                    Next: Opponent {currentOpponent}
                  </span>
                </div>
              )}

              {wizardProgress?.hasCompletionRelic && (
                <Badge variant="secondary" className="text-xs">
                  <Crown className="h-3 w-3 mr-1" />
                  Relic Earned
                </Badge>
              )}
            </div>

            {/* Current Opponent Info */}
            {!isCompleted && currentOpponentInfo && (
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-sm">
                      {currentOpponentInfo.name}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {currentOpponentInfo.difficulty} difficulty
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">
                      Opponent #{currentOpponent}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {defeatedCount}
                </div>
                <div className="text-xs text-muted-foreground">Defeated</div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {10 - defeatedCount}
                </div>
                <div className="text-xs text-muted-foreground">Remaining</div>
              </div>
              <div>
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {Math.round(progressPercentage)}%
                </div>
                <div className="text-xs text-muted-foreground">Complete</div>
              </div>
            </div>

            {/* Action Button */}
            {isOwner && (
              <Link href={`/campaign/wizard/${wizardId}`}>
                <Button variant="outline" className="w-full">
                  <Scroll className="h-4 w-4 mr-2" />
                  View Full Campaign
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
