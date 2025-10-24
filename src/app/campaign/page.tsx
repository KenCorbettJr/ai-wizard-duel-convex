"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { RegistrationPrompt } from "@/components/RegistrationPrompt";
import { CampaignErrorBoundary } from "@/components/CampaignErrorBoundary";
import { CampaignLoadingState } from "@/components/CampaignLoadingState";
import {
  Scroll,
  Wand2,
  Trophy,
  Sparkles,
  Plus,
  Crown,
  Target,
  Swords,
  Lock,
  CheckCircle,
  Star,
  Shield,
  Zap,
  Users,
} from "lucide-react";

// Define wizard with progress type
type WizardWithProgress = {
  wizard: Doc<"wizards">;
  progress?: Doc<"wizardCampaignProgress">;
  effectiveLuckScore: number;
};

export default function CampaignPage() {
  const { user } = useUser();
  const [selectedWizardId, setSelectedWizardId] = useState<string | null>(null);

  // Get campaign opponents
  const campaignOpponents = useQuery(api.campaigns.getCampaignOpponents);

  // Get user's wizards and their campaign progress
  const userWizards = useQuery(
    api.wizards.getUserWizards,
    user?.id ? {} : "skip"
  );

  const campaignProgress = useQuery(
    api.campaigns.getUserCampaignProgress,
    user?.id ? { userId: user.id } : "skip"
  );

  // Show registration prompt for anonymous users
  if (!user) {
    return (
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Scroll className="h-12 w-12 text-purple-600 dark:text-purple-400" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
                Campaign Mode
              </h1>
            </div>
            <p className="text-xl text-muted-foreground mb-8">
              Embark on an epic single-player journey through 10 challenging AI
              opponents
            </p>
          </div>

          <RegistrationPrompt context="premium_features" />

          <div className="mt-8 grid md:grid-cols-2 gap-6">
            <Card className="border-purple-200 dark:border-purple-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  Progressive Challenge
                </CardTitle>
                <CardDescription>
                  Face 10 unique AI opponents with increasing difficulty levels
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-purple-200 dark:border-purple-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  Earn Relics
                </CardTitle>
                <CardDescription>
                  Complete the campaign to earn permanent +1 luck boost relics
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (userWizards === undefined || campaignOpponents === undefined) {
    return (
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <CampaignLoadingState
            type="general"
            message="Loading opponents and wizard data..."
          />
        </div>
      </div>
    );
  }

  // Show wizard creation prompt if user has no wizards
  if (userWizards.length === 0) {
    return (
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Scroll className="h-12 w-12 text-purple-600 dark:text-purple-400" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
                Campaign Mode
              </h1>
            </div>
            <p className="text-xl text-muted-foreground mb-8">
              Embark on an epic single-player journey through 10 challenging AI
              opponents
            </p>
          </div>

          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-center justify-center">
                <Wand2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                Create Your First Wizard
              </CardTitle>
              <CardDescription className="text-center">
                You need at least one wizard to begin your campaign journey
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                The campaign mode allows you to take your wizards through a
                series of increasingly difficult battles against unique AI
                opponents. Each wizard progresses individually through the
                campaign.
              </p>
              <div className="flex justify-center gap-4">
                <Link href="/wizards/create">
                  <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Wizard
                  </Button>
                </Link>
                <Link href="/wizards">
                  <Button variant="outline">View Wizards</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Transform userWizards data to include progress
  const wizardsWithProgress = userWizards.map((wizard) => {
    const progress = campaignProgress?.find((p) => p.wizardId === wizard._id);
    return {
      wizard,
      progress,
      effectiveLuckScore: wizard.effectiveLuckScore,
    };
  });

  // Get selected wizard data
  const selectedWizard = selectedWizardId
    ? wizardsWithProgress.find((w) => w.wizard._id === selectedWizardId)
    : null;

  // Get opponent status for selected wizard
  const getOpponentStatusForWizard = (
    opponentNumber: number,
    wizardData?: WizardWithProgress
  ) => {
    if (!wizardData?.progress) {
      return {
        isUnlocked: opponentNumber === 1,
        isDefeated: false,
        isCurrent: opponentNumber === 1,
        canBattle: opponentNumber === 1,
      };
    }

    const progress = wizardData.progress;
    const isDefeated = progress.defeatedOpponents.includes(opponentNumber);
    const isCurrent = progress.currentOpponent === opponentNumber;
    const isUnlocked = isCurrent || isDefeated;
    const canBattle = isCurrent && !isDefeated;

    return { isUnlocked, isDefeated, isCurrent, canBattle };
  };

  // Handle starting a battle
  const handleStartBattle = (opponentNumber: number) => {
    if (!selectedWizardId) return;
    if (typeof window !== "undefined") {
      window.location.href = `/campaign/wizard-selection/${opponentNumber}?wizardId=${selectedWizardId}`;
    }
  };

  // Get difficulty styling
  const getDifficultyConfig = (difficulty: string) => {
    switch (difficulty) {
      case "BEGINNER":
        return {
          color:
            "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
          icon: Shield,
        };
      case "INTERMEDIATE":
        return {
          color:
            "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
          icon: Star,
        };
      case "ADVANCED":
        return {
          color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
          icon: Zap,
        };
      default:
        return {
          color:
            "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
          icon: Star,
        };
    }
  };

  return (
    <CampaignErrorBoundary>
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Scroll className="h-12 w-12 text-purple-600 dark:text-purple-400" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
                Campaign Mode
              </h1>
            </div>
            <p className="text-xl text-muted-foreground mb-6">
              Challenge 10 unique AI opponents to earn powerful relics
            </p>
          </div>

          {/* Wizard Selection */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Wand2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              Choose Your Wizard
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {wizardsWithProgress.map((wizardData) => {
                const progress = wizardData.progress;
                const defeatedCount = progress?.defeatedOpponents.length || 0;
                const progressPercentage = (defeatedCount / 10) * 100;
                const nextOpponent = progress?.currentOpponent || 1;
                const hasRelic = progress?.hasCompletionRelic || false;
                const isSelected = selectedWizardId === wizardData.wizard._id;

                return (
                  <Card
                    key={wizardData.wizard._id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                      isSelected
                        ? "ring-2 ring-purple-500 border-purple-300 dark:border-purple-600"
                        : "hover:border-purple-200 dark:hover:border-purple-700"
                    }`}
                    onClick={() => setSelectedWizardId(wizardData.wizard._id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage
                            src={wizardData.wizard.illustrationURL || undefined}
                            alt={wizardData.wizard.name}
                          />
                          <AvatarFallback className="bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400">
                            {wizardData.wizard.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">
                            {wizardData.wizard.name}
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {defeatedCount}/10
                            </span>
                            {hasRelic && (
                              <Crown className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Progress value={progressPercentage} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {defeatedCount === 10
                            ? "Campaign Complete!"
                            : `Next: Opponent ${nextOpponent}`}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Create New Wizard Card */}
              <Link href="/wizards/create">
                <Card className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-purple-200 dark:hover:border-purple-700 border-dashed">
                  <CardContent className="p-4 flex flex-col items-center justify-center h-full min-h-[140px]">
                    <Plus className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium text-muted-foreground text-center">
                      Create New Wizard
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>

          {/* Campaign Opponents */}
          {selectedWizard && campaignOpponents && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Target className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  Campaign Opponents
                </h2>
                <div className="text-sm text-muted-foreground">
                  Progress:{" "}
                  {selectedWizard.progress?.defeatedOpponents.length || 0}/10
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {campaignOpponents.map((opponent) => {
                  if (!opponent.opponentNumber) return null;

                  const status = getOpponentStatusForWizard(
                    opponent.opponentNumber,
                    selectedWizard
                  );
                  const difficultyConfig = getDifficultyConfig(
                    opponent.difficulty || "BEGINNER"
                  );
                  const DifficultyIcon = difficultyConfig.icon;

                  return (
                    <Card
                      key={opponent._id}
                      className={`transition-all duration-200 ${
                        status.isDefeated
                          ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 opacity-75"
                          : status.canBattle
                            ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950 ring-2 ring-blue-300 cursor-pointer hover:shadow-lg"
                            : status.isUnlocked
                              ? "border-purple-200 hover:border-purple-300 dark:border-purple-700 dark:hover:border-purple-600 cursor-pointer hover:shadow-lg"
                              : "border-gray-200 dark:border-gray-700 opacity-50 grayscale"
                      }`}
                      onClick={() =>
                        status.canBattle &&
                        handleStartBattle(opponent.opponentNumber!)
                      }
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-muted-foreground">
                            #{opponent.opponentNumber}
                          </span>
                          <div className="flex items-center gap-1">
                            {status.isDefeated && (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                            {!status.isUnlocked && (
                              <Lock className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                        </div>

                        <div className="text-center mb-4">
                          <Avatar className="h-16 w-16 mx-auto mb-2">
                            <AvatarFallback className="bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 text-lg">
                              {opponent.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <h3 className="font-semibold text-sm mb-1">
                            {opponent.name}
                          </h3>
                          <Badge
                            className={`${difficultyConfig.color} text-xs`}
                          >
                            <DifficultyIcon className="h-3 w-3 mr-1" />
                            {opponent.difficulty}
                          </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground text-center mb-4 line-clamp-2">
                          {opponent.description}
                        </p>

                        <div className="text-center">
                          {status.isDefeated ? (
                            <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400 text-xs font-medium">
                              <CheckCircle className="h-3 w-3" />
                              Defeated
                            </div>
                          ) : !status.isUnlocked ? (
                            <div className="flex items-center justify-center gap-1 text-gray-400 text-xs">
                              <Lock className="h-3 w-3" />
                              Locked
                            </div>
                          ) : status.canBattle ? (
                            <Button size="sm" className="w-full text-xs">
                              <Swords className="h-3 w-3 mr-1" />
                              Battle Now
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-xs"
                              disabled
                            >
                              Not Available
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* No Wizard Selected State */}
          {!selectedWizard && userWizards.length > 0 && (
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                Select a Wizard to Begin
              </h3>
              <p className="text-muted-foreground">
                Choose one of your wizards above to see available opponents and
                start your campaign journey.
              </p>
            </div>
          )}

          {/* Campaign Statistics */}
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  Completed Campaigns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {campaignProgress?.filter((p) => p.hasCompletionRelic)
                    .length || 0}
                </div>
                <p className="text-sm text-muted-foreground">
                  Wizards with relics
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  Active Campaigns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {campaignProgress?.filter(
                    (p) => !p.hasCompletionRelic && p.currentOpponent <= 10
                  ).length || 0}
                </div>
                <p className="text-sm text-muted-foreground">
                  Wizards in progress
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  Total Wizards
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {userWizards.length}
                </div>
                <p className="text-sm text-muted-foreground">
                  Ready for adventure
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </CampaignErrorBoundary>
  );
}
