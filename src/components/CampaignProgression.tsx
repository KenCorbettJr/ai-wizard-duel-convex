"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CampaignOpponentCard } from "./CampaignOpponentCard";
import { CampaignWizardSelection } from "./CampaignWizardSelection";
import { CampaignRelicBadge } from "./CampaignRelicBadge";
import { Trophy, Users, Target } from "lucide-react";
import Link from "next/link";
import type { Doc } from "../../convex/_generated/dataModel";

interface WizardWithProgress {
  wizard: Doc<"wizards">;
  progress?: Doc<"wizardCampaignProgress">;
  effectiveLuckScore: number;
}

interface CampaignProgressionProps {
  campaignOpponents: Doc<"wizards">[];
  userWizards: WizardWithProgress[];
  onOpponentSelect: (opponentNumber: number) => void;
  onStartBattle: (wizardId: string, opponentNumber: number) => void;
  isStartingBattle?: boolean;
}

type ViewMode = "overview" | "wizard-selection";

export function CampaignProgression({
  campaignOpponents,
  userWizards,
  onOpponentSelect,
  onStartBattle,
  isStartingBattle = false,
}: CampaignProgressionProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("overview");
  const [selectedOpponentNumber, setSelectedOpponentNumber] = useState<
    number | null
  >(null);
  const [selectedWizardId, setSelectedWizardId] = useState<string | null>(null);

  // Calculate overall progress statistics
  const totalWizards = userWizards.length;
  const completedWizards = userWizards.filter(
    (w) => (w.progress?.defeatedOpponents.length || 0) === 10
  ).length;
  const totalRelics = userWizards.filter(
    (w) => w.progress?.hasCompletionRelic
  ).length;

  // Calculate average progress
  const totalProgress = userWizards.reduce(
    (sum, w) => sum + (w.progress?.defeatedOpponents.length || 0),
    0
  );
  const averageProgress =
    totalWizards > 0 ? (totalProgress / (totalWizards * 10)) * 100 : 0;

  // Get user's overall campaign progress for each opponent
  const getOpponentStatus = (opponentNumber: number) => {
    const wizardProgresses = userWizards.map((w) => w.progress).filter(Boolean);

    const defeatedBy = wizardProgresses.filter((p) =>
      p!.defeatedOpponents.includes(opponentNumber)
    ).length;

    const canBattleWith = wizardProgresses.filter(
      (p) =>
        p!.currentOpponent === opponentNumber &&
        (p!.defeatedOpponents.length || 0) < 10
    ).length;

    const isUnlocked = canBattleWith > 0 || defeatedBy > 0;
    const isDefeated = defeatedBy > 0;
    const isCurrent = canBattleWith > 0;

    return { isUnlocked, isDefeated, isCurrent, defeatedBy, canBattleWith };
  };

  const handleOpponentSelect = (opponentNumber: number) => {
    setSelectedOpponentNumber(opponentNumber);
    setViewMode("wizard-selection");
    onOpponentSelect(opponentNumber);
  };

  const handleWizardSelect = (wizardId: string) => {
    setSelectedWizardId(wizardId);
  };

  const handleStartBattle = () => {
    if (selectedWizardId && selectedOpponentNumber) {
      onStartBattle(selectedWizardId, selectedOpponentNumber);
    }
  };

  const handleBackToOverview = () => {
    setViewMode("overview");
    setSelectedOpponentNumber(null);
    setSelectedWizardId(null);
  };

  const selectedOpponent = selectedOpponentNumber
    ? campaignOpponents.find(
        (op) => op.opponentNumber === selectedOpponentNumber
      )
    : null;

  if (viewMode === "wizard-selection" && selectedOpponent) {
    return (
      <CampaignWizardSelection
        wizards={userWizards}
        selectedOpponent={selectedOpponent}
        campaignOpponents={campaignOpponents}
        onWizardSelect={handleWizardSelect}
        onStartBattle={handleStartBattle}
        onBack={handleBackToOverview}
        selectedWizardId={selectedWizardId || undefined}
        isStartingBattle={isStartingBattle}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Campaign Mode</h1>
        <p className="text-muted-foreground">
          Challenge 10 unique AI wizards in sequential battles. Complete the
          campaign to earn a permanent luck relic!
        </p>
      </div>

      {/* Overall Progress Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{totalWizards}</div>
                <div className="text-sm text-muted-foreground">
                  Total Wizards
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{completedWizards}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Target className="w-8 h-8 text-amber-500" />
              <div>
                <div className="text-2xl font-bold">{totalRelics}</div>
                <div className="text-sm text-muted-foreground">
                  Relics Earned
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span>{Math.round(averageProgress)}%</span>
              </div>
              <Progress value={averageProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Opponents Grid */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
            Campaign Opponents
          </h2>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-sm border-purple-200 dark:border-purple-800"
            >
              Linear Progression Required
            </Badge>
            <Badge
              variant="secondary"
              className="text-sm bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200"
            >
              {campaignOpponents.length} Opponents
            </Badge>
          </div>
        </div>

        <div className="campaign-grid">
          {campaignOpponents.map((opponent, index) => {
            if (!opponent.opponentNumber) return null;
            const status = getOpponentStatus(opponent.opponentNumber);

            return (
              <div
                key={opponent._id}
                className="animate-opponent-reveal"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CampaignOpponentCard
                  opponent={opponent}
                  isUnlocked={status.isUnlocked}
                  isDefeated={status.isDefeated}
                  isCurrent={status.isCurrent}
                  onSelectOpponent={handleOpponentSelect}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Wizard Progress Summary */}
      {userWizards.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">
            Your Wizards&apos; Progress
          </h2>

          <div className="grid gap-4">
            {userWizards.map((wizardData) => {
              const progress = wizardData.progress;
              const defeatedCount = progress?.defeatedOpponents.length || 0;
              const progressPercentage = (defeatedCount / 10) * 100;
              const nextOpponent = progress?.currentOpponent || 1;
              const hasRelic = progress?.hasCompletionRelic || false;

              return (
                <Card key={wizardData.wizard._id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">
                            {wizardData.wizard.name}
                          </h3>
                          {hasRelic && (
                            <CampaignRelicBadge
                              hasRelic={true}
                              effectiveLuckScore={wizardData.effectiveLuckScore}
                            />
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {defeatedCount === 10
                            ? "Campaign Completed!"
                            : `Next: Opponent #${nextOpponent}`}
                        </div>
                      </div>

                      <div className="text-right space-y-1">
                        <div className="text-sm font-medium">
                          {defeatedCount}/10 Opponents
                        </div>
                        <Progress
                          value={progressPercentage}
                          className="w-24 h-2"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* No Wizards Message */}
      {userWizards.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Wizards Found</h3>
            <p className="text-muted-foreground mb-4">
              You need to create wizards before you can start the campaign.
            </p>
            <Button asChild>
              <Link href="/wizards">Create Your First Wizard</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
