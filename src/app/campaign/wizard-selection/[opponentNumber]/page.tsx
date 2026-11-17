"use client";

import { use, Suspense } from "react";
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
import { RuneSpinner } from "@/components/ui/rune-spinner";
import { PageHeader } from "@/components/PageHeader";

interface WizardSelectionPageProps {
  params: Promise<{
    opponentNumber: string;
  }>;
}

function WizardSelectionContent({ params }: WizardSelectionPageProps) {
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
    (op: Doc<"wizards">) => op.opponentNumber === opponentNum,
  );

  // Get user's wizards and their campaign progress
  const userWizards = useQuery(
    api.wizards.getUserWizards,
    user?.id ? {} : "skip",
  );

  const campaignProgress = useQuery(
    api.campaigns.getUserCampaignProgress,
    user?.id ? { userId: user.id } : "skip",
  );

  // Start campaign battle mutation
  const startCampaignBattle = useMutation(api.campaigns.startCampaignBattle);

  // Show registration prompt for anonymous users
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
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
      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <RuneSpinner size="md" label="Loading…" />
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
      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
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
              <Button asChild>
                <Link href="/campaign">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Campaigns
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Get eligible wizards (those who can face this opponent)
  const eligibleWizards = userWizards.filter((wizard: Doc<"wizards">) => {
    const progress = campaignProgress.find(
      (p: Doc<"wizardCampaignProgress">) => p.wizardId === wizard._id,
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
      const battleResult = await startCampaignBattle({
        wizardId: selectedWizardId,
        opponentNumber: opponentNum,
      });

      // Navigate to the battle using the duelId
      router.push(`/duels/${battleResult.duelId}`);
    } catch (error) {
      console.error("Failed to start campaign battle:", error);
      setIsStarting(false);
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case "BEGINNER":
        return <Badge className="bg-success/15 text-success">Beginner</Badge>;
      case "INTERMEDIATE":
        return (
          <Badge className="bg-warning/15 text-warning">Intermediate</Badge>
        );
      case "ADVANCED":
        return (
          <Badge className="bg-destructive/15 text-destructive">Advanced</Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button asChild variant="ghost" className="mb-4">
            <Link href="/campaign">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Campaigns
            </Link>
          </Button>

          <PageHeader
            title={`Challenge Opponent #{opponentNum}`}
            description="Select a wizard to battle against this AI opponent"
            icon={<Swords className="h-6 w-6" aria-hidden="true" />}
          />
        </div>

        {/* Opponent Display */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Swords className="h-5 w-5 text-primary" />
            Your Opponent
          </h2>

          <Card className="border-primary/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {selectedOpponent.name}
                  {getDifficultyBadge(
                    selectedOpponent.difficulty || "BEGINNER",
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
            <Wand2 className="h-5 w-5 text-primary" />
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
                    <Button asChild>
                      <Link href="/wizards/create">Create Wizard</Link>
                    </Button>
                  )}
                  <Button asChild variant="outline">
                    <Link href="/campaign">Back to Campaigns</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {eligibleWizards.map((wizard: Doc<"wizards">) => {
                const progress = campaignProgress.find(
                  (p: Doc<"wizardCampaignProgress">) =>
                    p.wizardId === wizard._id,
                );
                const isSelected = selectedWizardId === wizard._id;

                return (
                  <Card
                    key={wizard._id}
                    className={`cursor-pointer transition-all ${
                      isSelected
                        ? "border-primary bg-primary/8"
                        : "border-border hover:border-muted-foreground"
                    }`}
                    onClick={() => setSelectedWizardId(wizard._id)}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Wand2 className="h-5 w-5 text-primary" />
                          {wizard.name}
                        </CardTitle>
                        {isSelected && (
                          <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
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
            >
              {isStarting ? (
                <>
                  <RuneSpinner size="sm" label="Loading" />
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

function LoadingFallback() {
  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <RuneSpinner size="md" label="Loading…" />
          <p className="text-muted-foreground">Loading wizard selection...</p>
        </div>
      </div>
    </div>
  );
}

export default function WizardSelectionPage({
  params,
}: WizardSelectionPageProps) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <WizardSelectionContent params={params} />
    </Suspense>
  );
}
