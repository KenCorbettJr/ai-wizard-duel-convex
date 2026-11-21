"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { CampaignRelicBadge } from "@/components/CampaignRelicBadge";
import { PartyPopper } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RegistrationPrompt } from "@/components/RegistrationPrompt";
import { CampaignErrorBoundary } from "@/components/CampaignErrorBoundary";
import { CampaignLoadingState } from "@/components/CampaignLoadingState";

import { ConvexImage } from "@/components/ConvexImage";
import { CampaignOpponentCard } from "@/components/CampaignOpponentCard";
import {
  Scroll,
  ArrowLeft,
  Award,
  BarChart3,
  Crown,
  Swords,
  Target,
} from "lucide-react";
import Image from "next/image";
import { CampaignPathMap } from "@/components/CampaignPathMap";
import { useStartCampaignBattle } from "@/hooks/useStartCampaignBattle";
import { getCampaignSummary, getOpponentStatus } from "@/lib/campaignStatus";

const MILESTONES: Record<number, string> = {
  1: "First victory! The journey has begun.",
  3: "Three down. You're an apprentice no more.",
  5: "Halfway there! The road gets harder from here.",
  9: "One more to go. The final boss awaits.",
};

export default function WizardCampaignClient() {
  const { user } = useUser();
  const params = useParams();
  const wizardId = params.wizardId as Id<"wizards">;
  const battle = useStartCampaignBattle();
  const { start, isStarting, isBusy } = battle;

  // Get campaign opponents
  const campaignOpponents = useQuery(api.campaigns.getCampaignOpponents);

  // Get the specific wizard
  const wizard = useQuery(
    api.wizards.getWizard,
    wizardId ? { wizardId } : "skip",
  );

  // Get wizard's campaign progress
  const wizardProgress = useQuery(
    api.campaigns.getWizardCampaignProgress,
    wizardId ? { wizardId } : "skip",
  );

  // Celebrate new victories: compare against the count last seen for this wizard
  const seenKey = `campaign-seen:${wizardId}`;
  const liveDefeated = wizardProgress?.defeatedOpponents.length;
  const [celebrate, setCelebrate] = useState<number | null>(null);
  useEffect(() => {
    if (liveDefeated === undefined) return;
    const stored = window.localStorage.getItem(seenKey);
    const recentlyPlayed =
      wizardProgress?.lastBattleAt !== undefined &&
      Date.now() - wizardProgress.lastBattleAt < 10 * 60 * 1000;
    const increased =
      liveDefeated >
      (stored !== null ? Number(stored) : recentlyPlayed ? 0 : liveDefeated);
    if (increased) {
      // One-time sync from external storage on mount
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCelebrate(liveDefeated);
    }
    window.localStorage.setItem(seenKey, String(liveDefeated));
  }, [liveDefeated, seenKey, wizardProgress?.lastBattleAt]);

  // Show registration prompt for anonymous users
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Scroll className="h-12 w-12 text-primary" />
              <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-wide">
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
  if (
    wizard === undefined ||
    campaignOpponents === undefined ||
    wizardProgress === undefined
  ) {
    return (
      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
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
      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-display text-3xl font-bold tracking-wide mb-4">
            Wizard Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            The wizard you&apos;re looking for doesn&apos;t exist or you
            don&apos;t have access to it.
          </p>
          <Button asChild>
            <Link href="/campaign">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Campaign
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const summary = getCampaignSummary(wizardProgress);
  const sortedOpponents = [...campaignOpponents]
    .filter((o) => o.opponentNumber)
    .sort((a, b) => (a.opponentNumber ?? 0) - (b.opponentNumber ?? 0));
  const nextOpponentDoc = sortedOpponents.find(
    (o) => o.opponentNumber === summary.nextOpponent,
  );
  const starting =
    summary.nextOpponent !== null && isStarting(wizardId, summary.nextOpponent);

  const jumpTo = (n: number) => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    document.getElementById(`opponent-${n}`)?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "center",
    });
  };

  return (
    <CampaignErrorBoundary>
      <div className="container mx-auto px-4 py-8 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center justify-end md:justify-between"
          >
            <Button asChild variant="ghost" className="hidden md:inline-flex">
              <Link href="/campaign">
                <ArrowLeft className="h-4 w-4 mr-2" />
                All campaign wizards
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/campaign/stats">
                <BarChart3 className="h-4 w-4 mr-2" />
                Stats &amp; history
              </Link>
            </Button>
          </nav>

          {celebrate !== null && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-xl border border-warning/50 bg-warning/10 p-4 motion-safe:animate-fade-in"
            >
              <PartyPopper
                className="mt-0.5 h-6 w-6 shrink-0 text-warning"
                aria-hidden
              />
              <div className="flex-1">
                <p className="font-bold">
                  {summary.isCompleted
                    ? "Campaign conquered!"
                    : MILESTONES[celebrate]
                      ? MILESTONES[celebrate]
                      : "Victory! Opponent defeated."}
                </p>
                <p className="text-sm text-muted-foreground">
                  {summary.isCompleted
                    ? `${wizard.name} defeated all ${summary.total} opponents${summary.hasRelic ? " and earned the Campaign Relic (+1 Luck)" : ""}.`
                    : `${celebrate} of ${summary.total} down.${nextOpponentDoc ? ` Next up: ${nextOpponentDoc.name}.` : ""}`}
                </p>
              </div>
              {summary.hasRelic && <CampaignRelicBadge hasRelic />}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCelebrate(null)}
              >
                Dismiss
              </Button>
            </div>
          )}

          {/* Hero: who, how far, what's next */}
          <Card className="gap-0 overflow-hidden border-primary/30 py-0">
            <CardContent className="p-5 sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <div className="mx-auto h-36 w-36 shrink-0 overflow-hidden rounded-xl bg-muted sm:mx-0">
                  {wizard.illustration ? (
                    <ConvexImage
                      storageId={wizard.illustration}
                      alt={wizard.name}
                      width={144}
                      height={144}
                      className="h-full w-full object-cover object-top"
                    />
                  ) : wizard.illustrationURL ? (
                    <Image
                      src={wizard.illustrationURL}
                      alt={wizard.name}
                      width={144}
                      height={144}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-arcane text-4xl font-bold text-white">
                      {wizard.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-4 text-center sm:text-left">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                      Campaign
                    </p>
                    <h1 className="font-display text-3xl font-bold tracking-wide">
                      {wizard.name}
                    </h1>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="font-medium">
                        {summary.isCompleted
                          ? "Campaign complete"
                          : summary.isFresh
                            ? "Your journey begins"
                            : "Campaign progress"}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {summary.defeatedCount} / {summary.total} defeated ·{" "}
                        {summary.total - summary.defeatedCount} to go
                      </span>
                    </div>
                    <Progress
                      value={summary.percent}
                      className="h-3"
                      aria-label={`${summary.defeatedCount} of ${summary.total} opponents defeated`}
                    />
                  </div>

                  {summary.isCompleted ? (
                    <div className="flex items-center justify-center gap-2 text-success sm:justify-start">
                      <Crown className="h-5 w-5" aria-hidden />
                      <span className="font-medium">
                        All 10 opponents defeated.
                        {summary.hasRelic &&
                          " Campaign Relic earned (+1 Luck)."}
                      </span>
                    </div>
                  ) : (
                    nextOpponentDoc && (
                      <Button
                        size="lg"
                        className="w-full sm:w-auto"
                        disabled={isBusy}
                        onClick={() => start(wizardId, summary.nextOpponent!)}
                      >
                        <Swords className="h-5 w-5 mr-2" aria-hidden />
                        {starting
                          ? "Entering the arena..."
                          : summary.nextOpponent === summary.total
                            ? `Final boss: face ${nextOpponentDoc.name}`
                            : `${summary.isFresh ? "Begin" : "Continue"}: face ${nextOpponentDoc.name}`}
                      </Button>
                    )
                  )}
                </div>
              </div>

              {/* Journey path */}
              <div className="mt-8">
                <CampaignPathMap
                  progress={wizardProgress}
                  opponents={sortedOpponents}
                  onSelect={jumpTo}
                />
              </div>

              {/* Reward */}
              <div
                className={`mt-6 flex items-center gap-3 rounded-lg border p-3 ${
                  summary.hasRelic
                    ? "border-warning/50 bg-warning/10"
                    : "border-border bg-muted/40"
                }`}
              >
                <Award
                  className={`h-6 w-6 shrink-0 ${summary.hasRelic ? "text-warning" : "text-muted-foreground"}`}
                  aria-hidden
                />
                <p className="text-sm">
                  {summary.hasRelic ? (
                    <>
                      <strong>Campaign Relic earned.</strong> {wizard.name} has
                      a permanent +1 Luck bonus.
                    </>
                  ) : (
                    <>
                      <strong>Reward:</strong> defeat the final boss to earn the
                      Campaign Relic, a permanent +1 Luck bonus.
                    </>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Opponents */}
          <section aria-labelledby="opponents-heading">
            <h2
              id="opponents-heading"
              className="mb-4 flex items-center gap-2 text-2xl font-bold font-display"
            >
              <Target className="h-6 w-6 text-primary" aria-hidden />
              Opponents
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {sortedOpponents.map((opponent) => (
                <CampaignOpponentCard
                  key={opponent._id}
                  opponent={opponent}
                  status={getOpponentStatus(
                    opponent.opponentNumber!,
                    wizardProgress,
                  )}
                  wizardId={wizardId}
                  battle={battle}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </CampaignErrorBoundary>
  );
}
