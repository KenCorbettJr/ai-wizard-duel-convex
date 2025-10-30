"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, Crown, Calendar, Trophy, Users } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface SeasonInfoProps {
  userId?: string;
  compact?: boolean;
}

export function SeasonInfo({ userId, compact = false }: SeasonInfoProps) {
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const activeSeason = useQuery(api.campaignSeasons.getActiveCampaignSeason);
  const userProgress = useQuery(
    api.campaignSeasons.getUserCurrentSeasonProgress,
    userId ? { userId } : "skip"
  );

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  if (activeSeason === undefined) {
    return (
      <Card className={compact ? "p-4" : ""}>
        <CardContent className={compact ? "p-0" : ""}>
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-2 bg-muted rounded mb-4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activeSeason) {
    return (
      <Card className={compact ? "p-4" : ""}>
        <CardContent className={compact ? "p-0" : ""}>
          <div className="text-center py-4">
            <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No active campaign season
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const timeRemaining = Math.max(0, activeSeason.endDate - currentTime);
  const totalDuration = activeSeason.endDate - activeSeason.startDate;
  const elapsed = currentTime - activeSeason.startDate;
  const seasonProgress = Math.min(
    100,
    Math.max(0, (elapsed / totalDuration) * 100)
  );

  const userWizardCount = userProgress?.progress.length || 0;
  const completedWizards =
    userProgress?.progress.filter(
      (p: { hasCompletionRelic: boolean }) => p.hasCompletionRelic
    ).length || 0;

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-purple-600" />
            <span className="font-medium text-sm">{activeSeason.name}</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            {timeRemaining > 0
              ? formatDistanceToNow(activeSeason.endDate)
              : "Ended"}
          </Badge>
        </div>

        {userId && userWizardCount > 0 && (
          <div className="text-xs text-muted-foreground">
            {completedWizards}/{userWizardCount} wizards completed
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          Current Season
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Season Header */}
        <div>
          <h3 className="font-semibold text-lg">{activeSeason.name}</h3>
          <p className="text-sm text-muted-foreground">
            {activeSeason.description}
          </p>
        </div>

        {/* Season Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Season Progress</span>
            <span className="text-muted-foreground">
              {Math.round(seasonProgress)}% complete
            </span>
          </div>
          <Progress value={seasonProgress} className="h-2" />
        </div>

        {/* Time Remaining */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-blue-600" />
            <span className="font-medium">Time Remaining</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {timeRemaining > 0
              ? formatDistanceToNow(activeSeason.endDate)
              : "Season ended"}
          </div>
        </div>

        {/* Season Dates */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <div className="text-muted-foreground">Started</div>
            <div className="font-medium">
              {format(activeSeason.startDate, "MMM d, yyyy")}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Ends</div>
            <div className="font-medium">
              {format(activeSeason.endDate, "MMM d, yyyy")}
            </div>
          </div>
        </div>

        {/* Completion Relic */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="h-4 w-4 text-purple-600" />
            <span className="font-medium text-sm">Completion Reward</span>
          </div>
          <div>
            <div className="font-semibold text-sm text-purple-700 dark:text-purple-300">
              {activeSeason.completionRelic.name}
            </div>
            <div className="text-xs text-muted-foreground">
              {activeSeason.completionRelic.description}
            </div>
            <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              +{activeSeason.completionRelic.luckBonus} Luck Bonus
            </div>
          </div>
        </div>

        {/* User Progress (if logged in) */}
        {userId && userProgress && userWizardCount > 0 && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-green-600" />
              <span className="font-medium text-sm">Your Progress</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {userWizardCount}
                </div>
                <div className="text-xs text-muted-foreground">Wizards</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {completedWizards}
                </div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
              <div>
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {completedWizards}
                </div>
                <div className="text-xs text-muted-foreground">Relics</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
