"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Coins,
  Crown,
  Scroll,
  Swords,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConvexImage } from "@/components/ConvexImage";
import { WaitlistGuard } from "@/components/WaitlistGuard";
import {
  CAMPAIGN_TOTAL_OPPONENTS,
  difficultyLabel,
  getCampaignSummary,
  timeAgo,
  type CampaignProgressLike,
} from "@/lib/campaignStatus";
import { cn } from "@/lib/utils";

export interface CampaignHomeWizard {
  _id: string;
  name: string;
  illustration?: string;
}

export interface CampaignHomeOpponent {
  _id: string;
  name: string;
  illustration?: string;
  opponentNumber?: number;
  difficulty?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
}

export interface CampaignHomeProgress extends CampaignProgressLike {
  wizardId: string;
}

interface CampaignHomeCardProps {
  season: {
    name: string;
    completionRelic: { name: string; luckBonus: number };
  };
  opponents: CampaignHomeOpponent[];
  wizards: CampaignHomeWizard[];
  progress: CampaignHomeProgress[];
  onCreateWizard: () => void;
  /** Token balance, when known. Premium players pass `unlimited` instead. */
  tokens?: number;
  unlimited?: boolean;
  /** A duel is waiting on the player, so it owns the filled button. */
  deferPrimary?: boolean;
}

/** Consecutive opponents that share a difficulty, e.g. Beginner x3. */
function difficultyTiers(opponents: CampaignHomeOpponent[]) {
  const tiers: Array<{ label: string; count: number }> = [];
  for (const o of [...opponents].sort(
    (a, b) => (a.opponentNumber ?? 0) - (b.opponentNumber ?? 0),
  )) {
    const label = difficultyLabel(o.difficulty);
    const last = tiers[tiers.length - 1];
    if (last && last.label === label) last.count += 1;
    else tiers.push({ label, count: 1 });
  }
  return tiers;
}

/** How far the next difficulty tier is, e.g. { tier: "Advanced", away: 3 }. */
function nextTier(
  opponents: CampaignHomeOpponent[],
  nextOpponent: number | null,
): { tier: string; away: number } | null {
  if (nextOpponent === null) return null;
  const tiers = difficultyTiers(opponents);
  let start = 1;
  for (let i = 0; i < tiers.length; i++) {
    const end = start + tiers[i].count - 1;
    if (nextOpponent <= end) {
      return tiers[i + 1]
        ? { tier: tiers[i + 1].label, away: end - nextOpponent + 1 }
        : null;
    }
    start = end + 1;
  }
  return null;
}

/** Ten pips, difficulty tiers beneath, and the relic as the goal at the end. */
function ProgressTrack({
  progress,
  opponents,
  relic,
  earned,
  owner,
}: {
  progress: CampaignProgressLike | undefined;
  opponents: CampaignHomeOpponent[];
  relic: { name: string; luckBonus: number };
  earned: boolean;
  /** Whose crown this is, when the viewer has several wizards. */
  owner?: string;
}) {
  const summary = getCampaignSummary(progress);
  const tiers = difficultyTiers(opponents);
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div
          role="img"
          aria-label={`${summary.defeatedCount} of ${summary.total} opponents defeated`}
          className="flex gap-1"
        >
          {Array.from({ length: CAMPAIGN_TOTAL_OPPONENTS }, (_, i) => {
            const n = i + 1;
            const defeated = progress?.defeatedOpponents.includes(n);
            const current = summary.nextOpponent === n;
            return (
              <span
                key={n}
                className={cn(
                  "h-2.5 flex-1 rounded-full",
                  defeated
                    ? "bg-success"
                    : current
                      ? "animate-pulse bg-warning/25 ring-2 ring-inset ring-warning motion-reduce:animate-none"
                      : "bg-muted",
                )}
              />
            );
          })}
        </div>
        {tiers.length > 1 && (
          <div
            aria-hidden="true"
            className="mt-1 flex gap-1 text-[11px] uppercase tracking-wide text-muted-foreground"
          >
            {tiers.map((tier) => (
              <span
                key={tier.label}
                style={{ flex: tier.count }}
                className="truncate border-t border-border/60 pt-0.5 text-center"
              >
                {tier.label === "Intermediate" ? (
                  <>
                    <span className="@md:hidden">Mid</span>
                    <span className="hidden @md:inline">{tier.label}</span>
                  </>
                ) : (
                  tier.label
                )}
              </span>
            ))}
          </div>
        )}
      </div>
      <div
        className={cn(
          "flex w-24 shrink-0 flex-col items-center text-center",
          earned ? "text-warning" : "text-muted-foreground",
        )}
      >
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-full border-2",
            earned
              ? "border-warning bg-warning text-warning-foreground shadow-md shadow-warning/40"
              : "border-dashed border-warning/60 text-warning",
          )}
        >
          <Crown className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="mt-0.5 text-[11px] font-semibold leading-tight">
          {owner ? `${owner.split(" ")[0]}'s crown` : relic.name}
          <span className="block font-normal">+{relic.luckBonus} Luck</span>
        </span>
        <span className="sr-only">{earned ? "earned" : "goal"}</span>
      </div>
    </div>
  );
}

function OpponentPortrait({
  opponent,
  className,
}: {
  opponent?: CampaignHomeOpponent;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-xl border-2 border-warning/60 bg-muted",
        className,
      )}
    >
      {opponent?.illustration ? (
        <ConvexImage
          storageId={opponent.illustration}
          alt=""
          width={192}
          height={192}
          sizes="96px"
          className="h-full w-full object-cover object-top"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-primary to-gold text-2xl font-bold text-white">
          {opponent?.name.charAt(0) ?? "?"}
        </div>
      )}
    </div>
  );
}

/** Pick the wizard the player most likely wants to continue with. */
export function pickFeatured(
  wizards: CampaignHomeWizard[],
  progress: CampaignHomeProgress[],
): { wizard: CampaignHomeWizard; progress?: CampaignHomeProgress } {
  const byWizard = new Map(progress.map((p) => [p.wizardId, p]));
  const entries = wizards.map((wizard) => ({
    wizard,
    progress: byWizard.get(wizard._id),
  }));
  const playing = entries.filter(
    (entry) => !getCampaignSummary(entry.progress).isCompleted,
  );
  const pool = playing.length ? playing : entries;
  // Most recently played first; wizards that never played go last.
  pool.sort(
    (a, b) => (b.progress?.lastBattleAt ?? 0) - (a.progress?.lastBattleAt ?? 0),
  );
  return pool[0];
}

export function CampaignHomeCard({
  season,
  opponents,
  wizards,
  progress,
  onCreateWizard,
  tokens,
  unlimited,
  deferPrimary,
}: CampaignHomeCardProps) {
  const [chosenId, setChosenId] = useState<string | null>(null);
  const relic = season.completionRelic;
  const relicReward = `+${relic.luckBonus} Luck in every duel`;
  const byWizard = new Map(progress.map((p) => [p.wizardId, p]));
  const relicHolder = wizards.find(
    (w) => byWizard.get(w._id)?.hasCompletionRelic,
  );

  const shell = (children: React.ReactNode) => (
    <Card className="mb-6 gap-0 overflow-hidden border-warning/50 bg-linear-to-br from-warning/20 via-card to-primary/10 py-0 sm:mb-8">
      <CardContent className="p-4 sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold text-warning sm:text-2xl">
              <Scroll className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
              Campaign
            </h2>
            <p className="hidden text-sm text-muted-foreground @md:block">
              {season.name}
            </p>
          </div>
          <Link
            href="/campaign"
            className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Campaign map
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        {children}
      </CardContent>
    </Card>
  );

  // No wizard yet: the campaign is the best reason to make one.
  if (wizards.length === 0) {
    return shell(
      <div className="space-y-4">
        <div className="flex items-center gap-3 @xl:gap-4">
          <OpponentPortrait
            opponent={opponents[0]}
            className="size-16 @xl:size-28"
          />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold leading-tight">
              Ten AI wizards. One permanent relic.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Beat them all to earn the {relic.name}: {relicReward}.
              {opponents[0] ? ` First up: ${opponents[0].name}.` : ""}
            </p>
          </div>
        </div>
        <ProgressTrack
          progress={undefined}
          opponents={opponents}
          relic={relic}
          earned={false}
        />
        <div className="flex flex-col gap-2 @xl:flex-row @xl:items-center">
          <WaitlistGuard>
            <Button
              onClick={onCreateWizard}
              size="lg"
              className="w-full @xl:w-auto"
            >
              <Wand2 className="mr-2 h-4 w-4" aria-hidden="true" />
              Create your wizard to begin
            </Button>
          </WaitlistGuard>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="w-full @xl:w-auto"
          >
            <Link href="/duels/watch">Watch a duel first</Link>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Describe a wizard, cast spells, and the AI narrates the clash.
          {!unlimited && tokens !== undefined
            ? ` You start with ${tokens} free tokens.`
            : ""}
        </p>
      </div>,
    );
  }

  const chosen = wizards.find((w) => w._id === chosenId);
  const { wizard, progress: wizardProgress } = chosen
    ? { wizard: chosen, progress: byWizard.get(chosen._id) }
    : pickFeatured(wizards, progress);
  const summary = getCampaignSummary(wizardProgress);
  const next = opponents.find((o) => o.opponentNumber === summary.nextOpponent);
  const unfinishedOther = wizards.find(
    (w) =>
      w._id !== wizard._id &&
      !getCampaignSummary(byWizard.get(w._id)).isCompleted,
  );
  const href = `/campaign/wizard/${wizard._id}`;
  const outOfTokens = !unlimited && tokens === 0;
  const lowTokens = !unlimited && tokens !== undefined && tokens <= 2;
  const tokenNote = unlimited
    ? "Premium: battles are free"
    : outOfTokens
      ? "You are out of tokens"
      : lowTokens
        ? `${tokens} ${tokens === 1 ? "battle" : "battles"} left`
        : null;
  const tier = nextTier(opponents, summary.nextOpponent);
  const remaining = summary.total - summary.defeatedCount;
  // Another wizard already holds the relic: say so before anything else.
  const showRelicStrip = relicHolder && relicHolder._id !== wizard._id;

  return shell(
    <div className="space-y-4">
      {showRelicStrip && (
        <div className="flex items-center gap-3 rounded-lg border border-warning/60 bg-linear-to-r from-warning/30 to-warning/10 px-3 py-2 text-sm">
          <Crown className="h-6 w-6 shrink-0 text-warning" aria-hidden="true" />
          <p className="min-w-0 flex-1">
            <span className="font-semibold">{relicHolder.name}</span>{" "}
            <span className="text-muted-foreground">
              holds the {relic.name} · +{relic.luckBonus} Luck
            </span>
          </p>
          <Link
            href="/duels/lobby"
            className="inline-flex min-h-11 shrink-0 items-center font-medium text-primary underline-offset-4 hover:underline"
          >
            Quick Match
          </Link>
        </div>
      )}

      {wizards.length > 1 && (
        <div
          role="group"
          aria-label="Campaign wizard"
          className="-mt-1 flex flex-wrap gap-2"
        >
          {wizards.slice(0, 5).map((w) => {
            const s2 = getCampaignSummary(byWizard.get(w._id));
            const active = w._id === wizard._id;
            return (
              <button
                key={w._id}
                type="button"
                aria-pressed={active}
                onClick={() => setChosenId(w._id)}
                className={cn(
                  "inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full border px-2.5 text-sm font-medium focus-visible:ring-2 focus-visible:ring-primary/40",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/60 bg-card/70 text-foreground hover:border-warning/60",
                )}
              >
                {s2.hasRelic && (
                  <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span className="min-w-0 truncate">{w.name.split(" ")[0]}</span>
                <span
                  className={cn(
                    "shrink-0",
                    active ? "opacity-80" : "text-muted-foreground",
                  )}
                >
                  {s2.isCompleted ? "10/10" : `${s2.defeatedCount}/${s2.total}`}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-4 @xl:flex-row @xl:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3 @xl:gap-4">
          {summary.isCompleted ? (
            <div className="flex size-16 shrink-0 items-center justify-center rounded-xl border-2 border-warning/60 bg-warning/15 @xl:size-28">
              <Crown
                className="h-8 w-8 text-warning @xl:h-12 @xl:w-12"
                aria-hidden="true"
              />
            </div>
          ) : (
            <OpponentPortrait opponent={next} className="size-16 @xl:size-28" />
          )}

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {summary.isCompleted
                ? "Campaign conquered"
                : summary.isFresh
                  ? `${wizard.name} is ready to begin`
                  : `${wizard.name} · up next`}
            </p>
            <p className="text-lg font-bold leading-tight sm:text-xl">
              {summary.isCompleted
                ? `${wizard.name} earned the ${relic.name}`
                : next
                  ? `Opponent ${summary.nextOpponent}: ${next.name}`
                  : `Opponent ${summary.nextOpponent}`}
            </p>
            <p className="text-sm text-muted-foreground">
              {summary.isCompleted ? (
                <>
                  {relicReward}.{" "}
                  <Link
                    href="/duels/lobby"
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Try it in Quick Match
                  </Link>
                </>
              ) : (
                [
                  next?.difficulty
                    ? `${difficultyLabel(next.difficulty)} difficulty`
                    : null,
                  wizardProgress?.lastBattleAt
                    ? `last played ${timeAgo(wizardProgress.lastBattleAt)}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 @xl:w-56">
          <WaitlistGuard>
            <Button
              asChild
              variant={deferPrimary ? "outline" : "default"}
              className={cn(
                "w-full",
                deferPrimary && "border-2 border-primary/70 font-semibold",
              )}
            >
              <Link
                className="h-auto min-h-9 whitespace-normal py-2 text-center"
                href={
                  outOfTokens
                    ? "/credits"
                    : summary.isCompleted
                      ? unfinishedOther
                        ? `/campaign/wizard/${unfinishedOther._id}`
                        : "/leaderboard"
                      : href
                }
              >
                <Swords className="mr-2 h-4 w-4" aria-hidden="true" />
                {outOfTokens
                  ? "Get tokens to continue"
                  : summary.isCompleted
                    ? unfinishedOther
                      ? `Play ${unfinishedOther.name.split(" ")[0]}'s campaign`
                      : "Climb the leaderboard"
                    : summary.isFresh
                      ? "Begin campaign"
                      : "Continue campaign"}
              </Link>
            </Button>
          </WaitlistGuard>
          {!tokenNote && summary.isFresh && (
            <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Coins
                className="h-3 w-3 shrink-0 text-gold"
                aria-hidden="true"
              />
              1 token per battle
            </p>
          )}
          {tokenNote && (
            <p
              className={cn(
                "flex items-center justify-center gap-1 text-xs",
                lowTokens || outOfTokens
                  ? "font-medium text-warning"
                  : "text-muted-foreground",
              )}
            >
              <Coins
                className="h-3 w-3 shrink-0 text-gold"
                aria-hidden="true"
              />
              {tokenNote}
              {(lowTokens || outOfTokens) && (
                <Link
                  href="/credits"
                  className="inline-flex min-h-11 items-center underline underline-offset-2"
                >
                  Get more
                </Link>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <ProgressTrack
          progress={wizardProgress}
          opponents={opponents}
          relic={relic}
          earned={summary.hasRelic}
          owner={
            !summary.hasRelic && relicHolder && wizards.length > 1
              ? wizard.name
              : undefined
          }
        />
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">
              {summary.defeatedCount}/{summary.total} beaten
            </span>
            {!summary.isCompleted && tier
              ? ` · ${tier.away} ${tier.away === 1 ? "win" : "wins"} to ${tier.tier}`
              : ""}
            {!summary.isCompleted && !summary.hasRelic
              ? ` · ${remaining} wins to the crown`
              : ""}
          </p>
        </div>
      </div>
    </div>,
  );
}
