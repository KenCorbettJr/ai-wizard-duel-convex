"use client";

import { use, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import { ImageLightbox } from "@/components/ImageLightbox";
import { ConvexImage } from "@/components/ConvexImage";
import { EditWizardForm } from "@/components/EditWizardForm";
import { UserIdDisplay } from "@/components/UserIdDisplay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PortraitPainting } from "@/components/PortraitPainting";
import { usePortraitStage } from "@/hooks/usePortraitStage";
import { TrophyHall } from "@/components/TrophyHall";
import { CampaignRelicBadge } from "@/components/CampaignRelicBadge";
import { WizardCampaignProgress } from "@/components/WizardCampaignProgress";
import { WizardDuelRow, duelOutcomeFor } from "@/components/WizardDuelRow";
import {
  ArrowLeft,
  Zap,
  Edit,
  Swords,
  RefreshCw,
  Info,
  Scroll,
  Bot,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { cn, safeConvexId } from "../../../lib/utils";
import { DEPARTED_OWNER } from "../../../../convex/lib/departed";

interface WizardPageClientProps {
  params: Promise<{
    id: string;
  }>;
}

/** Duels shown at first, and how many more each "Show more" adds. */
const HISTORY_PREVIEW = 8;
const HISTORY_PAGE = 20;
/** A run of results this long gets called out. */
const STREAK_MIN = 3;
/** Below this many duels the list already shows who was beaten. */
const TROPHY_MIN_DUELS = 6;

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** Stored portraits are 1376×768. */
const PORTRAIT_W = 1376;
const PORTRAIT_H = 768;

/**
 * Page frame: stacked on phones. On desktop, portrait and details on the
 * left (sticky) with campaign, history or fighting style on the right.
 */
const SHELL =
  "mx-auto max-w-3xl md:px-6 xl:grid xl:max-w-6xl xl:grid-cols-2 xl:items-start xl:gap-8";
/** One centered column, for wizards with nothing to show beside the details. */
const SHELL_SINGLE = "mx-auto max-w-3xl md:px-6 xl:max-w-2xl";

function PageSkeleton() {
  return (
    <div className="min-h-screen animate-pulse pb-8 md:pt-14" aria-busy="true">
      <div className={SHELL}>
        <div className="space-y-4 xl:space-y-5">
          <div className="aspect-[1376/768] w-full bg-muted md:rounded-xl" />
          <div className="space-y-4 px-4 md:px-0">
            <div className="h-8 w-1/2 rounded bg-muted" />
            <div className="h-4 w-3/4 rounded bg-muted" />
            <div className="h-14 rounded-lg bg-muted" />
            <div className="h-11 rounded-lg bg-muted" />
          </div>
        </div>
        <div className="mt-5 px-4 md:px-0 xl:mt-0">
          <div className="h-64 rounded-lg bg-muted" />
        </div>
      </div>
    </div>
  );
}

export default function WizardPageClient({ params }: WizardPageClientProps) {
  const router = useRouter();
  const { user } = useUser();
  const { id } = use(params);

  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Editing lives in the URL (?edit=1) so back closes the editor.
  const editRequested = searchParams.get("edit") === "1";
  const pushedEditor = useRef(false);
  const openEditor = () => {
    pushedEditor.current = true;
    router.push(`${pathname}?edit=1`, { scroll: false });
  };
  const closeEditor = () => {
    if (pushedEditor.current) {
      pushedEditor.current = false;
      router.back();
    } else {
      router.replace(pathname, { scroll: false });
    }
  };
  const [bioExpanded, setBioExpanded] = useState(false);
  const [duelLimit, setDuelLimit] = useState(HISTORY_PREVIEW);
  const [showLuckInfo, setShowLuckInfo] = useState(false);

  // Validate the ID format first
  const wizardId = safeConvexId<"wizards">(id);

  // Use safe queries that handle invalid IDs gracefully
  const wizard = useQuery(
    api.wizards.getWizardWithOwner,
    wizardId ? { wizardId } : "skip",
  );
  const wizardDuels = useQuery(
    api.duels.getWizardDuelHistory,
    wizardId ? { wizardId } : "skip",
  );

  // Show "More" only when the clamp actually hides text at this width.
  const bioRef = useRef<HTMLParagraphElement>(null);
  const [bioClamped, setBioClamped] = useState(false);
  const bioText = wizard?.description;
  useEffect(() => {
    const el = bioRef.current;
    if (!el || bioExpanded) return;
    const measure = () => setBioClamped(el.scrollHeight > el.clientHeight + 1);
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [bioText, bioExpanded]);

  // Portrait job in flight, if any. Once we've watched one run, the finished
  // portrait gets a reveal animation instead of just popping in.
  const portraitStage = usePortraitStage(wizard);
  const [sawPainting, setSawPainting] = useState(false);
  if (portraitStage && !sawPainting) setSawPainting(true);

  const regenerateIllustration = useMutation(
    api.wizards.regenerateIllustration,
  );
  const [retrying, setRetrying] = useState(false);
  const paintPortrait = async () => {
    if (!wizardId) return;
    setRetrying(true);
    try {
      await regenerateIllustration({ wizardId });
    } catch (error) {
      toast.error(
        error instanceof ConvexError && typeof error.data === "string"
          ? error.data
          : "Couldn't start the portrait. Please try again.",
      );
    } finally {
      setRetrying(false);
    }
  };

  if (wizard === undefined && wizardId !== null) {
    return <PageSkeleton />;
  }

  if (wizard === null || wizardId === null || !wizard) {
    const isInvalidId = wizardId === null;

    return (
      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold tracking-wide mb-4">
            {isInvalidId ? "Invalid Wizard ID" : "Wizard Not Found"}
          </h1>
          <p className="text-muted-foreground mb-6">
            {isInvalidId
              ? "The wizard ID in the URL is not valid."
              : "The wizard you're looking for doesn't exist."}
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            <Button asChild variant="outline">
              <Link href="/wizards">Browse Wizards</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const wins = wizard.wins ?? 0;
  const losses = wizard.losses ?? 0;
  const decided = wins + losses;
  const winRate = decided > 0 ? Math.round((wins / decided) * 100) : null;
  const luck = wizard.effectiveLuckScore;

  // Live and open duels first, then everything else newest first (the query
  // already sorts by date).
  const duels = wizardDuels ?? [];
  const isOpen = (status: string) =>
    status === "IN_PROGRESS" || status === "WAITING_FOR_PLAYERS";
  const orderedDuels = [
    ...duels.filter((d) => isOpen(d.status)),
    ...duels.filter((d) => !isOpen(d.status)),
  ];
  const visibleDuels = orderedDuels.slice(0, duelLimit);

  // Decided player-vs-player results, newest first, for the current run.
  // Like wins/losses, campaign battles don't count here.
  const recentResults = duels
    .filter((d) => d.status === "COMPLETED" && !d.isCampaignBattle)
    .map((d) => duelOutcomeFor(d, wizardId))
    .filter((o) => o === "win" || o === "loss");
  // A campaign opponent's record is every finished battle against it.
  const finishedDuels = duels.filter((d) => d.status === "COMPLETED");
  const challengersFaced = finishedDuels.length;
  const challengersBeaten = finishedDuels.filter((d) =>
    d.winners?.includes(wizardId),
  ).length;
  const campaignResults = duels.filter(
    (d) => d.status === "COMPLETED" && d.isCampaignBattle,
  ).length;
  let streak = 0;
  while (
    streak < recentResults.length &&
    recentResults[streak] === recentResults[0]
  ) {
    streak++;
  }

  const isOwner = !!user && user.id === wizard.owner;
  const isCampaignOpponent =
    !!wizard.isCampaignOpponent || wizard.owner === "campaign";
  // Another player's wizard: you can send it a duel challenge.
  const canChallenge =
    !isOwner && !isCampaignOpponent && wizard.owner !== DEPARTED_OWNER;
  const signInFor = (path: string) =>
    user ? path : `/sign-in?redirect_url=${encodeURIComponent(path)}`;

  if (editRequested && isOwner) {
    return (
      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
        <EditWizardForm
          wizard={wizard}
          onClose={closeEditor}
          onSuccess={closeEditor}
        />
      </div>
    );
  }

  const hasPortrait = !!(wizard.illustration || wizard.illustrationURL);
  const historyLoading = wizardDuels === undefined;
  // Desktop splits into two columns when there's something for the right one.
  const twoColumn = historyLoading || duels.length > 0 || isCampaignOpponent;
  // Luck is worth a mention when it isn't the default, or explains the wizard.
  const showLuck = luck !== 10 || wizard.hasCompletionRelic;
  const portraitFailed =
    !portraitStage && isOwner && wizard.illustrationStatus === "failed";

  // The portrait, sized to its own shape so there's no letterbox band. Full
  // bleed on phones, a rounded card above the details on desktop.
  const portrait = portraitStage ? (
    <div className="relative aspect-[1376/768] w-full overflow-hidden bg-muted md:rounded-xl md:border md:border-border">
      <PortraitPainting
        stage={portraitStage}
        name={wizard.name}
        backdropStorageId={wizard.illustration}
      />
    </div>
  ) : hasPortrait ? (
    <div
      key={wizard.illustration ?? wizard.illustrationURL}
      className={cn(
        "relative w-full overflow-hidden bg-muted md:rounded-xl md:border md:border-border",
        sawPainting &&
          "animate-in fade-in zoom-in-95 duration-1000 motion-reduce:animate-none",
      )}
    >
      {/* Blurred copy fills any gap if the art is capped by max-height */}
      <div className="absolute inset-0" aria-hidden>
        {wizard.illustration ? (
          <ConvexImage
            storageId={wizard.illustration}
            alt=""
            width={64}
            height={48}
            sizes="64px"
            className="h-full w-full scale-110 object-cover opacity-50 blur-2xl"
          />
        ) : wizard.illustrationURL ? (
          <Image
            src={wizard.illustrationURL}
            alt=""
            fill
            sizes="64px"
            className="scale-110 object-cover opacity-50 blur-2xl"
          />
        ) : null}
      </div>
      <ImageLightbox
        storageId={wizard.illustration}
        src={wizard.illustration ? undefined : wizard.illustrationURL}
        alt={wizard.name}
      >
        {wizard.illustration ? (
          <ConvexImage
            storageId={wizard.illustration}
            alt={wizard.name}
            width={PORTRAIT_W}
            height={PORTRAIT_H}
            sizes="(min-width: 1024px) 560px, (min-width: 768px) 720px, 100vw"
            priority
            className="relative mx-auto block h-auto max-h-[65svh] w-full md:max-h-[40svh] xl:max-h-[45svh] rounded-none object-contain"
          />
        ) : wizard.illustrationURL ? (
          <Image
            src={wizard.illustrationURL}
            alt={wizard.name}
            width={PORTRAIT_W}
            height={PORTRAIT_H}
            sizes="(min-width: 1024px) 560px, (min-width: 768px) 720px, 100vw"
            priority
            className="relative mx-auto block h-auto max-h-[65svh] w-full md:max-h-[40svh] xl:max-h-[45svh] object-contain"
          />
        ) : null}
      </ImageLightbox>
    </div>
  ) : isOwner && !portraitFailed ? (
    // No portrait yet: the whole band invites the owner to paint one.
    <button
      type="button"
      onClick={paintPortrait}
      disabled={retrying}
      className="flex w-full items-center justify-center gap-3 bg-arcane px-4 py-5 text-left text-white transition-opacity hover:opacity-90 disabled:opacity-60 md:rounded-xl"
    >
      <Sparkles className="h-6 w-6 shrink-0" aria-hidden />
      <span>
        <span className="block font-semibold">
          Give {wizard.name} a portrait
        </span>
        <span className="block text-sm text-white/80">
          Your first one is free
        </span>
      </span>
    </button>
  ) : null;

  return (
    <div className="min-h-screen pb-8 md:pt-4">
      {/* Back button (phones use the one in the top bar) */}
      <div
        className={cn(
          "mx-auto hidden max-w-3xl px-6 pb-2 md:block",
          twoColumn ? "xl:max-w-6xl" : "xl:max-w-2xl",
        )}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="-ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <div className={twoColumn ? SHELL : SHELL_SINGLE}>
        <div
          className={cn(
            "min-w-0 xl:space-y-5",
            // Stays in view beside a long history, but only on screens tall
            // enough to show all of it (the bio is clamped, the art capped).
            twoColumn &&
              !bioExpanded &&
              "xl:[@media(min-height:840px)]:sticky xl:top-6",
          )}
        >
          {portrait}

          <div className="space-y-5 px-4 pt-4 md:px-0 xl:pt-0">
            {/* Who they are */}
            <header className="space-y-2">
              <div className="flex items-center gap-3">
                {!portrait && (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-arcane font-display text-xl font-bold text-white">
                    {wizard.name.trim().charAt(0).toUpperCase() || (
                      <Zap className="h-5 w-5" aria-hidden />
                    )}
                  </div>
                )}
                <h1 className="min-w-0 text-balance font-display text-3xl font-bold leading-tight tracking-wide text-foreground [overflow-wrap:anywhere] sm:text-4xl">
                  {wizard.name}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-2 empty:hidden">
                {showLuck && (
                  <button
                    type="button"
                    onClick={() => setShowLuckInfo((v) => !v)}
                    aria-expanded={showLuckInfo}
                    aria-controls="luck-info"
                    className={cn(
                      "relative inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors before:absolute before:-inset-2.5 before:content-[''] hover:bg-accent/50",
                      luck > 10
                        ? "border-warning/50 text-warning"
                        : luck < 10
                          ? "border-info/50 text-info"
                          : "border-border text-muted-foreground",
                    )}
                  >
                    Luck {luck}
                    <Info className="h-3 w-3" aria-hidden />
                    <span className="sr-only">: what is this?</span>
                  </button>
                )}
                {wizard.hasCompletionRelic && (
                  <CampaignRelicBadge
                    hasRelic={wizard.hasCompletionRelic}
                    effectiveLuckScore={wizard.effectiveLuckScore}
                    className="text-xs"
                  />
                )}
                {isCampaignOpponent ? (
                  <span className="text-sm text-muted-foreground">
                    Campaign opponent
                    {wizard.opponentNumber
                      ? ` ${wizard.opponentNumber} of 10`
                      : ""}
                    {wizard.difficulty
                      ? ` · ${wizard.difficulty.charAt(0)}${wizard.difficulty.slice(1).toLowerCase()}`
                      : ""}
                  </span>
                ) : wizard.isAIPowered ? (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Bot className="h-3 w-3" aria-hidden />
                    AI-controlled
                  </Badge>
                ) : null}
              </div>
              {showLuck && (
                <p
                  id="luck-info"
                  hidden={!showLuckInfo}
                  className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground"
                >
                  Luck (1–20) nudges the dice rolls in every duel. Wizards start
                  at 10
                  {isCampaignOpponent
                    ? "; campaign opponents are tuned up or down by difficulty."
                    : wizard.hasCompletionRelic
                      ? "; this one carries a bonus from campaign relics."
                      : " and gain +1 for each campaign they complete."}
                </p>
              )}
              <div>
                <p
                  ref={bioRef}
                  id="wizard-bio"
                  className={cn(
                    "text-pretty text-base leading-relaxed text-foreground/85",
                    !bioExpanded && "line-clamp-4 xl:line-clamp-6",
                  )}
                >
                  {wizard.description}
                </p>
                {(bioClamped || bioExpanded) && (
                  <button
                    type="button"
                    onClick={() => setBioExpanded((v) => !v)}
                    aria-expanded={bioExpanded}
                    aria-controls="wizard-bio"
                    className="relative -my-1 inline-flex min-h-8 items-center text-sm font-medium text-primary before:absolute before:-inset-x-3 before:-inset-y-1.5 before:content-['']"
                  >
                    {bioExpanded ? "Less" : "More"}
                  </button>
                )}
              </div>
              {wizard.owner === DEPARTED_OWNER ? (
                <p className="text-sm text-muted-foreground">
                  This wizard&apos;s creator has left the arena.
                </p>
              ) : wizard.ownerUserId ? (
                <div className="text-sm text-muted-foreground">
                  Created by{" "}
                  <UserIdDisplay
                    userId={wizard.ownerUserId}
                    displayName={wizard.ownerDisplayName}
                    size="sm"
                    showAvatar={false}
                    mono={false}
                    className="inline-flex"
                  />
                </div>
              ) : null}
            </header>

            {/* The last portrait job failed: tell the owner and offer a retry. */}
            {portraitFailed && (
              <div
                role="alert"
                className="flex flex-col items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 sm:flex-row sm:items-center"
              >
                <p className="flex-1 text-sm">
                  <strong>The portrait didn&apos;t come out.</strong> Any token
                  you spent on it was refunded.
                </p>
                <Button size="sm" onClick={paintPortrait} disabled={retrying}>
                  <RefreshCw
                    className={cn("h-4 w-4", retrying && "animate-spin")}
                    aria-hidden="true"
                  />
                  {wizard.illustration ? "Try again (1 token)" : "Try again"}
                </Button>
              </div>
            )}

            {/* Record (only once there is one) */}
            {decided > 0 && (
              <section aria-label="Record" className="space-y-1.5">
                <div className="flex divide-x divide-border border-y border-border py-1">
                  <div className="flex-1 px-2 py-2 text-center">
                    <div className="text-xl font-bold leading-tight text-success">
                      {wins}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {plural(wins, "Win", "Wins")}
                    </div>
                  </div>
                  <div className="flex-1 px-2 py-2 text-center">
                    <div className="text-xl font-bold leading-tight text-destructive">
                      {losses}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {plural(losses, "Loss", "Losses")}
                    </div>
                  </div>
                  <div className="flex-1 px-2 py-2 text-center">
                    <div className="text-xl font-bold leading-tight text-foreground">
                      {winRate}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Win rate
                    </div>
                  </div>
                </div>
                {(campaignResults > 0 || streak >= STREAK_MIN) && (
                  <p className="text-center text-xs text-muted-foreground">
                    {streak >= STREAK_MIN && (
                      <span
                        className={cn(
                          "font-medium",
                          recentResults[0] === "win"
                            ? "text-success"
                            : "text-destructive",
                        )}
                      >
                        {recentResults[0] === "win"
                          ? `On a ${streak}-win streak`
                          : `${streak} losses in a row`}
                      </span>
                    )}
                    {streak >= STREAK_MIN && campaignResults > 0 && " · "}
                    {campaignResults > 0 &&
                      `Excludes ${campaignResults} campaign ${plural(campaignResults, "battle", "battles")}`}
                  </p>
                )}
              </section>
            )}

            {/* Primary action */}
            {isOwner ? (
              <div className="flex gap-2">
                <Button asChild size="lg" className="flex-1">
                  <Link href={`/duels/create?wizardId=${wizardId}`}>
                    <Swords className="size-5" />
                    Start New Duel
                  </Link>
                </Button>
                <Button size="lg" variant="outline" onClick={openEditor}>
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              </div>
            ) : canChallenge ? (
              <Button asChild size="lg" className="w-full">
                <Link
                  href={signInFor(`/duels/create?opponentWizardId=${wizardId}`)}
                >
                  <Swords className="size-5" />
                  <span className="min-w-0 truncate">
                    Challenge {wizard.name}
                  </span>
                </Link>
              </Button>
            ) : isCampaignOpponent ? (
              <Button asChild size="lg" className="w-full">
                <Link href={signInFor("/campaign")}>
                  <Scroll className="size-5" />
                  Face them in the Campaign
                </Link>
              </Button>
            ) : null}
          </div>
        </div>

        <div className="min-w-0 space-y-5 px-4 pt-5 empty:hidden md:px-0 xl:pt-0">
          {/* Campaign status heads the history column on desktop */}
          <WizardCampaignProgress wizardId={wizardId} isOwner={isOwner} />

          {/* What a campaign opponent fights like */}
          {isCampaignOpponent &&
            (wizard.spellStyle ||
              wizard.personalityTraits?.length ||
              wizard.luckModifier) && (
              <section aria-labelledby="fighting-style-heading">
                <h2
                  id="fighting-style-heading"
                  className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  <Sparkles className="h-4 w-4" aria-hidden />
                  Fighting style
                </h2>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg border border-border bg-card/60 p-3 text-sm sm:p-4">
                  {!historyLoading && (
                    <>
                      <dt className="text-muted-foreground">Challengers</dt>
                      <dd>
                        {challengersFaced === 0 ? (
                          "No one has reached them yet"
                        ) : (
                          <>
                            Has defeated{" "}
                            <span className="font-semibold">
                              {challengersBeaten}
                            </span>{" "}
                            of {challengersFaced}{" "}
                            {plural(
                              challengersFaced,
                              "challenger",
                              "challengers",
                            )}
                          </>
                        )}
                      </dd>
                    </>
                  )}
                  {wizard.spellStyle && (
                    <>
                      <dt className="text-muted-foreground">Magic</dt>
                      <dd className="first-letter:uppercase">
                        {wizard.spellStyle}
                      </dd>
                    </>
                  )}
                  {!!wizard.personalityTraits?.length && (
                    <>
                      <dt className="text-muted-foreground">Temperament</dt>
                      <dd className="flex flex-wrap gap-1.5">
                        {wizard.personalityTraits.map((trait) => (
                          <span
                            key={trait}
                            className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize"
                          >
                            {trait}
                          </span>
                        ))}
                      </dd>
                    </>
                  )}
                  {!!wizard.luckModifier && (
                    <>
                      <dt className="text-muted-foreground">Dice</dt>
                      <dd>
                        <span
                          className={
                            wizard.luckModifier > 0
                              ? "font-semibold text-warning"
                              : "font-semibold text-info"
                          }
                        >
                          {wizard.luckModifier > 0 ? "+" : ""}
                          {wizard.luckModifier}
                        </span>{" "}
                        <span className="text-muted-foreground">
                          on every luck roll
                        </span>
                      </dd>
                    </>
                  )}
                </dl>
              </section>
            )}

          {duels.length >= TROPHY_MIN_DUELS && (
            <TrophyHall wizardId={wizardId} />
          )}

          {/* Duel history */}
          {historyLoading ? (
            <div className="space-y-2" aria-busy="true">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-48 animate-pulse rounded-lg bg-muted" />
            </div>
          ) : duels.length > 0 ? (
            <section aria-labelledby="duel-history-heading">
              <h2
                id="duel-history-heading"
                className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground"
              >
                <Swords className="h-4 w-4" aria-hidden />
                Duels
                <span className="font-sans font-normal normal-case tracking-normal">
                  ({duels.length})
                </span>
              </h2>
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card/60">
                {visibleDuels.map((duel) => (
                  <WizardDuelRow
                    key={duel._id}
                    duel={duel}
                    wizardId={wizardId}
                  />
                ))}
              </ul>
              {orderedDuels.length > duelLimit && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => setDuelLimit((n) => n + HISTORY_PAGE)}
                >
                  Show {Math.min(HISTORY_PAGE, orderedDuels.length - duelLimit)}{" "}
                  more of {orderedDuels.length}
                </Button>
              )}
            </section>
          ) : isCampaignOpponent ? null : (
            <p className="rounded-lg border border-dashed border-border px-4 py-4 text-center text-sm text-muted-foreground">
              {isOwner
                ? "No duels yet. Start one to begin a record."
                : `${wizard.name} hasn't fought any duels yet.`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
