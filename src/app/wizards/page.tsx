"use client";

import { SignUpButton, useUser } from "@clerk/nextjs";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import {
  RosterWizardCard,
  RosterWizardCardSkeleton,
  CAMPAIGN_OPPONENT_COUNT,
  wizardRank,
  type RosterLiveDuel,
} from "@/components/RosterWizardCard";
import { ProfileCompletionPrompt } from "@/components/ProfileCompletionPrompt";
import { Button } from "@/components/ui/button";
import { RegistrationPrompt } from "@/components/RegistrationPrompt";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";

import { CreditDisplay } from "@/components/CreditDisplay";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Wand2, Plus, Scroll, ChevronRight, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";

/**
 * Columns follow the space left beside the 16rem desktop sidebar, so cards
 * stay roughly 14–17rem wide on larger screens (two-up on phones).
 */
const ROSTER_GRID =
  "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5";

/** Cards likely visible on the first screen get eager images. */
const PRIORITY_CARDS = 6;

const seenRanksKey = (userId: string) => `my-wizards:seen-ranks:${userId}`;

/** Rank titles shown on the last visit, by wizard id ({} if unavailable). */
function readSeenRanks(userId: string): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(seenRanksKey(userId));
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeSeenRanks(userId: string, ranks: Record<string, string>) {
  try {
    window.localStorage.setItem(seenRanksKey(userId), JSON.stringify(ranks));
  } catch {
    // Storage blocked (private mode etc.): rank-up flourishes just won't show.
  }
}

export default function MyWizardsPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [showProfilePrompt, setShowProfilePrompt] = useState(false);

  const { isProfileComplete, getProfileCompletionPrompt } =
    useProfileCompletion();
  // Wait for Convex to have the auth token too, so a returning player never
  // sees an empty roster while auth is still settling.
  const { isAuthenticated } = useConvexAuth();
  const signedIn = !!user?.id && isAuthenticated;
  const wizards = useQuery(api.wizards.getUserWizards, signedIn ? {} : "skip");
  const campaignProgress = useQuery(
    api.campaigns.getUserCampaignProgress,
    signedIn ? {} : "skip",
  );
  const liveDuels = useQuery(
    api.duels.getMyWizardsLiveDuels,
    signedIn ? {} : "skip",
  );

  const defeatedByWizard = useMemo(() => {
    const map = new Map<Id<"wizards">, number>();
    for (const p of campaignProgress ?? []) {
      map.set(p.wizardId, p.defeatedOpponents.length);
    }
    return map;
  }, [campaignProgress]);

  // Most urgent live duel per wizard: your turn, then in progress, then waiting.
  const liveByWizard = useMemo(() => {
    const urgency = (d: RosterLiveDuel) =>
      d.yourTurn ? 2 : d.status === "IN_PROGRESS" ? 1 : 0;
    const map = new Map<Id<"wizards">, RosterLiveDuel>();
    for (const row of liveDuels ?? []) {
      const current = map.get(row.wizardId);
      if (!current || urgency(row) > urgency(current)) {
        map.set(row.wizardId, row);
      }
    }
    return map;
  }, [liveDuels]);

  // Snapshot taken once per visit (and per account): wizards needing you
  // float to the front, otherwise server order. Freezing it means cards never
  // jump under the player's thumb when a turn arrives (new wizards append).
  // It also keeps the ranks seen on the previous visit as a baseline, so a
  // rank-up is celebrated whether it happened while away or during this visit.
  const dataReady = wizards !== undefined && liveDuels !== undefined;
  const [visit, setVisit] = useState<{
    userId: string;
    order: Id<"wizards">[];
    baselineRanks: Record<string, string>;
  } | null>(null);
  if (dataReady && user?.id && visit?.userId !== user.id) {
    const urgency = (w: Doc<"wizards">) => {
      const live = liveByWizard.get(w._id);
      return live?.yourTurn ? 0 : live ? 1 : 2;
    };
    setVisit({
      baselineRanks: readSeenRanks(user.id),
      userId: user.id,
      order: wizards
        .map((w, i) => ({ w, i }))
        .sort((a, b) => urgency(a.w) - urgency(b.w) || a.i - b.i)
        .map(({ w }) => w._id),
    });
  }
  const frozenOrder = visit?.userId === user?.id ? visit?.order : undefined;
  const roster = useMemo(() => {
    if (!wizards || !frozenOrder) return undefined;
    const pos = new Map(frozenOrder.map((id, i) => [id, i]));
    return wizards
      .map((w, i) => ({ w, key: pos.get(w._id) ?? frozenOrder.length + i }))
      .sort((a, b) => a.key - b.key)
      .map(({ w }) => w);
  }, [wizards, frozenOrder]);

  const rankedUp = (w: Doc<"wizards">) => {
    const before = visit?.baselineRanks[w._id];
    return !!before && before !== wizardRank(w.wins ?? 0).title;
  };

  // Remember each wizard's rank so the next visit can celebrate a rank-up.
  useEffect(() => {
    if (!user?.id || !wizards || !visit) return;
    writeSeenRanks(
      user.id,
      Object.fromEntries(
        wizards.map((w) => [w._id, wizardRank(w.wins ?? 0).title]),
      ),
    );
  }, [user?.id, wizards, visit]);

  const totalWins =
    wizards?.reduce(
      (sum: number, wizard: Doc<"wizards">) => sum + (wizard.wins || 0),
      0,
    ) || 0;
  const totalLosses =
    wizards?.reduce(
      (sum: number, wizard: Doc<"wizards">) => sum + (wizard.losses || 0),
      0,
    ) || 0;
  const totalDuels = totalWins + totalLosses;
  const winRate =
    totalDuels > 0 ? Math.round((totalWins / totalDuels) * 100) : null;
  // Duels awaiting your spell, longest-waiting first.
  const turnDuels = [
    ...new Set(
      (liveDuels ?? [])
        .filter((d) => d.yourTurn)
        .sort((a, b) => a.createdAt - b.createdAt)
        .map((d) => d.duelId),
    ),
  ];

  const turnWizardId = (liveDuels ?? []).find(
    (d) => d.yourTurn && d.duelId === turnDuels[0],
  )?.wizardId;
  const turnWizardName = wizards?.find((w) => w._id === turnWizardId)?.name;

  // Campaign nudge: point at the one wizard mid-campaign when there is one.
  const campaignInProgress = (wizards ?? []).filter((w) => {
    const n = defeatedByWizard.get(w._id) ?? 0;
    return n > 0 && n < CAMPAIGN_OPPONENT_COUNT && !w.hasCompletionRelic;
  });
  const allHaveRelic =
    !!wizards?.length && wizards.every((w) => w.hasCompletionRelic);
  const campaignFocus =
    campaignInProgress.length === 1 ? campaignInProgress[0] : null;

  const handleCreateWizard = () => {
    if (isProfileComplete) {
      router.push("/wizards/create");
    } else {
      setShowProfilePrompt(true);
    }
  };

  const profilePrompt = getProfileCompletionPrompt("create wizards");
  // Hold the skeleton until live duels arrive too, so the first order shown
  // already accounts for whose turn it is.
  const rosterReady = roster !== undefined;
  const hasWizards = rosterReady && roster.length > 0;
  const signedOut = isLoaded && !user;

  return (
    <div className="relative isolate">
      {/* Decorative arcane glow and stars behind the header */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_100%_at_15%_0%,oklch(0.62_0.23_293/0.18),transparent_70%),radial-gradient(ellipse_50%_80%_at_90%_10%,oklch(0.82_0.15_88/0.12),transparent_70%)]" />
        <Sparkles className="animate-twinkle absolute top-6 left-[55%] size-3 text-gold/70" />
        <Sparkles className="animate-twinkle absolute top-16 right-[12%] size-4 text-primary/60 [animation-delay:0.8s]" />
        <Sparkles className="animate-twinkle absolute top-28 left-[78%] size-2.5 text-gold/60 [animation-delay:1.6s]" />
      </div>
      <div className="container mx-auto px-4 py-4 sm:px-6 sm:py-6 lg:py-8">
        {/* Compact header: title, roster summary, create action */}
        <header className="mb-4 flex items-center justify-between gap-3 sm:mb-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-arcane text-white shadow-md shadow-primary/30 sm:size-11">
              <Wand2 className="size-5 sm:size-6" aria-hidden="true" />
              <Sparkles
                aria-hidden="true"
                className="animate-twinkle absolute -top-1.5 -right-1.5 size-3.5 text-gold"
              />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold tracking-wide sm:text-4xl">
                My Wizards
              </h1>
              {turnDuels.length > 0 ? (
                <Link
                  href={`/duels/${turnDuels[0]}`}
                  className="group mt-1 inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full whitespace-nowrap pointer-coarse:min-h-11 border border-gold/60 bg-gold/15 py-1 pr-2 pl-2.5 text-sm font-semibold text-amber-800 transition-colors hover:bg-gold/25 dark:text-gold"
                >
                  <Zap
                    className="size-4 shrink-0 motion-safe:animate-pulse"
                    aria-hidden="true"
                  />
                  <span className="truncate">
                    {turnDuels.length === 1
                      ? turnWizardName
                        ? `Your turn: ${turnWizardName}`
                        : "Your turn!"
                      : `${turnDuels.length} turns waiting`}
                  </span>
                  <ChevronRight
                    className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              ) : hasWizards ? (
                <p className="mt-0.5 truncate text-sm text-muted-foreground sm:text-base">
                  <span className="font-semibold text-foreground">
                    {roster.length}
                  </span>{" "}
                  {roster.length === 1 ? "champion" : "champions"}
                  {totalDuels > 0 ? (
                    <>
                      {" · "}
                      <span className="font-semibold text-success">
                        {totalWins}W
                      </span>
                      {"–"}
                      <span className="font-semibold text-destructive">
                        {totalLosses}L
                      </span>
                      <span className="hidden sm:inline">
                        {" · "}
                        <span className="font-semibold text-amber-700 dark:text-gold">
                          {winRate}%
                        </span>
                      </span>
                    </>
                  ) : (
                    " · ready for battle"
                  )}
                </p>
              ) : user && !rosterReady ? (
                <div
                  aria-hidden="true"
                  className="mt-1.5 h-4 w-40 animate-pulse rounded bg-muted"
                />
              ) : (
                <p className="mt-0.5 hidden text-muted-foreground sm:block">
                  Your champions await their next duel.
                </p>
              )}
            </div>
          </div>
          {user && (
            <Button onClick={handleCreateWizard} className="shrink-0">
              <Plus className="size-5" aria-hidden="true" />
              <span className="hidden sm:inline">Create Wizard</span>
              <span className="sm:hidden">Summon</span>
            </Button>
          )}
        </header>

        {/* Anonymous users */}
        {signedOut && (
          <>
            <div className="mb-4 flex justify-center">
              <CreditDisplay />
            </div>
            <div className="mb-6">
              <RegistrationPrompt context="create_wizard" />
            </div>
          </>
        )}

        <ProfileCompletionPrompt
          open={showProfilePrompt}
          onOpenChange={setShowProfilePrompt}
          title={profilePrompt.title}
          message={profilePrompt.message}
          actionLabel={profilePrompt.actionLabel}
          onAction={profilePrompt.onAction}
          isSignInPrompt={!user}
        />

        {/* Roster */}
        {signedOut ? (
          <EmptyState
            icon={<Wand2 className="size-7" aria-hidden="true" />}
            title="Discover Magical Wizards!"
            description="Create an account to design your own wizards, have their
                portraits generated, and send them into magical duels."
            action={
              <SignUpButton mode="modal">
                <Button size="lg" className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5" aria-hidden="true" />
                  Sign up to summon a wizard
                </Button>
              </SignUpButton>
            }
          />
        ) : !rosterReady ? (
          <div
            className={ROSTER_GRID}
            aria-busy="true"
            aria-label="Loading your wizards"
          >
            {Array.from({ length: 4 }, (_, i) => (
              <RosterWizardCardSkeleton key={i} />
            ))}
          </div>
        ) : roster.length === 0 ? (
          <EmptyState
            icon={<Wand2 className="size-7" aria-hidden="true" />}
            title="Summon your first wizard"
            description={`Describe a wizard in a sentence and we'll generate their portrait. Then send them into a duel against other players, or take on the campaign's ${CAMPAIGN_OPPONENT_COUNT} AI foes.`}
            action={
              <Button
                onClick={handleCreateWizard}
                size="lg"
                className="flex items-center gap-2"
              >
                <Wand2 className="h-5 w-5" aria-hidden="true" />
                Create Your First Wizard
              </Button>
            }
          />
        ) : (
          <>
            <ul className={ROSTER_GRID} aria-label="Your wizards">
              {roster.map((wizard: Doc<"wizards">, i: number) => (
                <li key={wizard._id} className="flex">
                  <RosterWizardCard
                    wizard={wizard}
                    campaignDefeated={defeatedByWizard.get(wizard._id)}
                    liveDuel={liveByWizard.get(wizard._id)}
                    priority={i < PRIORITY_CARDS}
                    index={i}
                    rankedUp={rankedUp(wizard)}
                  />
                </li>
              ))}

              {/* Summon tile: same shape as a card so rows stay even */}
              <li className="flex">
                <button
                  type="button"
                  onClick={handleCreateWizard}
                  style={
                    {
                      "--rise-delay": `${Math.min(roster.length, 12) * 45}ms`,
                    } as CSSProperties
                  }
                  className="group animate-rise-in flex w-full flex-col overflow-hidden rounded-xl border border-dashed border-primary/45 bg-arcane-soft text-center transition-all active:scale-[0.98] pointer-fine:hover:-translate-y-0.5 pointer-fine:hover:border-primary/70 pointer-fine:hover:shadow-lg pointer-fine:hover:shadow-primary/15"
                >
                  <span className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 p-3">
                    <span className="flex size-12 items-center justify-center rounded-full bg-arcane text-white shadow-md shadow-primary/30 transition-transform pointer-fine:group-hover:rotate-12 sm:size-14">
                      <Plus className="size-6 sm:size-7" aria-hidden="true" />
                    </span>
                    <span className="font-display text-sm font-semibold sm:text-base">
                      Summon a wizard
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Design a new champion
                    </span>
                  </span>
                  {/* Spacer matching the card's action row height */}
                  <span aria-hidden="true" className="block p-2">
                    <span className="block h-11 sm:h-9 pointer-coarse:min-h-11" />
                  </span>
                </button>
              </li>
            </ul>

            {/* Slim campaign nudge (once progress has loaded, so it doesn't
                change text under the player) */}
            {campaignProgress !== undefined && (
              <Link
                href={
                  campaignFocus
                    ? `/campaign/wizard/${campaignFocus._id}`
                    : "/campaign"
                }
                className="group mt-6 flex items-center gap-3 rounded-xl border border-primary/30 bg-arcane-soft px-4 py-3 transition-colors hover:border-primary/60"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Scroll className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display font-semibold">
                    {campaignFocus
                      ? `Continue with ${campaignFocus.name}`
                      : campaignInProgress.length > 1
                        ? "Continue the Campaign"
                        : allHaveRelic
                          ? "Replay the Campaign"
                          : "Campaign Mode"}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {campaignFocus
                      ? `${defeatedByWizard.get(campaignFocus._id)}/${CAMPAIGN_OPPONENT_COUNT} foes defeated. Win them all for a luck relic.`
                      : allHaveRelic
                        ? "Every wizard holds a relic. Face the foes again for glory."
                        : `Defeat ${CAMPAIGN_OPPONENT_COUNT} AI foes to earn a luck relic`}
                  </span>
                </span>
                <ChevronRight
                  className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}
