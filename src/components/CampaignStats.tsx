"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Trophy,
  Target,
  Wand2,
  Crown,
  Sparkles,
  Calendar,
  TrendingUp,
  Clock,
  Zap,
} from "lucide-react";

interface CampaignStatsProps {
  userId: string;
  showDetailedProgress?: boolean;
  showRecentActivity?: boolean;
  compact?: boolean;
}

export function CampaignStats({
  userId,
  showDetailedProgress = true,
  showRecentActivity = true,
  compact = false,
}: CampaignStatsProps) {
  // Get user's wizards and their campaign progress
  const userWizards = useQuery(api.wizards.getUserWizards, {});
  const campaignProgress = useQuery(api.campaigns.getUserCampaignProgress, {
    userId,
  });
  const campaignOpponents = useQuery(api.campaigns.getCampaignOpponents);

  // Show loading state
  if (
    userWizards === undefined ||
    campaignProgress === undefined ||
    campaignOpponents === undefined
  ) {
    return (
      <div className="space-y-4">
        {[...Array(compact ? 2 : 4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Calculate statistics
  const totalWizards = userWizards.length;
  const completedCampaigns = campaignProgress.filter(
    (p: Doc<"wizardCampaignProgress">) => p.hasCompletionRelic
  ).length;
  const activeCampaigns = campaignProgress.filter(
    (p: Doc<"wizardCampaignProgress">) =>
      !p.hasCompletionRelic && p.currentOpponent <= 10
  ).length;
  const totalBattlesWon = campaignProgress.reduce(
    (sum: number, p: Doc<"wizardCampaignProgress">) =>
      sum + p.defeatedOpponents.length,
    0
  );
  const averageProgress =
    totalWizards > 0
      ? campaignProgress.reduce(
          (sum: number, p: Doc<"wizardCampaignProgress">) =>
            sum + Math.min(p.currentOpponent - 1, 10),
          0
        ) / totalWizards
      : 0;

  // Get most recent battle
  const mostRecentBattle = campaignProgress
    .filter((p: Doc<"wizardCampaignProgress">) => p.lastBattleAt)
    .sort(
      (a: Doc<"wizardCampaignProgress">, b: Doc<"wizardCampaignProgress">) =>
        (b.lastBattleAt || 0) - (a.lastBattleAt || 0)
    )[0];

  // Calculate completion percentage and milestones
  const totalPossibleBattles = totalWizards * 10;
  const completionPercentage =
    totalPossibleBattles > 0
      ? (totalBattlesWon / totalPossibleBattles) * 100
      : 0;

  // Milestone tracking
  const milestones = [
    { name: "First Victory", threshold: 1, achieved: totalBattlesWon >= 1 },
    { name: "Apprentice", threshold: 5, achieved: totalBattlesWon >= 5 },
    { name: "Journeyman", threshold: 15, achieved: totalBattlesWon >= 15 },
    { name: "Expert", threshold: 30, achieved: totalBattlesWon >= 30 },
    { name: "Master", threshold: 50, achieved: totalBattlesWon >= 50 },
    { name: "Grandmaster", threshold: 100, achieved: totalBattlesWon >= 100 },
  ];

  const nextMilestone = milestones.find((m) => !m.achieved);
  const achievedMilestones = milestones.filter((m) => m.achieved);

  if (compact) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <div>
                <div className="text-sm font-medium">{totalWizards}</div>
                <div className="text-xs text-muted-foreground">Wizards</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <div>
                <div className="text-sm font-medium">{completedCampaigns}</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <div>
                <div className="text-sm font-medium">{activeCampaigns}</div>
                <div className="text-xs text-muted-foreground">Active</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-green-600 dark:text-green-400" />
              <div>
                <div className="text-sm font-medium">{totalBattlesWon}</div>
                <div className="text-xs text-muted-foreground">Victories</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Wizards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <span className="text-2xl font-bold">{totalWizards}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <span className="text-2xl font-bold">{completedCampaigns}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-2xl font-bold">{activeCampaigns}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Victories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span className="text-2xl font-bold">{totalBattlesWon}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Overview and Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Overall Progress
            </CardTitle>
            <CardDescription>
              Campaign completion across all wizards
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Campaign Progress</span>
                  <span>{Math.round(completionPercentage)}%</span>
                </div>
                <Progress value={completionPercentage} className="h-2" />
              </div>
              <div className="text-sm text-muted-foreground">
                {totalBattlesWon} / {totalPossibleBattles} total battles won
              </div>
              <div className="text-sm text-muted-foreground">
                Average progress: {averageProgress.toFixed(1)} / 10 opponents
              </div>
            </div>
          </CardContent>
        </Card>

        {showRecentActivity && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                Recent Activity
              </CardTitle>
              <CardDescription>Your latest campaign battle</CardDescription>
            </CardHeader>
            <CardContent>
              {mostRecentBattle ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Last Battle:</span>
                    <span>
                      {new Date(
                        mostRecentBattle.lastBattleAt!
                      ).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Progress:</span>
                    <span>
                      {mostRecentBattle.defeatedOpponents.length} / 10 opponents
                      defeated
                    </span>
                  </div>
                  {mostRecentBattle.hasCompletionRelic && (
                    <Badge className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200">
                      <Crown className="h-3 w-3 mr-1" />
                      Campaign Completed
                    </Badge>
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No campaign battles yet
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Milestone Tracking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            Milestone Progress
          </CardTitle>
          <CardDescription>
            Track your achievements and unlock new milestones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Current milestone progress */}
            {nextMilestone && (
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Next: {nextMilestone.name}</span>
                  <span>
                    {totalBattlesWon} / {nextMilestone.threshold}
                  </span>
                </div>
                <Progress
                  value={(totalBattlesWon / nextMilestone.threshold) * 100}
                  className="h-2"
                />
              </div>
            )}

            {/* Achieved milestones */}
            <div className="flex flex-wrap gap-2">
              {achievedMilestones.map((milestone) => (
                <Badge
                  key={milestone.name}
                  className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                >
                  <Trophy className="h-3 w-3 mr-1" />
                  {milestone.name}
                </Badge>
              ))}
              {achievedMilestones.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  No milestones achieved yet. Win your first battle to get
                  started!
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Wizard Progress */}
      {showDetailedProgress && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Wizard Progress Details
            </CardTitle>
            <CardDescription>
              Individual campaign progress for each of your wizards
            </CardDescription>
          </CardHeader>
          <CardContent>
            {totalWizards === 0 ? (
              <div className="text-center py-8">
                <Wand2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Wizards Yet</h3>
                <p className="text-muted-foreground">
                  Create your first wizard to start the campaign
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {userWizards.map((wizard: Doc<"wizards">) => {
                  const progress = campaignProgress.find(
                    (p: Doc<"wizardCampaignProgress">) =>
                      p.wizardId === wizard._id
                  );
                  const defeatedCount = progress?.defeatedOpponents.length || 0;
                  const progressPercent = (defeatedCount / 10) * 100;

                  return (
                    <div key={wizard._id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Wand2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          <div>
                            <h4 className="font-semibold">{wizard.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {wizard.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {progress?.hasCompletionRelic && (
                            <Badge className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200">
                              <Crown className="h-3 w-3 mr-1" />
                              Relic Earned
                            </Badge>
                          )}
                          <span className="text-sm font-medium">
                            {defeatedCount} / 10
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Campaign Progress</span>
                          <span>{Math.round(progressPercent)}%</span>
                        </div>
                        <Progress value={progressPercent} className="h-2" />

                        {progress &&
                          progress.currentOpponent <= 10 &&
                          !progress.hasCompletionRelic && (
                            <div className="text-sm text-muted-foreground">
                              Next opponent: #{progress.currentOpponent}
                            </div>
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
