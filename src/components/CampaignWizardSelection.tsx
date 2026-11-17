"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WizardSelectionCard } from "./WizardSelectionCard";
import { ArrowLeft, Swords, Target, Wand2 } from "lucide-react";
import type { Doc } from "../../convex/_generated/dataModel";
import { PageHeader } from "@/components/PageHeader";

interface WizardWithProgress {
  wizard: Doc<"wizards">;
  progress?: Doc<"wizardCampaignProgress">;
  effectiveLuckScore: number;
}

interface CampaignWizardSelectionProps {
  wizards: WizardWithProgress[];
  selectedOpponent: Doc<"wizards">;
  campaignOpponents: Doc<"wizards">[];
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
        return "bg-success/15 text-success";
      case "INTERMEDIATE":
        return "bg-warning/15 text-warning";
      case "ADVANCED":
        return "bg-destructive/15 text-destructive";
      default:
        return "bg-muted text-foreground";
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
          <PageHeader
            className="mb-0"
            title="Select Your Wizard"
            description={`Choose a wizard to battle {selectedOpponent.name}`}
            icon={<Wand2 className="h-6 w-6" aria-hidden="true" />}
          />
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
                className={getDifficultyColor(
                  selectedOpponent.difficulty || "BEGINNER",
                )}
              >
                {selectedOpponent.difficulty}
              </Badge>
              <Badge variant="outline">
                {getLuckModifierText(selectedOpponent.luckModifier || 0)}
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
              {selectedOpponent.personalityTraits?.map((trait, index) => (
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
        <h2 className="font-display text-xl font-semibold">
          Choose Your Wizard
        </h2>

        {eligibleWizards.length === 0 ? (
          <Card className="border-warning/40 bg-warning/10">
            <CardContent className="py-8 text-center">
              <Target className="w-12 h-12 mx-auto mb-4 text-warning" />
              <p className="text-warning font-medium mb-2">
                No wizards are eligible to battle {selectedOpponent.name}.
              </p>
              <p className="text-sm text-warning">
                Make sure you have wizards that haven&apos;t completed the
                campaign and are ready to face opponent #
                {selectedOpponent.opponentNumber}.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {eligibleWizards.map((wizardData, index) => (
              <div
                key={wizardData.wizard._id}
                className="animate-opponent-reveal"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <WizardSelectionCard
                  wizardData={wizardData}
                  isSelected={wizardData.wizard._id === selectedWizardId}
                  onSelect={onWizardSelect}
                  showCampaignProgress={true}
                  campaignOpponents={campaignOpponents}
                  variant="detailed"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Battle Button */}
      {selectedWizard && (
        <Card className="border-info/40 bg-linear-to-r from-info/20 to-info/5 animate-campaign-glow">
          <CardContent className="py-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-semibold text-lg text-foreground">
                  ⚔️ Ready to Battle!
                </h3>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">
                    {selectedWizard.wizard.name}
                  </span>{" "}
                  vs{" "}
                  <span className="font-medium">{selectedOpponent.name}</span>
                </p>
                <p className="text-xs text-info">
                  Opponent #{selectedOpponent.opponentNumber} •{" "}
                  {selectedOpponent.difficulty}
                </p>
              </div>
              <Button
                onClick={onStartBattle}
                disabled={isStartingBattle}
                size="lg"
                className="shadow-lg campaign-card-hover"
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
