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
import { CampaignErrorBoundary } from "@/components/CampaignErrorBoundary";
import { CampaignLoadingState } from "@/components/CampaignLoadingState";
import { CampaignSeasonOverview } from "@/components/CampaignSeasonOverview";
import { ConvexImage } from "@/components/ConvexImage";
import {
  Scroll,
  Wand2,
  Plus,
  Crown,
  Award,
  Swords,
  BarChart3,
} from "lucide-react";
import { CampaignPathMap } from "@/components/CampaignPathMap";
import { useStartCampaignBattle } from "@/hooks/useStartCampaignBattle";
import { getCampaignSummary, timeAgo } from "@/lib/campaignStatus";
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
  isMostRecent,
  battle,
  opponentNames,
}: {
  wizardData: WizardWithProgress;
  isMostRecent: boolean;
  battle: ReturnType<typeof useStartCampaignBattle>;
  opponentNames: Record<number, string>;
}) {
  const { wizard, progress } = wizardData;
  const summary = getCampaignSummary(progress);
  const { start, isStarting, isBusy } = battle;
  const nextName =
    summary.nextOpponent !== null
      ? opponentNames[summary.nextOpponent]
      : undefined;
  const starting =
    summary.nextOpponent !== null &&
    isStarting(wizard._id, summary.nextOpponent);

  return (
    <Card
      className={`group relative gap-0 overflow-hidden py-0 bg-card/90 backdrop-blur-sm shadow-lg transition-all duration-300 border-border/50 motion-safe:hover:-translate-y-1 hover:shadow-xl ${
        summary.isCompleted
          ? "border-warning/60 ring-2 ring-warning/50"
          : isMostRecent
            ? "ring-2 ring-primary/50"
            : ""
      }`}
    >
      {/* Image links to the map; text link below is the accessible name */}
      <Link
        href={`/campaign/wizard/${wizard._id}`}
        className="block"
        tabIndex={-1}
        aria-hidden
      >
        <div className="relative h-56 w-full overflow-hidden bg-muted">
          {wizard.illustration && (
            <ConvexImage
              storageId={wizard.illustration}
              alt=""
              width={400}
              height={224}
              className="h-full w-full object-cover object-top"
            />
          )}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-card to-transparent" />
        </div>
      </Link>
      <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
        {summary.isCompleted && (
          <Badge className="flex items-center gap-1 bg-warning text-warning-foreground font-bold">
            <Crown className="h-3 w-3" aria-hidden />
            Campaign complete
          </Badge>
        )}
        {summary.hasRelic && (
          <Badge
            className="flex items-center gap-1 bg-primary text-primary-foreground font-bold"
            title={`Campaign Relic: +1 Luck (Effective Luck: ${wizard.effectiveLuckScore})`}
          >
            <Award className="h-3 w-3" aria-hidden />
            Relic +1 Luck
          </Badge>
        )}
      </div>

      <CardContent className="space-y-4 p-4">
        <div>
          <h3 className="text-xl font-bold leading-tight">
            <Link
              href={`/campaign/wizard/${wizard._id}`}
              className="hover:underline focus-visible:underline"
            >
              {wizard.name}
            </Link>
          </h3>
          <p className="text-sm text-muted-foreground">
            {summary.isCompleted
              ? "Campaign conquered"
              : summary.isFresh
                ? "Ready to begin"
                : `Up next: ${nextName ?? `#${summary.nextOpponent}`}`}
            {progress?.lastBattleAt
              ? ` · played ${timeAgo(progress.lastBattleAt)}`
              : ""}
          </p>
        </div>

        <div className="space-y-1">
          <CampaignPathMap progress={progress} compact />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {summary.defeatedCount} of {summary.total} defeated
            </span>
            {!summary.hasRelic && (
              <span>Relic: {summary.total - summary.defeatedCount} to go</span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {summary.nextOpponent !== null ? (
            <Button
              className="flex-1"
              disabled={isBusy}
              onClick={() => start(wizard._id, summary.nextOpponent!)}
            >
              <Swords className="h-4 w-4 mr-2" aria-hidden />
              {starting
                ? "Starting..."
                : summary.isFresh
                  ? "Begin campaign"
                  : "Continue"}
            </Button>
          ) : null}
          <Button
            asChild
            variant={summary.isCompleted ? "default" : "outline"}
            className={summary.isCompleted ? "flex-1" : ""}
          >
            <Link href={`/campaign/wizard/${wizard._id}`}>
              {summary.isCompleted ? "View campaign" : "Map"}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CampaignPage() {
  const { user } = useUser();
  const battle = useStartCampaignBattle();

  // Get campaign opponents
  const campaignOpponents = useQuery(api.campaigns.getCampaignOpponents);
  const season = useQuery(api.campaignSeasons.getActiveCampaignSeason);

  // Get user's wizards and their campaign progress
  const userWizards = useQuery(
    api.wizards.getUserWizards,
    user?.id ? {} : "skip",
  ) as EnhancedWizard[] | undefined;

  const campaignProgress = useQuery(
    api.campaigns.getUserCampaignProgress,
    user?.id ? {} : "skip",
  );

  // Show registration prompt for anonymous users
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
        <div className="max-w-4xl mx-auto">
          <PageHeader
            title="Campaign Mode"
            description="Battle AI-powered wizards in order and earn a permanent relic."
            icon={<Scroll className="h-6 w-6" aria-hidden="true" />}
          />

          <RegistrationPrompt context="create_wizard" />

          {season !== undefined && campaignOpponents !== undefined && (
            <div className="mt-8">
              <CampaignSeasonOverview
                season={season}
                opponents={campaignOpponents}
                wizards={[]}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show loading state
  if (
    userWizards === undefined ||
    campaignOpponents === undefined ||
    campaignProgress === undefined ||
    season === undefined
  ) {
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
            description="Battle AI-powered wizards in order and earn a permanent relic."
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
            </CardContent>
          </Card>

          <div className="mt-8">
            <CampaignSeasonOverview
              season={season}
              opponents={campaignOpponents}
              wizards={[]}
            />
          </div>
        </div>
      </div>
    );
  }

  // Transform userWizards data to include progress
  const wizardsWithProgress = userWizards.map((wizard) => {
    const progress = campaignProgress.find((p) => p.wizardId === wizard._id);
    return {
      wizard,
      progress,
    };
  });
  const opponentNames: Record<number, string> = {};
  for (const o of campaignOpponents) {
    if (o.opponentNumber) opponentNames[o.opponentNumber] = o.name;
  }
  // Most recently played, unfinished wizard gets the "continue" highlight
  let recentId: string | null = null;
  let recentAt = 0;
  for (const { wizard, progress } of wizardsWithProgress) {
    if (
      progress?.lastBattleAt &&
      progress.lastBattleAt > recentAt &&
      !getCampaignSummary(progress).isCompleted
    ) {
      recentAt = progress.lastBattleAt;
      recentId = wizard._id;
    }
  }

  const userProgress = wizardsWithProgress.flatMap((w) =>
    w.progress ? [w.progress] : [],
  );
  const completedWizards = userProgress.filter(
    (p) => getCampaignSummary(p).isCompleted,
  ).length;
  const recentWizard = wizardsWithProgress.find(
    (w) => w.wizard._id === recentId,
  );
  const recentNext = getCampaignSummary(recentWizard?.progress).nextOpponent;
  const recentOpponentName =
    recentNext !== null ? opponentNames[recentNext] : undefined;

  return (
    <CampaignErrorBoundary>
      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
        <div className="max-w-7xl mx-auto space-y-10">
          <PageHeader
            title="Single Player Campaign"
            description="Battle AI-powered wizards in order and earn a permanent relic for your wizard."
            icon={<Scroll className="h-6 w-6" aria-hidden="true" />}
            actions={
              <Button asChild variant="outline" size="sm">
                <Link href="/campaign/stats">
                  <BarChart3 className="h-4 w-4 mr-2" aria-hidden />
                  Stats &amp; battle history
                </Link>
              </Button>
            }
          />

          {recentWizard && recentOpponentName && (
            <div className="flex flex-col gap-3 rounded-xl border border-primary/40 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p>
                <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Pick up where you left off
                </span>
                <span className="font-medium">
                  {recentWizard.wizard.name} vs {recentOpponentName}
                </span>
              </p>
              <Button
                disabled={battle.isBusy}
                onClick={() =>
                  battle.start(recentWizard.wizard._id, recentNext!)
                }
              >
                <Swords className="h-4 w-4 mr-2" aria-hidden />
                {battle.isStarting(recentWizard.wizard._id, recentNext!)
                  ? "Starting..."
                  : "Continue"}
              </Button>
            </div>
          )}

          <CampaignSeasonOverview
            season={season}
            opponents={campaignOpponents}
            wizards={wizardsWithProgress}
          />

          <section aria-labelledby="wizards-heading">
            <h2
              id="wizards-heading"
              className="mb-1 flex items-center gap-2 text-2xl font-bold font-display"
            >
              <Wand2 className="h-6 w-6 text-primary" aria-hidden />
              Your wizards
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              {completedWizards} of {wizardsWithProgress.length} completed. Each
              wizard has its own campaign and earns its own relic.
            </p>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {wizardsWithProgress.map((wizardData) => (
                <CampaignWizardCard
                  key={wizardData.wizard._id}
                  wizardData={wizardData}
                  battle={battle}
                  opponentNames={opponentNames}
                  isMostRecent={wizardData.wizard._id === recentId}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </CampaignErrorBoundary>
  );
}
