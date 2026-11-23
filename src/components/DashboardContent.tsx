"use client";

import { useUser } from "@clerk/nextjs";
import { LeftSidebar } from "@/components/LeftSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConvexImage } from "@/components/ConvexImage";
import { DuelListItem } from "@/components/DuelListItem";
import { CreditDisplay } from "@/components/CreditDisplay";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import { MigrationNotification } from "@/components/MigrationNotification";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { peekPendingWizard } from "@/lib/pendingWizard";
import { usePortraitStage } from "@/hooks/usePortraitStage";
import {
  ChevronRight,
  Coins,
  Crown,
  Scroll,
  Swords,
  Users,
  Wand2,
  Trophy,
} from "lucide-react";
import { getCampaignSummary } from "@/lib/campaignStatus";
import { RuneSpinner } from "@/components/ui/rune-spinner";
import {
  CampaignHomeCard,
  type CampaignHomeOpponent,
  type CampaignHomeProgress,
  type CampaignHomeWizard,
} from "@/components/CampaignHomeCard";

type PlayerDuels = FunctionReturnType<typeof api.duels.getPlayerDuels>;
type CompletedDuels = FunctionReturnType<
  typeof api.duels.getPlayerCompletedDuels
>;

/**
 * Data overrides for the dev-only /design/home preview, so every state of the
 * home screen can be rendered without signing in.
 */
export interface DashboardPreview {
  wizards: Array<
    CampaignHomeWizard & { wins?: number; losses?: number; description: string }
  >;
  tokens?: number;
  activeDuels?: PlayerDuels;
  completedDuels?: CompletedDuels;
  campaign: {
    season: {
      name: string;
      completionRelic: { name: string; luckBonus: number };
    } | null;
    opponents: CampaignHomeOpponent[];
    progress: CampaignHomeProgress[];
  };
}

/** The one duel that needs the player, surfaced above everything else. */
function ResumeDuelBanner({ duel }: { duel: PlayerDuels[number] }) {
  const { user } = useUser();
  const first = useQuery(
    api.wizards.getWizardWithOwner,
    duel.wizards[0] ? { wizardId: duel.wizards[0] } : "skip",
  );
  const second = useQuery(
    api.wizards.getWizardWithOwner,
    duel.wizards[1] ? { wizardId: duel.wizards[1] } : "skip",
  );
  const opponent = [first, second].find((w) => w && w.owner !== user?.id)?.name;
  const waiting = duel.status === "WAITING_FOR_PLAYERS";
  const rounds =
    duel.numberOfRounds === "TO_THE_DEATH" ? "the death" : duel.numberOfRounds;
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-warning/60 bg-warning/15 px-3 py-2 sm:mb-5">
      <p className="flex min-w-0 items-center gap-2 text-sm">
        <Swords className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
        <span className="min-w-0 truncate">
          <span className="font-semibold">
            {waiting
              ? "Waiting for an opponent"
              : `${duel.isCampaignBattle ? "Campaign battle" : "Duel"} · your move${opponent ? ` vs ${opponent}` : ""}`}
          </span>
          {!waiting && (
            <span className="text-muted-foreground">
              {" "}
              · round {duel.currentRound ?? 1} of {rounds}
            </span>
          )}
        </span>
      </p>
      <Button asChild size="sm" variant="gold" className="shrink-0">
        <Link href={`/duels/${duel._id}`}>{waiting ? "Open" : "Resume"}</Link>
      </Button>
    </div>
  );
}

/** Player-vs-player entry points and one merged list of the player's duels. */
function DuelsSection({
  loading,
  firstDuel,
}: {
  loading: boolean;
  firstDuel: boolean;
}) {
  return (
    <section aria-labelledby="home-duels" className="mb-6 sm:mb-8">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2
            id="home-duels"
            className="flex items-center gap-2 font-display text-xl font-bold sm:text-2xl"
          >
            <Swords className="h-5 w-5 text-warning" aria-hidden="true" />
            Duel other players
          </h2>
          <p className="text-sm text-muted-foreground">
            {firstDuel
              ? "No duels yet. Quick Match pairs you with a live opponent for 1 token."
              : "1 token. Both wizards cast at once."}
          </p>
        </div>
        <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto">
          <Button
            asChild
            variant="secondary"
            size="sm"
            className="col-span-3 border border-primary/40 font-semibold sm:col-span-1"
          >
            <Link href="/duels/lobby">
              <Users className="mr-2 h-4 w-4" aria-hidden="true" />
              Quick Match
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/duels/create">Create</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/duels/join">Join by code</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/duels/watch">Watch</Link>
          </Button>
        </div>
      </div>

      {loading && (
        <div className="py-6 text-center">
          <RuneSpinner size="sm" label="Loading duels" />
        </div>
      )}
    </section>
  );
}

/** The player's recent duels as plain rows. Hidden when there are none. */
function DuelHistory({
  active,
  completed,
  excludeId,
  onCopyShortcode,
}: {
  active: PlayerDuels | undefined;
  completed: CompletedDuels | undefined;
  excludeId?: string;
  onCopyShortcode: (shortcode: string) => void;
}) {
  const all = [
    ...(active ?? []).map((duel) => ({ duel, isActive: true })),
    ...(completed ?? []).map((duel) => ({ duel, isActive: false })),
  ].filter(({ duel }) => duel._id !== excludeId);
  const items = all.slice(0, 5);
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="home-history" className="mb-6 sm:mb-8">
      <div className="mb-3 flex items-end justify-between gap-2">
        <h2
          id="home-history"
          className="flex items-center gap-2 font-display text-xl font-bold sm:text-2xl"
        >
          <Trophy className="h-5 w-5 text-gold" aria-hidden="true" />
          Your duels
        </h2>
        {all.length > items.length && (
          <Link
            href="/duels"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            View all ({all.length})
          </Link>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 @3xl:grid-cols-2">
        {items.map(({ duel, isActive }, i) => (
          <div key={duel._id} className={i >= 2 ? "hidden @3xl:block" : ""}>
            <DuelListItem
              duel={duel}
              variant="dashboard"
              onCopyShortcode={isActive ? onCopyShortcode : undefined}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

/** One wizard with its record, campaign chip and a single Duel action. */
function WizardRow({
  wizard,
  progress,
  className,
}: {
  wizard: {
    _id: string;
    name: string;
    illustration?: string;
    illustrationStatus?: "sketching" | "painting" | "failed";
    illustrationRequestedAt?: number;
    wins?: number;
    losses?: number;
  };
  progress?: CampaignHomeProgress;
  className?: string;
}) {
  const portraitStage = usePortraitStage(wizard);
  const summary = getCampaignSummary(progress);
  const record = (wizard.wins ?? 0) + (wizard.losses ?? 0);
  return (
    <li
      className={`min-w-0 items-center gap-3 rounded-xl border bg-card/80 p-3 ${className ?? "flex"}`}
    >
      <Link
        href={`/wizards/${wizard._id}`}
        tabIndex={-1}
        aria-hidden="true"
        className="relative size-12 shrink-0 overflow-hidden rounded-full border-2 border-border bg-muted"
      >
        {portraitStage && (
          // Spinning rune ring while the portrait is being painted.
          <span className="absolute inset-0 z-10 rounded-full border-2 border-dashed border-gold motion-safe:animate-[rune-spin_6s_linear_infinite]" />
        )}
        {wizard.illustration ? (
          <ConvexImage
            storageId={wizard.illustration}
            alt=""
            width={96}
            height={96}
            sizes="48px"
            className="h-full w-full object-cover object-top"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-linear-to-br from-primary to-gold font-bold text-white">
            {wizard.name.charAt(0)}
          </span>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          href={`/wizards/${wizard._id}`}
          className="block truncate font-semibold hover:underline"
        >
          {wizard.name}
        </Link>
        <p className="truncate text-xs text-muted-foreground">
          {portraitStage
            ? "Painting portrait…"
            : record > 0
              ? `${wizard.wins ?? 0}W · ${wizard.losses ?? 0}L`
              : "No duels yet"}
        </p>
        {summary.hasRelic && (
          <Link
            href={`/campaign/wizard/${wizard._id}`}
            className={`mt-1 inline-flex min-h-9 max-w-full items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium hover:border-warning/60 focus-visible:ring-2 focus-visible:ring-primary/40 ${
              summary.hasRelic
                ? "border-warning/60 bg-warning/15 text-warning"
                : "border-border/60 text-muted-foreground"
            }`}
          >
            {summary.hasRelic ? (
              <Crown className="h-3 w-3" aria-hidden="true" />
            ) : (
              <Scroll className="h-3 w-3" aria-hidden="true" />
            )}
            {summary.isCompleted
              ? "Crowned"
              : `Campaign ${summary.defeatedCount}/${summary.total}`}
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        )}
      </div>
      <Button asChild variant="outline" size="sm" className="shrink-0">
        <Link href={`/duels/create?wizardId=${wizard._id}`}>
          <Swords className="mr-2 h-4 w-4" aria-hidden="true" />
          Challenge
        </Link>
      </Button>
    </li>
  );
}

export default function DashboardContent({
  preview,
}: {
  preview?: DashboardPreview;
}) {
  const { user } = useUser();
  const router = useRouter();
  const [showMigrationNotification, setShowMigrationNotification] =
    useState(false);

  const { isLoaded, isSignedIn, isProfileComplete } = useProfileCompletion();
  const liveWizards = useQuery(
    api.wizards.getUserWizards,
    user?.id ? {} : "skip",
  );
  const liveSeason = useQuery(api.campaignSeasons.getActiveCampaignSeason);
  const liveOpponents = useQuery(api.campaigns.getCampaignOpponents);
  const liveProgress = useQuery(
    api.campaigns.getUserCampaignProgress,
    user?.id ? {} : "skip",
  );
  const livePlayerDuels = useQuery(
    api.duels.getPlayerDuels,
    user?.id ? {} : "skip",
  );
  const liveCompleted = useQuery(
    api.duels.getPlayerCompletedDuels,
    user?.id ? {} : "skip",
  );

  const liveCredits = useQuery(
    api.imageCreditService.getUserImageCredits,
    user?.id ? { userId: user.id } : "skip",
  );
  const liveUserInfo = useQuery(
    api.users.getUserByClerkId,
    user?.id ? { clerkId: user.id } : "skip",
  );
  const unlimited =
    !preview &&
    liveUserInfo?.subscriptionTier === "PREMIUM" &&
    liveUserInfo?.subscriptionStatus === "ACTIVE";
  const tokens = preview ? preview.tokens : liveCredits;

  const wizards = (preview?.wizards ?? liveWizards) as
    typeof liveWizards | undefined;
  const season = preview ? preview.campaign.season : liveSeason;
  const opponents = preview ? preview.campaign.opponents : liveOpponents;
  const campaignProgress = preview ? preview.campaign.progress : liveProgress;
  const activeDuels = preview
    ? (preview.activeDuels ?? [])
    : livePlayerDuels?.filter(
        (duel) =>
          duel.status === "WAITING_FOR_PLAYERS" ||
          duel.status === "IN_PROGRESS",
      );
  const completedDuels = preview
    ? (preview.completedDuels ?? [])
    : liveCompleted;

  const resumeDuel =
    activeDuels?.find((duel) => duel.status === "IN_PROGRESS") ??
    activeDuels?.[0];

  const totalWins =
    wizards?.reduce((sum, wizard) => sum + (wizard.wins || 0), 0) || 0;
  const totalLosses =
    wizards?.reduce((sum, wizard) => sum + (wizard.losses || 0), 0) || 0;
  const totalDuels = totalWins + totalLosses;
  const winRate =
    totalDuels > 0 ? Math.round((totalWins / totalDuels) * 100) : 0;

  // Creating a wizard doesn't need a username, so nothing gates it.
  const handleCreateWizard = () => {
    router.push("/wizards/create");
  };

  const handleCopyShortcode = async (shortcode: string) => {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/join/${shortcode}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  // A visitor who described a wizard on the homepage before signing up goes
  // straight to creating it, even if sign-up dropped them here instead.
  useEffect(() => {
    if (!preview && isSignedIn && peekPendingWizard()) {
      router.replace("/wizards/create");
    }
  }, [preview, isSignedIn, router]);

  // Show migration notification for existing users without profiles
  useEffect(() => {
    if (
      isLoaded &&
      isSignedIn &&
      !isProfileComplete &&
      // Only nudge players who already have wizards; a brand-new player's
      // first job is creating one.
      wizards !== undefined &&
      wizards.length > 0 &&
      user
    ) {
      // Check if user has dismissed the notification before
      const dismissedKey = `migration-notification-dismissed-${user.id}`;
      const wasDismissed = localStorage.getItem(dismissedKey);

      if (!wasDismissed) {
        // Show notification after a delay
        const timer = setTimeout(() => {
          setShowMigrationNotification(true);
        }, 3000); // Show after 3 seconds

        return () => clearTimeout(timer);
      }
    }
  }, [isLoaded, isSignedIn, isProfileComplete, wizards, user]);

  const handleDismissMigrationNotification = () => {
    setShowMigrationNotification(false);
    if (user) {
      // Remember that user dismissed this notification
      const dismissedKey = `migration-notification-dismissed-${user.id}`;
      localStorage.setItem(dismissedKey, "true");
    }
  };

  const hasWizards = !!wizards && wizards.length > 0;
  const bestCampaign = (campaignProgress ?? []).reduce(
    (best, p) => Math.max(best, getCampaignSummary(p).defeatedCount),
    0,
  );
  const anyCrown = (campaignProgress ?? []).some((p) => p.hasCompletionRelic);
  const campaignLine = anyCrown
    ? " · crowned"
    : bestCampaign > 0
      ? ` · campaign ${bestCampaign}/10`
      : "";
  const summaryLine =
    wizards !== undefined && wizards.length === 0
      ? "Let's make your first wizard"
      : totalDuels === 0
        ? "Ready for your first battle"
        : `${wizards?.length ?? 0} ${wizards?.length === 1 ? "wizard" : "wizards"} · ${totalDuels} duels · ${winRate}% wins${campaignLine}`;

  return (
    <div className="min-h-screen">
      <LeftSidebar />

      {/* Main content area with left margin for desktop sidebar */}
      <div className="pt-[var(--app-navbar-h)] pb-[var(--app-bottomnav-h)] md:ml-64 md:pt-0 md:pb-0">
        <div className="min-h-screen">
          <div className="@container container mx-auto px-4 sm:px-6 py-6 sm:py-12">
            <header className="mb-6 flex items-start justify-between gap-3 sm:mb-8">
              <div className="min-w-0 flex-1">
                <h1 className="font-display text-xl font-bold sm:text-3xl">
                  Wizard Dashboard
                </h1>
                <p className="text-sm text-muted-foreground sm:text-base">
                  {summaryLine}
                </p>
              </div>
              {preview ? (
                preview.tokens !== undefined && (
                  <Link
                    href="/credits"
                    className="shrink-0"
                    aria-label={`${preview.tokens} tokens. Get more`}
                  >
                    <Badge
                      variant={preview.tokens <= 2 ? "destructive" : "default"}
                      className="gap-1 px-2.5 py-1.5 text-sm"
                    >
                      <Coins className="h-4 w-4 text-gold" aria-hidden="true" />
                      {preview.tokens} tokens
                    </Badge>
                  </Link>
                )
              ) : (
                <CreditDisplay showLabel={false} />
              )}
            </header>

            {resumeDuel && <ResumeDuelBanner duel={resumeDuel} />}

            {/* Campaign: the single-player on-ramp, so it leads the page */}
            {season && opponents && wizards && campaignProgress && (
              <CampaignHomeCard
                season={season}
                opponents={opponents}
                wizards={wizards}
                progress={campaignProgress}
                onCreateWizard={handleCreateWizard}
                tokens={tokens}
                unlimited={unlimited}
                deferPrimary={!!resumeDuel}
              />
            )}

            {/* No wizard and no campaign card to point the way: make the
                first step impossible to miss. */}
            {wizards && wizards.length === 0 && season === null && (
              <Card className="mb-6 border-gold/50 bg-linear-to-br from-gold/15 via-card to-primary/10 sm:mb-8">
                <CardContent className="flex flex-col items-start gap-4 p-5 @xl:flex-row @xl:items-center">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-xl font-bold sm:text-2xl">
                      Create your first wizard
                    </h2>
                    <p className="mt-1 text-muted-foreground">
                      Describe them however you like. The AI paints their
                      portrait, and they fight as your champion in every duel.
                    </p>
                  </div>
                  <Button
                    size="lg"
                    variant="gold"
                    onClick={handleCreateWizard}
                    className="w-full @xl:w-auto"
                  >
                    <Wand2 className="mr-2 h-4 w-4" aria-hidden="true" />
                    Create My Wizard
                  </Button>
                </CardContent>
              </Card>
            )}

            {wizards === undefined ? (
              <div className="py-8 text-center">
                <RuneSpinner size="md" label="Loading…" />
              </div>
            ) : !hasWizards ? null : (
              <>
                <DuelsSection
                  loading={
                    activeDuels === undefined || completedDuels === undefined
                  }
                  firstDuel={totalDuels === 0}
                />
                <section
                  aria-labelledby="home-wizards"
                  className="mb-6 sm:mb-8"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2
                        id="home-wizards"
                        className="flex items-center gap-2 font-display text-xl font-bold sm:text-2xl"
                      >
                        <Wand2
                          className="h-5 w-5 text-primary"
                          aria-hidden="true"
                        />
                        Your wizards
                      </h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href="/wizards">View all ({wizards.length})</Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCreateWizard}
                      >
                        <Wand2 className="mr-2 h-4 w-4" aria-hidden="true" />
                        New wizard
                      </Button>
                    </div>
                  </div>
                  <ul className="grid grid-cols-1 gap-3 @3xl:grid-cols-2">
                    {wizards.slice(0, 6).map((wizard, i) => (
                      <WizardRow
                        key={wizard._id}
                        className={i >= 3 ? "hidden @xl:flex" : "flex"}
                        wizard={wizard}
                        progress={campaignProgress?.find(
                          (p) => p.wizardId === wizard._id,
                        )}
                      />
                    ))}
                  </ul>
                  {wizards.length > 6 && (
                    <div className="mt-4 text-center sm:mt-6">
                      <Button asChild variant="outline" size="sm">
                        <Link href="/wizards">
                          View all wizards ({wizards.length})
                        </Link>
                      </Button>
                    </div>
                  )}
                </section>

                <DuelHistory
                  active={activeDuels}
                  completed={completedDuels}
                  excludeId={resumeDuel?._id}
                  onCopyShortcode={handleCopyShortcode}
                />
              </>
            )}

            <MigrationNotification
              show={showMigrationNotification}
              onDismiss={handleDismissMigrationNotification}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
