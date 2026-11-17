"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Wand2,
  Swords,
  Trophy,
  Target,
  Clock,
  TrendingUp,
  Activity,
} from "lucide-react";

type UserStatistics = {
  totalWizards: number;
  multiplayerDuels: {
    total: number;
    wins: number;
    losses: number;
    inProgress: number;
  };
  campaignBattles: {
    total: number;
    wins: number;
    losses: number;
    currentProgress: number;
  };
  lastActivityAt?: number;
  activityLevel: "inactive" | "low" | "medium" | "high";
};

interface UserStatsCardProps {
  stats: UserStatistics;
  userName?: string;
}

/**
 * UserStatsCard component displays aggregated user statistics
 *
 * Features:
 * - Total wizards created
 * - Multiplayer duel stats with win/loss breakdown
 * - Campaign battle stats with completion status
 * - Last activity timestamp
 * - Activity level indicator
 *
 * Usage:
 * ```tsx
 * <UserStatsCard
 *   stats={userStatistics}
 *   userName="John Doe"
 * />
 * ```
 */
export function UserStatsCard({ stats, userName }: UserStatsCardProps) {
  const getActivityBadge = (
    activityLevel: "inactive" | "low" | "medium" | "high",
  ) => {
    switch (activityLevel) {
      case "inactive":
        return (
          <Badge
            variant="outline"
            className="bg-muted text-foreground border-border"
          >
            <Activity className="h-3 w-3 mr-1" />
            Inactive
          </Badge>
        );
      case "low":
        return (
          <Badge
            variant="outline"
            className="bg-warning/15 text-warning border-warning/40"
          >
            <Activity className="h-3 w-3 mr-1" />
            Low Activity
          </Badge>
        );
      case "medium":
        return (
          <Badge
            variant="outline"
            className="bg-info/15 text-info border-info/40"
          >
            <Activity className="h-3 w-3 mr-1" />
            Medium Activity
          </Badge>
        );
      case "high":
        return (
          <Badge
            variant="outline"
            className="bg-success/15 text-success border-success/40"
          >
            <Activity className="h-3 w-3 mr-1" />
            High Activity
          </Badge>
        );
    }
  };

  const formatLastActivity = (timestamp?: number): string => {
    if (!timestamp) return "Never";

    // Just format as a date to avoid impure function calls
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateWinRate = (wins: number, total: number): string => {
    if (total === 0) return "0%";
    return `${Math.round((wins / total) * 100)}%`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>User Statistics</span>
          {getActivityBadge(stats.activityLevel)}
        </CardTitle>
        {userName && (
          <CardDescription>Activity overview for {userName}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Wizards Created */}
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-primary/12 p-3">
              <Wand2 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  Wizards Created
                </p>
                <p className="text-2xl font-bold">{stats.totalWizards}</p>
              </div>
            </div>
          </div>

          {/* Multiplayer Duels */}
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-info/15 p-3">
              <Swords className="h-5 w-5 text-info" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  Multiplayer Duels
                </p>
                <p className="text-2xl font-bold">
                  {stats.multiplayerDuels.total}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-md bg-success/10 p-2 text-center">
                  <p className="text-xs text-muted-foreground">Wins</p>
                  <p className="font-semibold text-success">
                    {stats.multiplayerDuels.wins}
                  </p>
                </div>
                <div className="rounded-md bg-destructive/10 p-2 text-center">
                  <p className="text-xs text-muted-foreground">Losses</p>
                  <p className="font-semibold text-destructive">
                    {stats.multiplayerDuels.losses}
                  </p>
                </div>
                <div className="rounded-md bg-warning/10 p-2 text-center">
                  <p className="text-xs text-muted-foreground">In Progress</p>
                  <p className="font-semibold text-warning">
                    {stats.multiplayerDuels.inProgress}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Trophy className="h-4 w-4" />
                <span>
                  Win Rate:{" "}
                  {calculateWinRate(
                    stats.multiplayerDuels.wins,
                    stats.multiplayerDuels.wins + stats.multiplayerDuels.losses,
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Campaign Battles */}
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-warning/15 p-3">
              <Target className="h-5 w-5 text-warning" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  Campaign Battles
                </p>
                <p className="text-2xl font-bold">
                  {stats.campaignBattles.total}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md bg-success/10 p-2 text-center">
                  <p className="text-xs text-muted-foreground">Victories</p>
                  <p className="font-semibold text-success">
                    {stats.campaignBattles.wins}
                  </p>
                </div>
                <div className="rounded-md bg-destructive/10 p-2 text-center">
                  <p className="text-xs text-muted-foreground">Defeats</p>
                  <p className="font-semibold text-destructive">
                    {stats.campaignBattles.losses}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="flex-1 rounded-md bg-muted/50 p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Progress
                    </span>
                    <span className="font-semibold">
                      Opponent {stats.campaignBattles.currentProgress}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Last Activity */}
          <div className="flex items-start gap-4 pt-4 border-t">
            <div className="rounded-lg bg-muted p-3">
              <Clock className="h-5 w-5 text-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">
                Last Activity
              </p>
              <p className="text-lg font-semibold">
                {formatLastActivity(stats.lastActivityAt)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
