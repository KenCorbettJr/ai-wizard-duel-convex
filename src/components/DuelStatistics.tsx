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
import {
  BarChart3,
  Trophy,
  Target,
  Clock,
  TrendingUp,
  Users,
  Swords,
  Calendar,
} from "lucide-react";

interface DuelStatisticsProps {
  userId?: string;
  showGlobalStats?: boolean;
  timeRange?: "24h" | "7d" | "30d" | "all";
}

export function DuelStatistics({
  userId,
  showGlobalStats = false,
  timeRange = "30d",
}: DuelStatisticsProps) {
  // Player-specific stats
  const playerStats = useQuery(
    api.duels.getPlayerDuelStats,
    userId ? { userId } : "skip"
  );

  // Global analytics
  const globalAnalytics = useQuery(
    api.duels.getDuelAnalytics,
    showGlobalStats ? { timeRange } : "skip"
  );

  // Player duels for detailed analysis
  const playerDuels = useQuery(
    api.duels.getPlayerDuels,
    userId ? { userId } : "skip"
  );

  if (userId && !playerStats) {
    return (
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
    );
  }

  const calculateWinRate = (wins: number, losses: number) => {
    const total = wins + losses;
    return total > 0 ? Math.round((wins / total) * 100) : 0;
  };

  const getRecentDuels = () => {
    if (!playerDuels) return [];
    return playerDuels
      .filter((duel) => duel.status === "COMPLETED")
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5);
  };

  const getStreakInfo = () => {
    if (!playerDuels) return { current: 0, type: "none" as const, best: 0 };

    const completedDuels = playerDuels
      .filter((duel) => duel.status === "COMPLETED")
      .sort((a, b) => b.createdAt - a.createdAt);

    let currentStreak = 0;
    let currentType: "win" | "loss" | "none" = "none";
    let bestWinStreak = 0;
    let tempWinStreak = 0;

    for (const duel of completedDuels) {
      const hasWinningWizard = duel.winners?.some((winnerId) =>
        duel.wizards.includes(winnerId)
      );

      if (currentStreak === 0) {
        currentType = hasWinningWizard ? "win" : "loss";
        currentStreak = 1;
      } else if (
        (currentType === "win" && hasWinningWizard) ||
        (currentType === "loss" && !hasWinningWizard)
      ) {
        currentStreak++;
      } else {
        break;
      }

      // Track best win streak
      if (hasWinningWizard) {
        tempWinStreak++;
        bestWinStreak = Math.max(bestWinStreak, tempWinStreak);
      } else {
        tempWinStreak = 0;
      }
    }

    return { current: currentStreak, type: currentType, best: bestWinStreak };
  };

  const streakInfo = userId ? getStreakInfo() : null;
  const recentDuels = userId ? getRecentDuels() : [];

  return (
    <div className="space-y-6">
      {/* Main Statistics Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {userId && playerStats && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Duels
                </CardTitle>
                <Swords className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {playerStats.totalDuels}
                </div>
                <p className="text-xs text-muted-foreground">
                  {playerStats.inProgress} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {calculateWinRate(playerStats.wins, playerStats.losses)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {playerStats.wins}W - {playerStats.losses}L
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
                  {streakInfo?.current || 0}
                  {streakInfo?.type === "win" && (
                    <Badge variant="default" className="text-xs">
                      W
                    </Badge>
                  )}
                  {streakInfo?.type === "loss" && (
                    <Badge variant="destructive" className="text-xs">
                      L
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Best: {streakInfo?.best || 0} wins
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
                <div className="text-2xl font-bold">
                  {playerStats.totalDuels > 0
                    ? Math.round(
                        ((playerStats.wins + playerStats.losses) /
                          playerStats.totalDuels) *
                          100
                      )
                    : 0}
                  %
                </div>
                <p className="text-xs text-muted-foreground">
                  {playerStats.cancelled} cancelled
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {showGlobalStats && globalAnalytics && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Platform Duels
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {globalAnalytics.totalDuels}
                </div>
                <p className="text-xs text-muted-foreground">
                  Last {timeRange === "all" ? "all time" : timeRange}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Now
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {globalAnalytics.statusBreakdown.inProgress +
                    globalAnalytics.statusBreakdown.waiting}
                </div>
                <p className="text-xs text-muted-foreground">
                  {globalAnalytics.statusBreakdown.inProgress} in progress
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg Rounds
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {globalAnalytics.averageRoundsPerDuel}
                </div>
                <p className="text-xs text-muted-foreground">
                  Per completed duel
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
                <div className="text-2xl font-bold">
                  {globalAnalytics.totalDuels > 0
                    ? Math.round(
                        (globalAnalytics.statusBreakdown.completed /
                          globalAnalytics.totalDuels) *
                          100
                      )
                    : 0}
                  %
                </div>
                <p className="text-xs text-muted-foreground">
                  {globalAnalytics.statusBreakdown.completed} completed
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Recent Duels History */}
      {userId && recentDuels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Duels
            </CardTitle>
            <CardDescription>Your last 5 completed duels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentDuels.map((duel) => {
                const hasWinningWizard = duel.winners?.some((winnerId) =>
                  duel.wizards.includes(winnerId)
                );

                return (
                  <div
                    key={duel._id}
                    className="flex items-center justify-between p-3 border rounded"
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={hasWinningWizard ? "default" : "destructive"}
                      >
                        {hasWinningWizard ? "Won" : "Lost"}
                      </Badge>
                      <div>
                        <div className="font-medium">
                          {typeof duel.numberOfRounds === "number"
                            ? `${duel.numberOfRounds} Round Duel`
                            : "Duel to the Death"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {duel.wizards.length} wizards • Round{" "}
                          {duel.currentRound}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {new Date(duel.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(duel.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Activity Chart (for global stats) */}
      {showGlobalStats && globalAnalytics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Daily Activity
            </CardTitle>
            <CardDescription>
              Duels created per day (last 7 days)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {globalAnalytics.dailyActivity.map((day) => (
                <div
                  key={day.date}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-muted-foreground">
                    {new Date(day.date).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{
                          width: `${Math.max(5, (day.duels / Math.max(...globalAnalytics.dailyActivity.map((d) => d.duels))) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8 text-right">
                      {day.duels}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Most Active Wizards (for global stats) */}
      {showGlobalStats &&
        globalAnalytics &&
        globalAnalytics.mostActiveWizards.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Most Active Wizards
              </CardTitle>
              <CardDescription>
                Top 10 wizards by duel participation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {globalAnalytics.mostActiveWizards.map((wizard, index) => (
                  <div
                    key={wizard.wizardId}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="w-6 h-6 p-0 flex items-center justify-center text-xs"
                      >
                        {index + 1}
                      </Badge>
                      <span className="text-sm font-mono text-muted-foreground">
                        {wizard.wizardId.slice(-8)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{
                            width: `${(wizard.duelCount / globalAnalytics.mostActiveWizards[0].duelCount) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-8 text-right">
                        {wizard.duelCount}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
