"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Target, Swords } from "lucide-react";

interface WizardStatisticsProps {
  wizardId: Id<"wizards">;
  showDetailedHistory?: boolean;
}

export function WizardStatistics({ wizardId }: WizardStatisticsProps) {
  // Get wizard data
  const wizard = useQuery(api.wizards.getWizard, { wizardId });

  // Get wizard's duels
  const wizardDuels = useQuery(api.duels.getWizardDuelsSafe, { wizardId });

  if (wizard === undefined || wizardDuels === undefined) {
    return (
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!wizard || !wizardDuels) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          Unable to load wizard statistics
        </p>
      </div>
    );
  }

  // Calculate statistics
  const totalDuels = wizardDuels.length;
  const completedDuels = wizardDuels.filter(
    (duel) => duel.status === "COMPLETED",
  );
  const activeDuels = wizardDuels.filter(
    (duel) =>
      duel.status === "IN_PROGRESS" || duel.status === "WAITING_FOR_PLAYERS",
  );
  const cancelledDuels = wizardDuels.filter(
    (duel) => duel.status === "CANCELLED",
  );

  const wins = wizard.wins || 0;
  const losses = wizard.losses || 0;
  const winRate =
    wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
  const completionRate =
    totalDuels > 0 ? Math.round((completedDuels.length / totalDuels) * 100) : 0;

  // Calculate streaks
  const getStreakInfo = () => {
    if (completedDuels.length === 0)
      return { current: 0, type: "none" as const, best: 0 };

    const sortedDuels = completedDuels.sort(
      (a, b) => b.createdAt - a.createdAt,
    );

    let currentStreak = 0;
    let currentType: "win" | "loss" | "none" = "none";
    let bestWinStreak = 0;
    let tempWinStreak = 0;

    for (const duel of sortedDuels) {
      const isWinner = duel.winners?.includes(wizardId);

      if (currentStreak === 0) {
        currentType = isWinner ? "win" : "loss";
        currentStreak = 1;
      } else if (
        (currentType === "win" && isWinner) ||
        (currentType === "loss" && !isWinner)
      ) {
        currentStreak++;
      } else {
        break;
      }

      // Track best win streak
      if (isWinner) {
        tempWinStreak++;
        bestWinStreak = Math.max(bestWinStreak, tempWinStreak);
      } else {
        tempWinStreak = 0;
      }
    }

    return { current: currentStreak, type: currentType, best: bestWinStreak };
  };

  const streakInfo = getStreakInfo();

  return (
    <div className="space-y-6">
      {/* Main Statistics Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Duels</CardTitle>
            <Swords className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDuels}</div>
            <p className="text-xs text-muted-foreground">
              {activeDuels.length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{winRate}%</div>
            <p className="text-xs text-muted-foreground">
              {wins}W - {losses}L
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Current Streak
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {streakInfo.current}
              {streakInfo.type === "win" && (
                <Badge variant="default" className="text-xs">
                  W
                </Badge>
              )}
              {streakInfo.type === "loss" && (
                <Badge variant="destructive" className="text-xs">
                  L
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Best: {streakInfo.best} wins
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completion Rate
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {cancelledDuels.length} cancelled
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Breakdown */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Performance Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Wins</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-muted rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{
                        width: `${wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">
                    {wins}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Losses</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-muted rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{
                        width: `${wins + losses > 0 ? (losses / (wins + losses)) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">
                    {losses}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Duel Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Completed</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-muted rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{
                        width: `${totalDuels > 0 ? (completedDuels.length / totalDuels) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">
                    {completedDuels.length}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-muted rounded-full h-2">
                    <div
                      className="bg-yellow-500 h-2 rounded-full"
                      style={{
                        width: `${totalDuels > 0 ? (activeDuels.length / totalDuels) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">
                    {activeDuels.length}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Cancelled</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-muted rounded-full h-2">
                    <div
                      className="bg-gray-500 h-2 rounded-full"
                      style={{
                        width: `${totalDuels > 0 ? (cancelledDuels.length / totalDuels) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">
                    {cancelledDuels.length}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
