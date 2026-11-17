"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import Link from "next/link";
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
import { RegistrationPrompt } from "@/components/RegistrationPrompt";
import { WaitlistGuard } from "@/components/WaitlistGuard";
import { CampaignErrorBoundary } from "@/components/CampaignErrorBoundary";
import { CampaignLoadingState } from "@/components/CampaignLoadingState";
import { CampaignOpponentFan } from "@/components/CampaignOpponentFan";
import { ConvexImage } from "@/components/ConvexImage";
import { Scroll, Wand2, Plus, Crown, Target, Award } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

// Define enhanced wizard type from getUserWizards query
type EnhancedWizard = Doc<"wizards"> & {
  hasCompletionRelic: boolean;
  effectiveLuckScore: number;
};

// Define wizard with progress type
type WizardWithProgress = {
  wizard: EnhancedWizard;
  progress?: Doc<"wizardCampaignProgress">;
};

// Campaign Wizard Card Component
function CampaignWizardCard({
  wizardData,
}: {
  wizardData: WizardWithProgress;
}) {
  const { wizard, progress } = wizardData;

  // Calculate campaign statistics
  const defeatedOpponents = progress?.defeatedOpponents.length || 0;
  const currentOpponent = progress?.currentOpponent || 1;
  const isCompleted = progress?.currentOpponent === 11;
  const hasRelic = progress?.hasCompletionRelic || false;

  return (
    <WaitlistGuard>
      <Link href={`/campaign/wizard/${wizard._id}`} className="block">
        <Card className="overflow-hidden bg-card/90 backdrop-blur-sm shadow-lg dark:shadow-xl hover:shadow-xl dark:hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-[1.02] border-border/50">
          {/* Large Wizard Image */}
          <div className="relative">
            {wizard.illustration && (
              <div className="h-64 w-full overflow-hidden">
                <ConvexImage
                  storageId={wizard.illustration}
                  alt={wizard.name}
                  width={400}
                  height={256}
                  className="w-full h-full object-cover object-top transition-transform duration-300 hover:scale-105"
                />
              </div>
            )}

            {/* Status Badges */}
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              {hasRelic && (
                <Badge
                  variant="default"
                  className="flex items-center gap-1 bg-primary text-primary-foreground border-primary/50 backdrop-blur-sm font-bold"
                  title={`Campaign Relic (+1 Luck, Effective Luck: ${(wizard as EnhancedWizard).effectiveLuckScore || 11})`}
                >
                  <Award className="h-3 w-3" />
                  Relic
                </Badge>
              )}
              {isCompleted && (
                <Badge
                  variant="default"
                  className="flex items-center gap-1 bg-warning/90 text-warning-foreground border-warning/50 backdrop-blur-sm font-bold"
                >
                  <Crown className="h-3 w-3" />
                  Complete
                </Badge>
              )}
            </div>
          </div>

          {/* Wizard Info */}
          <CardHeader className="pb-3">
            <CardTitle className="text-xl text-foreground mb-2">
              {wizard.name}
            </CardTitle>

            {/* Campaign Statistics */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Progress:</span>
                <span className="font-medium text-foreground">
                  {defeatedOpponents}/10 opponents
                </span>
              </div>

              {!isCompleted && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Next opponent:</span>
                  <span className="font-medium text-foreground">
                    #{currentOpponent}
                  </span>
                </div>
              )}

              {hasRelic && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Luck bonus:</span>
                  <span className="font-medium text-primary">+1 (Relic)</span>
                </div>
              )}
            </div>
          </CardHeader>
        </Card>
      </Link>
    </WaitlistGuard>
  );
}

export default function CampaignPage() {
  const { user } = useUser();

  // Get campaign opponents
  const campaignOpponents = useQuery(api.campaigns.getCampaignOpponents);

  // Get user's wizards and their campaign progress
  const userWizards = useQuery(
    api.wizards.getUserWizards,
    user?.id ? {} : "skip",
  ) as EnhancedWizard[] | undefined;

  const campaignProgress = useQuery(
    api.campaigns.getUserCampaignProgress,
    user?.id ? { userId: user.id } : "skip",
  );

  // Show registration prompt for anonymous users
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
        <div className="max-w-4xl mx-auto">
          <PageHeader
            title="Campaign Mode"
            description="Embark on an epic single-player journey through 10 challenging AI
              opponents"
            icon={<Scroll className="h-6 w-6" aria-hidden="true" />}
          />

          <RegistrationPrompt context="premium_features" />

          <div className="mt-8 grid md:grid-cols-2 gap-6">
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Progressive Challenge
                </CardTitle>
                <CardDescription>
                  Face 10 unique AI opponents with increasing difficulty levels
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-warning" />
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
      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
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
      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
        <div className="max-w-4xl mx-auto">
          <PageHeader
            title="Campaign Mode"
            description="Embark on an epic single-player journey through 10 challenging AI
              opponents"
            icon={<Scroll className="h-6 w-6" aria-hidden="true" />}
          />

          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-center justify-center">
                <Wand2 className="h-6 w-6 text-primary" />
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
              <WaitlistGuard>
                <div className="flex justify-center gap-4">
                  <Button asChild>
                    <Link href="/wizards/create">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Wizard
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/wizards">View Wizards</Link>
                  </Button>
                </div>
              </WaitlistGuard>
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
    };
  });

  return (
    <CampaignErrorBoundary>
      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
        {/* Header */}
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 text-center">
            <CampaignOpponentFan opponents={campaignOpponents} />
            <PageHeader
              title="Single Player Campaign"
              description="If you can defeat 10 AI powered wizards, you can earn a permanent
              +1 luck boost for your wizards"
              icon={<Scroll className="h-6 w-6" aria-hidden="true" />}
            />

            {/* Wizard Cards */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4 flex items-center justify-center gap-2 font-display">
                <Wand2 className="h-6 w-6 text-primary" />
                Your Campaign Wizards
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {wizardsWithProgress.map((wizardData) => (
                  <CampaignWizardCard
                    key={wizardData.wizard._id}
                    wizardData={wizardData}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </CampaignErrorBoundary>
  );
}
