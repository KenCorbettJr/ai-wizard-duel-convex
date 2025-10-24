"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CampaignRelicBadge } from "./CampaignRelicBadge";
import { CheckCircle, Circle, Lock } from "lucide-react";
import type { Doc } from "../../convex/_generated/dataModel";

interface WizardWithProgress {
  wizard: Doc<"wizards">;
  progress?: Doc<"wizardCampaignProgress">;
  effectiveLuckScore: number;
}

interface CampaignWizardProgressProps {
  wizardData: WizardWithProgress;
  campaignOpponents: Doc<"wizards">[];
  onSelectWizard?: (wizardId: string) => void;
  isSelected?: boolean;
}

export function CampaignWizardProgress({
  wizardData,
  campaignOpponents,
  onSelectWizard,
  isSelected = false,
}: CampaignWizardProgressProps) {
  const { wizard, progress, effectiveLuckScore } = wizardData;

  const defeatedCount = progress?.defeatedOpponents.length || 0;
  const progressPercentage = (defeatedCount / 10) * 100;
  const nextOpponent = progress?.currentOpponent || 1;
  const hasCompletionRelic = progress?.hasCompletionRelic || false;
  const isCompleted = defeatedCount === 10;

  // Get next opponent info
  const nextOpponentData = campaignOpponents.find(
    (op) => op.opponentNumber === nextOpponent
  );

  return (
    <Card
      className={`cursor-pointer campaign-card-hover animate-fade-in ${
        isSelected
          ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950 animate-campaign-glow"
          : ""
      } ${hasCompletionRelic ? "border-yellow-200 dark:border-yellow-800" : ""}`}
      onClick={() => onSelectWizard?.(wizard._id)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{wizard.name}</CardTitle>
          <div className="flex items-center gap-2">
            {hasCompletionRelic && (
              <CampaignRelicBadge
                hasRelic={true}
                effectiveLuckScore={effectiveLuckScore}
              />
            )}
            <Badge variant="outline">{defeatedCount}/10 Opponents</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Campaign Progress</span>
            <span className="font-medium">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <div className="relative">
            <Progress
              value={progressPercentage}
              className="h-3 animate-progress-fill"
            />
            {hasCompletionRelic && (
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-amber-500/20 rounded-full animate-shimmer"></div>
            )}
          </div>
        </div>

        {/* Current Status */}
        <div className="space-y-2">
          {isCompleted ? (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span className="font-medium">Campaign Completed!</span>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <Circle className="w-4 h-4" />
                <span className="font-medium">
                  Next: {nextOpponentData?.name || `Opponent ${nextOpponent}`}
                </span>
              </div>
              {nextOpponentData && (
                <div className="text-sm text-muted-foreground ml-6">
                  {nextOpponentData.difficulty} • {nextOpponentData.spellStyle}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Opponent Progress Grid */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Opponents Defeated:</div>
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 10 }, (_, i) => {
              const opponentNumber = i + 1;
              const isDefeated =
                progress?.defeatedOpponents.includes(opponentNumber) || false;
              const isCurrent = opponentNumber === nextOpponent && !isCompleted;
              const isLocked = opponentNumber > nextOpponent;

              return (
                <div
                  key={opponentNumber}
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
                    ${
                      isDefeated
                        ? "bg-green-500 text-white"
                        : isCurrent
                          ? "bg-blue-500 text-white ring-2 ring-blue-300"
                          : isLocked
                            ? "bg-gray-200 text-gray-400 dark:bg-gray-700"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    }
                  `}
                  title={
                    isDefeated
                      ? `Defeated Opponent ${opponentNumber}`
                      : isCurrent
                        ? `Current Opponent ${opponentNumber}`
                        : isLocked
                          ? `Locked Opponent ${opponentNumber}`
                          : `Available Opponent ${opponentNumber}`
                  }
                >
                  {isDefeated ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : isLocked ? (
                    <Lock className="w-3 h-3" />
                  ) : (
                    opponentNumber
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Wizard Stats */}
        <div className="flex justify-between text-sm text-muted-foreground pt-2 border-t">
          <span>Wins: {wizard.wins || 0}</span>
          <span>Losses: {wizard.losses || 0}</span>
          <span>Luck: {effectiveLuckScore}</span>
        </div>
      </CardContent>
    </Card>
  );
}
