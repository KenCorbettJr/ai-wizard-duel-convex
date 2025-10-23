"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CampaignWizardProgress } from "./CampaignWizardProgress";
import { ArrowLeft, Swords, Target } from "lucide-react";
import type { Doc } from "../../convex/_generated/dataModel";

interface WizardWithProgress {
  wizard: Doc<"wizards">;
  progress?: Doc<"wizardCampaignProgress">;
  effectiveLuckScore: number;
}

interface CampaignWizardSelectionProps {
  wizards: WizardWithProgress[];
  selectedOpponent: Doc<"campaignOpponents">;
  campaignOpponents: Doc<"campaignOpponents">[];
  onWizardSelect: (wizardId: string) => void;
  onStartBattle: () => void;
  onBack: () => void;
  selectedWizardId?: string;
  isStartingBattle?: boolean;
}

export function CampaignWizardSelection({
  wizards,
  selectedOpponent,
  campaignOpponents,
  onWizardSelect,
  onStartBattle,
  onBack,
  selectedWizardId,
  isStartingBattle = false,
}: CampaignWizardSelectionProps) {
  const selectedWizard = wizards.find((w) => w.wizard._id === selectedWizardId);

  // Filter wizards that can battle this opponent
  const eligibleWizards = wizards.filter((wizardData) => {
    const { progress } = wizardData;
    const nextOpponent = progress?.currentOpponent || 1;
    const isCompleted = (progress?.defeatedOpponents.length || 0) === 10;

    // Wizard can battle this opponent if it's their next opponent and they haven't completed the campaign
    return nextOpponent === selectedOpponent.opponentNumber && !isCompleted;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "BEGINNER":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "INTERMEDIATE":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "ADVANCED":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getLuckModifierText = (modifier: number) => {
    if (modifier > 0) return `+${modifier} Luck`;
    if (modifier < 0) return `${modifier} Luck`;
    return "Standard Luck";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Campaign
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Select Your Wizard</h1>
          <p className="text-muted-foreground">
            Choose a wizard to battle {selectedOpponent.name}
          </p>
        </div>
      </div>

      {/* Opponent Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              Opponent #{selectedOpponent.opponentNumber}:{" "}
              {selectedOpponent.name}
            </span>
            <div className="flex items-center gap-2">
              <Badge
                className={getDifficultyColor(selectedOpponent.difficulty)}
              >
                {selectedOpponent.difficulty}
              </Badge>
              <Badge variant="outline">
                {getLuckModifierText(selectedOpponent.luckModifier)}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-muted-foreground">
              {selectedOpponent.description}
            </p>
            <div className="flex flex-wrap gap-2">
              <div className="text-sm">
                <span className="font-medium">Spell Style:</span>{" "}
                {selectedOpponent.spellStyle}
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedOpponent.personalityTraits.map((trait, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {trait}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wizard Selection */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Choose Your Wizard</h2>

        {eligibleWizards.length === 0 ? (
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950">
            <CardContent className="py-8 text-center">
              <Target className="w-12 h-12 mx-auto mb-4 text-amber-600 dark:text-amber-400" />
              <p className="text-amber-700 dark:text-amber-300 font-medium mb-2">
                No wizards are eligible to battle {selectedOpponent.name}.
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Make sure you have wizards that haven&apos;t completed the
                campaign and are ready to face opponent #
                {selectedOpponent.opponentNumber}.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="campaign-grid">
            {eligibleWizards.map((wizardData, index) => (
              <div
                key={wizardData.wizard._id}
                className="animate-opponent-reveal"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CampaignWizardProgress
                  wizardData={wizardData}
                  campaignOpponents={campaignOpponents}
                  onSelectWizard={onWizardSelect}
                  isSelected={wizardData.wizard._id === selectedWizardId}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Battle Button */}
      {selectedWizard && (
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:border-blue-800 dark:from-blue-950 dark:to-indigo-950 animate-campaign-glow">
          <CardContent className="py-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-semibold text-lg bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                  ⚔️ Ready to Battle!
                </h3>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">
                    {selectedWizard.wizard.name}
                  </span>{" "}
                  vs{" "}
                  <span className="font-medium">{selectedOpponent.name}</span>
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Opponent #{selectedOpponent.opponentNumber} •{" "}
                  {selectedOpponent.difficulty}
                </p>
              </div>
              <Button
                onClick={onStartBattle}
                disabled={isStartingBattle}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg campaign-card-hover"
              >
                <Swords className="w-4 h-4 mr-2" />
                {isStartingBattle ? "Starting Battle..." : "Start Battle"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
