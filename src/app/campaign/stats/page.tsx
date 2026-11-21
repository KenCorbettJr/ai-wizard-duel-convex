"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RegistrationPrompt } from "@/components/RegistrationPrompt";
import { CampaignStats } from "@/components/CampaignStats";
import { CampaignBattleHistory } from "@/components/CampaignBattleHistory";
import { CampaignErrorBoundary } from "@/components/CampaignErrorBoundary";
import { ArrowLeft, Trophy } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export default function CampaignStatsPage() {
  const { user } = useUser();

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

  return (
    <CampaignErrorBoundary>
      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8 animate-fade-in">
            <Button
              asChild
              variant="ghost"
              className="mb-4 campaign-card-hover hidden md:inline-flex"
            >
              <Link href="/campaign">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Campaign
              </Link>
            </Button>

            <PageHeader
              title="Campaign Statistics"
              description="Track your progress through the magical campaign"
              icon={<Trophy className="h-6 w-6" aria-hidden="true" />}
            />
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
            <Button asChild className=" campaign-card-hover shadow-lg">
              <Link href="/campaign">Continue Campaign</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-primary/30 hover:bg-primary/8 campaign-card-hover"
            >
              <Link href="/wizards/create">Create New Wizard</Link>
            </Button>
          </div>
        </div>
      </div>
    </CampaignErrorBoundary>
  );
}
