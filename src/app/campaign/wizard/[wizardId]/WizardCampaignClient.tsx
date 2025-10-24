"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { RegistrationPrompt } from "@/components/RegistrationPrompt";
import { CampaignErrorBoundary } from "@/components/CampaignErrorBoundary";
import { CampaignLoadingState } from "@/components/CampaignLoadingState";

import { ConvexImage } from "@/components/ConvexImage";
import {
  Scroll,
  Trophy,
  Sparkles,
  ArrowLeft,
  Crown,
  Target,
  Swords,
  Lock,
  CheckCircle,
  Star,
  Shield,
  Zap,
} from "lucide-react";
import Image from "next/image";

export default function WizardCampaignClient() {
  const { user } = useUser();
  const params = useParams();
  const router = useRouter();
  const wizardId = params.wizardId as Id<"wizards">;

  // Get campaign opponents
  const campaignOpponents = useQuery(api.campaigns.getCampaignOpponents);

  // Get the specific wizard
  const wizard = useQuery(
    api.wizards.getWizard,
    wizardId ? { wizardId } : "skip"
  );

  // Get wizard's campaign progress
  const wizardProgress = useQuery(
    api.campaigns.getWizardCampaignProgress,
    wizardId ? { wizardId } : "skip"
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
                Wizard Campaign
              </h1>
            </div>
            <p className="text-xl text-muted-foreground mb-8">
              Embark on an epic single-player journey through 10 challenging AI
              opponents
            </p>
          </div>

          <RegistrationPrompt context="premium_features" />
        </div>
      </div>
    );
  }

  // Show loading state
  if (wizard === undefined || campaignOpponents === undefined) {
    return (
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <CampaignLoadingState
            type="general"
            message="Loading wizard and campaign data..."
          />
        </div>
      </div>
    );
  }

  // Show error if wizard not found or not owned by user
  if (!wizard || wizard.owner !== user.id) {
    return (
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Wizard Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The wizard you&apos;re looking for doesn&apos;t exist or you
            don&apos;t have access to it.
          </p>
          <Link href="/campaign">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Campaign
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Get opponent status for this wizard
  const getOpponentStatus = (opponentNumber: number) => {
    if (!wizardProgress) {
      return {
        isUnlocked: opponentNumber === 1,
        isDefeated: false,
        isCurrent: opponentNumber === 1,
        canBattle: opponentNumber === 1,
      };
    }

    const isDefeated =
      wizardProgress.defeatedOpponents.includes(opponentNumber);
    const isCurrent = wizardProgress.currentOpponent === opponentNumber;
    const isUnlocked = isCurrent || isDefeated;
    const canBattle = isCurrent && !isDefeated;

    return { isUnlocked, isDefeated, isCurrent, canBattle };
  };

  // Handle starting a battle
  const handleStartBattle = (opponentNumber: number) => {
    router.push(
      `/campaign/wizard-selection/${opponentNumber}?wizardId=${wizardId}`
    );
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

  const defeatedCount = wizardProgress?.defeatedOpponents.length || 0;
  const isCompleted = defeatedCount === 10;
  const progressPercentage = (defeatedCount / 10) * 100;

  return (
    <CampaignErrorBoundary>
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header with Back Button */}
          <div className="mb-8">
            <Link href="/campaign">
              <Button variant="ghost" className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Campaign
              </Button>
            </Link>

            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Scroll className="h-12 w-12 text-purple-600 dark:text-purple-400" />
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
                  {wizard.name}&apos;s Campaign
                </h1>
              </div>
              <p className="text-xl text-muted-foreground mb-6">
                Challenge 10 unique AI opponents to earn a powerful relic
              </p>
            </div>
          </div>

          {/* Wizard Info Card */}
          <div className="mb-8">
            <Card className="max-w-4xl mx-auto">
              <CardContent className="p-6">
                <div className="flex items-center gap-8">
                  {/* Wizard Image - Made Larger */}
                  <div className="w-32 h-32 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
                    {wizard.illustration ? (
                      <ConvexImage
                        storageId={wizard.illustration}
                        alt={wizard.name}
                        width={128}
                        height={128}
                        className="w-full h-full object-cover"
                      />
                    ) : wizard.illustrationURL ? (
                      <Image
                        src={wizard.illustrationURL}
                        alt={wizard.name}
                        width={128}
                        height={128}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-bold text-3xl">
                        {wizard.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Wizard Details - Expanded */}
                  <div className="flex-1">
                    <h2 className="text-3xl font-bold mb-3">{wizard.name}</h2>
                    <p className="text-muted-foreground mb-6 text-lg">
                      {wizard.description}
                    </p>

                    {/* Progress */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-base font-medium">
                          Campaign Progress
                        </span>
                        <span className="text-base text-muted-foreground">
                          {defeatedCount}/10 opponents defeated
                        </span>
                      </div>
                      <Progress value={progressPercentage} className="h-3" />

                      {isCompleted ? (
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mt-3">
                          <Crown className="h-5 w-5" />
                          <span className="text-base font-medium">
                            Campaign Completed! Relic Earned
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mt-3">
                          <Target className="h-5 w-5" />
                          <span className="text-base font-medium">
                            Next: Opponent{" "}
                            {wizardProgress?.currentOpponent || 1}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Campaign Opponents Grid */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Target className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                Campaign Opponents
              </h2>
              <div className="text-sm text-muted-foreground">
                Progress: {defeatedCount}/10
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {campaignOpponents.map((opponent) => {
                if (!opponent.opponentNumber) return null;

                const status = getOpponentStatus(opponent.opponentNumber);
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
                        <Badge className={`${difficultyConfig.color} text-xs`}>
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

          {/* Campaign Statistics */}
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  Opponents Defeated
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {defeatedCount}
                </div>
                <p className="text-sm text-muted-foreground">Out of 10 total</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  Current Opponent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {isCompleted
                    ? "Complete"
                    : wizardProgress?.currentOpponent || 1}
                </div>
                <p className="text-sm text-muted-foreground">
                  {isCompleted ? "Campaign finished" : "Next challenge"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  Completion Relic
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {wizardProgress?.hasCompletionRelic ? "✓" : "—"}
                </div>
                <p className="text-sm text-muted-foreground">
                  {wizardProgress?.hasCompletionRelic ? "Earned" : "Not earned"}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </CampaignErrorBoundary>
  );
}
