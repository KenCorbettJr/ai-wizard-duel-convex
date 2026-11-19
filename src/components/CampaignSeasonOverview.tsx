"use client";

import Image from "next/image";
import { Award, Check, Crown, Swords } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ConvexImage } from "@/components/ConvexImage";
import type { Doc } from "../../convex/_generated/dataModel";
import { difficultyLabel, getCampaignSummary } from "@/lib/campaignStatus";
import { cn } from "@/lib/utils";

interface CampaignSeasonOverviewProps {
  /** undefined while loading, null when no season is configured. */
  season: Doc<"campaignSeasons"> | null;
  opponents: Doc<"wizards">[];
  /** The user's wizards with their campaign progress (none for anonymous). */
  wizards: Array<{
    wizard: Doc<"wizards">;
    progress?: Doc<"wizardCampaignProgress">;
  }>;
}

const DIFFICULTY_DOT: Record<string, string> = {
  BEGINNER: "bg-success",
  INTERMEDIATE: "bg-warning",
  ADVANCED: "bg-destructive",
};

/**
 * Explains the current campaign: its story, the reward, the opponents in
 * order, and which of the user's wizards have finished or beaten each one.
 */
export function CampaignSeasonOverview({
  season,
  opponents,
  wizards,
}: CampaignSeasonOverviewProps) {
  const seasonIds = season?.opponents?.length
    ? new Set(season.opponents)
    : null;
  const roster = opponents
    .filter((o) => o.opponentNumber && (!seasonIds || seasonIds.has(o._id)))
    .sort((a, b) => (a.opponentNumber ?? 0) - (b.opponentNumber ?? 0));
  const total = roster.length;
  const bossNumber = Math.max(0, ...roster.map((r) => r.opponentNumber ?? 0));
  const relic = season?.completionRelic;
  const luck = relic?.luckBonus ?? 1;

  const wizardCount = wizards.length;
  const finished = wizards.filter(
    (w) => getCampaignSummary(w.progress).isCompleted,
  );
  const beatenBy = (n: number) =>
    wizards.filter((w) => w.progress?.defeatedOpponents.includes(n)).length;

  return (
    <section aria-labelledby="season-heading">
      <Card className="gap-0 overflow-hidden border-primary/30 bg-card/90 py-0">
        <CardContent className="space-y-6 p-5 sm:p-8">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Current campaign
              </p>
              <h2
                id="season-heading"
                className="font-display text-2xl font-bold tracking-wide sm:text-3xl"
              >
                {season?.name ?? "Single Player Campaign"}
              </h2>
              <p className="max-w-xl text-muted-foreground">
                {season?.description ??
                  "Defeat the AI-powered wizards below, one at a time."}
              </p>
              <p className="flex items-center gap-2 text-sm">
                <Swords className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                {total > 0
                  ? `Face ${total} opponents in order.`
                  : "Opponents in order."}{" "}
                Each wizard runs its own campaign.
              </p>
            </div>

            {/* Reward */}
            {relic && (
              <div className="flex items-center gap-4 rounded-xl border border-warning/40 bg-warning/10 p-4 md:max-w-xs">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-warning/20">
                  {relic.iconUrl ? (
                    <Image
                      src={relic.iconUrl}
                      alt=""
                      width={64}
                      height={64}
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Award className="h-8 w-8 text-warning" aria-hidden />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-warning">
                    Reward for finishing
                  </p>
                  <p className="font-bold leading-tight">{relic.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {relic.description}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-success">
                    +{luck} Luck, permanently
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Roster */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Your opponents, in order
            </h3>
            {roster.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Challengers are being summoned. Check back soon.
              </p>
            ) : (
              <ol
                aria-label="Campaign opponents in order"
                className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-10"
              >
                {roster.map((o) => {
                  const n = o.opponentNumber!;
                  const isBoss = n === bossNumber && total > 1;
                  const beaten = beatenBy(n);
                  const allBeat = wizardCount > 0 && beaten === wizardCount;
                  return (
                    <li
                      key={o._id}
                      className="min-w-0"
                      title={`${o.name} (${difficultyLabel(o.difficulty)})${o.spellStyle ? `: ${o.spellStyle}` : ""}`}
                    >
                      <div
                        className={cn(
                          "relative aspect-square w-full overflow-hidden rounded-lg border-2 bg-muted",
                          isBoss ? "border-warning" : "border-border/60",
                          allBeat && "border-success",
                        )}
                      >
                        {o.illustration ? (
                          <ConvexImage
                            storageId={o.illustration}
                            alt={o.name}
                            width={160}
                            height={160}
                            className="h-full w-full object-cover object-top"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xl font-bold text-primary">
                            {o.name.charAt(0)}
                          </div>
                        )}
                        <span className="absolute left-1 top-1 rounded bg-black/65 px-1.5 text-[11px] font-bold text-white">
                          {isBoss ? "Boss" : `#${n}`}
                        </span>
                        {isBoss && (
                          <Crown
                            className="absolute right-1 top-1 h-4 w-4 text-warning drop-shadow"
                            aria-hidden
                          />
                        )}
                        {allBeat && (
                          <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-success py-0.5 text-[11px] font-semibold text-white">
                            <Check className="h-3 w-3" aria-hidden />
                            Beaten
                          </span>
                        )}
                      </div>
                      <p className="mt-1 truncate text-xs font-semibold">
                        {isBoss && (
                          <span className="sr-only">Final boss: </span>
                        )}
                        {o.name}
                      </p>
                      <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <span
                          aria-hidden
                          className={cn(
                            "h-2 w-2 shrink-0 rounded-full",
                            DIFFICULTY_DOT[o.difficulty ?? ""] ??
                              "bg-muted-foreground",
                          )}
                        />
                        <span className="truncate">
                          {difficultyLabel(o.difficulty)}
                        </span>
                      </p>
                      {wizardCount > 1 && beaten > 0 && !allBeat && (
                        <p className="text-[11px] font-medium text-success">
                          {beaten}/{wizardCount} beat
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </CardContent>

        {wizardCount > 0 && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border/50 bg-muted/30 px-5 py-3 text-sm sm:px-8">
            <Crown className="h-4 w-4 text-warning" aria-hidden />
            {finished.length === 0 ? (
              <span>
                {wizardCount === 1
                  ? "Your wizard hasn't"
                  : "None of your wizards have"}{" "}
                earned this relic yet.
              </span>
            ) : (
              <>
                <span>
                  <strong>
                    {finished.length} of {wizardCount}
                  </strong>{" "}
                  {wizardCount === 1 ? "wizard has" : "wizards have"} earned
                  this relic:
                </span>
                <ul className="flex flex-wrap gap-2">
                  {finished.map(({ wizard }) => (
                    <li
                      key={wizard._id}
                      className="flex items-center gap-1.5 rounded-full bg-warning/15 py-0.5 pl-0.5 pr-2.5 text-xs font-medium"
                    >
                      <span className="h-5 w-5 overflow-hidden rounded-full bg-muted">
                        {wizard.illustration && (
                          <ConvexImage
                            storageId={wizard.illustration}
                            alt=""
                            width={20}
                            height={20}
                            className="h-full w-full object-cover object-top"
                          />
                        )}
                      </span>
                      {wizard.name}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </Card>
    </section>
  );
}
