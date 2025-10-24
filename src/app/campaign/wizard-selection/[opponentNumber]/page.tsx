"use client";

import { use } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "../../../../../convex/_generated/api";
import { Id, Doc } from "../../../../../convex/_generated/dataModel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { RegistrationPrompt } from "@/components/RegistrationPrompt";
import { ArrowLeft, Swords, Wand2, AlertCircle } from "lucide-react";
import Link from "next/link";

interface WizardSelectionPageProps {
  params: Promise<{
    opponentNumber: string;
  }>;
}

export default function WizardSelectionPage({
  params,
}: WizardSelectionPageProps) {
  const { user } = useUser();
  const router = useRouter();
  const { opponentNumber } = use(params);
  const [selectedWizardId, setSelectedWizardId] =
    useState<Id<"wizards"> | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const opponentNum = parseInt(opponentNumber);

  // Get campaign opponent data
  const campaignOpponents = useQuery(api.campaigns.getCampaignOpponents);
  const selectedOpponent = campaignOpponents?.find(
    (op: Doc<"wizards">) => op.opponentNumber === opponentNum
  );

  // Get user's wizards and their campaign progress
  const userWizards = useQuery(
    api.wizards.getUserWizards,
    user?.id ? {} : "skip"
  );

  const campaignProgress = useQuery(
    api.campaigns.getUserCampaignProgress,
    user?.id ? { userId: user.id } : "skip"
  );

  // Start campaign battle mutation
  const startCampaignBattle = useMutation(api.campaigns.startCampaignBattle);

  // Show registration prompt for anonymous users
  if (!user) {
    return (
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <RegistrationPrompt context="premium_features" />
        </div>
      </div>
    );
  }

  // Show loading state
  if (
    userWizards === undefined ||
    campaignOpponents === undefined ||
    campaignProgress === undefined
  ) {
    return (
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 dark:border-purple-400 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading campaign data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Validate opponent number
  if (
    isNaN(opponentNum) ||
    opponentNum < 1 ||
    opponentNum > 10 ||
    !selectedOpponent
  ) {
    return (
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Invalid Opponent
              </CardTitle>
              <CardDescription>
                The opponent number must be between 1 and 10.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/campaign">
                <Button>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Campaign
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Get eligible wizards (those who can face this opponent)
  const eligibleWizards = userWizards.filter((wizard: Doc<"wizards">) => {
    const progress = campaignProgress.find(
      (p: Doc<"wizardCampaignProgress">) => p.wizardId === wizard._id
    );
    if (!progress) {
      // New wizard can only face opponent 1
      return opponentNum === 1;
    }
    // Wizard can face the next opponent in sequence
    return progress.currentOpponent === opponentNum;
  });

  const handleStartBattle = async () => {
    if (!selectedWizardId) return;

    setIsStarting(true);
    try {
      const battleId = await startCampaignBattle({
        wizardId: selectedWizardId,
        opponentNumber: opponentNum,
      });

      // Navigate to the battle
      router.push(`/duels/${battleId}`);
    } catch (error) {
      console.error("Failed to start campaign battle:", error);
      setIsStarting(false);
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case "BEGINNER":
        return (
          <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
            Beginner
          </Badge>
        );
      case "INTERMEDIATE":
        return (
          <Badge className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200">
            Intermediate
          </Badge>
        );
      case "ADVANCED":
        return (
          <Badge className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200">
            Advanced
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/campaign">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Campaign
            </Button>
          </Link>

          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Challenge Opponent #{opponentNum}
            </h1>
            <p className="text-muted-foreground">
              Select a wizard to battle against this AI opponent
            </p>
          </div>
        </div>

        {/* Opponent Display */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Swords className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            Your Opponent
          </h2>

          <Card className="border-purple-200 dark:border-purple-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {selectedOpponent.name}
                  {getDifficultyBadge(
                    selectedOpponent.difficulty || "BEGINNER"
                  )}
                </CardTitle>
                <div className="text-sm text-muted-foreground">
                  Luck Modifier:{" "}
                  {(selectedOpponent.luckModifier || 0) > 0 ? "+" : ""}
                  {selectedOpponent.luckModifier || 0}
                </div>
              </div>
              <CardDescription>{selectedOpponent.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <span className="font-medium">Spell Style:</span>{" "}
                  {selectedOpponent.spellStyle}
                </div>
                <div>
                  <span className="font-medium">Personality:</span>{" "}
                  {selectedOpponent.personalityTraits?.join(", ") || "Unknown"}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Wizard Selection */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            Select Your Wizard
          </h2>

          {eligibleWizards.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  No Eligible Wizards
                </h3>
                <p className="text-muted-foreground mb-4">
                  {opponentNum === 1
                    ? "You need to create a wizard to start the campaign."
                    : `None of your wizards are ready to face opponent #${opponentNum}. Complete the previous opponents first.`}
                </p>
                <div className="flex gap-2 justify-center">
                  {opponentNum === 1 && (
                    <Link href="/wizards/create">
                      <Button>Create Wizard</Button>
                    </Link>
                  )}
                  <Link href="/campaign">
                    <Button variant="outline">Back to Campaign</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {eligibleWizards.map((wizard: Doc<"wizards">) => {
                const progress = campaignProgress.find(
                  (p: Doc<"wizardCampaignProgress">) =>
                    p.wizardId === wizard._id
                );
                const isSelected = selectedWizardId === wizard._id;

                return (
                  <Card
                    key={wizard._id}
                    className={`cursor-pointer transition-all ${
                      isSelected
                        ? "border-purple-500 bg-purple-50 dark:bg-purple-950/50"
                        : "border-border hover:border-muted-foreground"
                    }`}
                    onClick={() => setSelectedWizardId(wizard._id)}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Wand2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          {wizard.name}
                        </CardTitle>
                        {isSelected && (
                          <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">
                        {wizard.description}
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <span>
                          Campaign Progress:{" "}
                          {progress?.defeatedOpponents.length || 0} / 10
                        </span>
                        <span>
                          Next Opponent: #{progress?.currentOpponent || 1}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Start Battle Button */}
        {eligibleWizards.length > 0 && (
          <div className="text-center">
            <Button
              onClick={handleStartBattle}
              disabled={!selectedWizardId || isStarting}
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              {isStarting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-2"></div>
                  Starting Battle...
                </>
              ) : (
                <>
                  <Swords className="h-4 w-4 mr-2" />
                  Start Campaign Battle
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
