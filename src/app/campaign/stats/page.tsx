"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RegistrationPrompt } from "@/components/RegistrationPrompt";
import { CampaignStats } from "@/components/CampaignStats";
import { CampaignBattleHistory } from "@/components/CampaignBattleHistory";
import { CampaignErrorBoundary } from "@/components/CampaignErrorBoundary";
import { ArrowLeft, Trophy, Scroll } from "lucide-react";

export default function CampaignStatsPage() {
  const { user } = useUser();

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

  return (
    <CampaignErrorBoundary>
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8 animate-fade-in">
            <Link href="/campaign">
              <Button variant="ghost" className="mb-4 campaign-card-hover">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Campaign
              </Button>
            </Link>

            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Trophy className="h-12 w-12 text-yellow-600 dark:text-yellow-400 animate-magical-sparkle" />
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
                  Campaign Statistics
                </h1>
                <Scroll className="h-12 w-12 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="text-xl text-muted-foreground">
                Track your progress through the magical campaign
              </p>
            </div>
          </div>

          {/* Campaign Statistics Component */}
          <CampaignStats
            userId={user.id}
            showDetailedProgress={true}
            showRecentActivity={true}
            compact={false}
          />

          {/* Campaign Battle History */}
          <CampaignBattleHistory
            userId={user.id}
            limit={15}
            showWizardName={true}
          />

          {/* Quick Actions */}
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4 animate-fade-in">
            <Link href="/campaign">
              <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 campaign-card-hover shadow-lg">
                Continue Campaign
              </Button>
            </Link>
            <Link href="/wizards/create">
              <Button
                variant="outline"
                className="border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/30 campaign-card-hover"
              >
                Create New Wizard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </CampaignErrorBoundary>
  );
}
