"use client";

"use client";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { Clock, Crown, Calendar, Trophy, Users } from "lucide-react";

interface SeasonInfoProps {
  userId?: string;
  compact?: boolean;
}

export function SeasonInfo({ userId, compact = false }: SeasonInfoProps) {
  const activeSeason = useQuery(api.campaignSeasons.getActiveCampaignSeason);
  const userProgress = useQuery(
    api.campaignSeasons.getUserCurrentSeasonProgress,
    userId ? {} : "skip",
  );

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

  const userWizardCount = userProgress?.progress.length || 0;
  const completedWizards =
    userProgress?.progress.filter(
      (p: { hasCompletionRelic: boolean }) => p.hasCompletionRelic,
    ).length || 0;

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">{activeSeason.name}</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {activeSeason.status === "ACTIVE" ? "Active" : "Archived"}
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
          <Crown className="h-5 w-5 text-primary" />
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

        {/* Season Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-info" />
            <span className="font-medium">Status</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {activeSeason.status === "ACTIVE" ? "Currently Active" : "Archived"}
          </div>
        </div>

        {/* Completion Relic */}
        <div className="bg-linear-to-r from-primary/15 to-gold/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Completion Reward</span>
          </div>
          <div>
            <div className="font-semibold text-sm text-primary">
              {activeSeason.completionRelic.name}
            </div>
            <div className="text-xs text-muted-foreground">
              {activeSeason.completionRelic.description}
            </div>
            <div className="text-xs text-primary mt-1">
              +{activeSeason.completionRelic.luckBonus} Luck Bonus
            </div>
          </div>
        </div>

        {/* User Progress (if logged in) */}
        {userId && userProgress && userWizardCount > 0 && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-success" />
              <span className="font-medium text-sm">Your Progress</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-info">
                  {userWizardCount}
                </div>
                <div className="text-xs text-muted-foreground">Wizards</div>
              </div>
              <div>
                <div className="text-lg font-bold text-success">
                  {completedWizards}
                </div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
              <div>
                <div className="text-lg font-bold text-primary">
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
