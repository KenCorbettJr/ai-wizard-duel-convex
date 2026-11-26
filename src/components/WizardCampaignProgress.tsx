"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { ChevronRight, Crown, Scroll } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface WizardCampaignProgressProps {
  wizardId: Id<"wizards">;
  isOwner: boolean;
}

const TOTAL_OPPONENTS = 10;

/**
 * One-line campaign status for a wizard profile. Visitors only see it once
 * the wizard has started the current season; owners also get a link in.
 */
export function WizardCampaignProgress({
  wizardId,
  isOwner,
}: WizardCampaignProgressProps) {
  const progress = useQuery(api.campaigns.getWizardCampaignProgress, {
    wizardId,
  });
  const activeSeason = useQuery(api.campaignSeasons.getActiveCampaignSeason);

  if (progress === undefined || activeSeason === undefined) return null;
  if (!activeSeason) return null;
  if (!progress && !isOwner) return null;

  const defeated = progress?.defeatedOpponents.length ?? 0;
  const complete = defeated >= TOTAL_OPPONENTS;

  const status = !progress
    ? "Not started"
    : complete
      ? "Complete"
      : `${defeated}/${TOTAL_OPPONENTS} defeated`;

  const content = (
    <>
      {complete ? (
        <Crown className="h-5 w-5 shrink-0 text-gold" aria-hidden />
      ) : (
        <Scroll className="h-5 w-5 shrink-0 text-primary" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="truncate font-medium text-foreground">
            {activeSeason.name}
          </span>
          <span
            className={cn(
              "shrink-0 text-xs",
              complete ? "font-semibold text-gold" : "text-muted-foreground",
            )}
          >
            {status}
          </span>
        </div>
        {progress ? (
          <Progress
            value={(defeated / TOTAL_OPPONENTS) * 100}
            className="mt-1.5 h-1.5"
            aria-label={`Campaign progress: ${defeated} of ${TOTAL_OPPONENTS}`}
          />
        ) : (
          <p className="mt-0.5 text-xs text-muted-foreground">
            Beat {TOTAL_OPPONENTS} AI opponents to earn a luck relic
          </p>
        )}
      </div>
      <span className="flex shrink-0 items-center text-xs font-medium text-primary">
        {isOwner
          ? progress
            ? complete
              ? "View"
              : "Continue"
            : "Start"
          : "What's this?"}
        <ChevronRight className="h-4 w-4" aria-hidden />
      </span>
    </>
  );

  // Owners open their wizard's campaign; visitors learn what a campaign is.
  const body = (
    <Link
      href={isOwner ? `/campaign/wizard/${wizardId}` : "/campaign"}
      className="flex items-center gap-3 rounded-lg border border-border bg-card/60 px-3 py-2.5 transition-colors hover:bg-accent/50 sm:px-4"
    >
      {content}
    </Link>
  );

  return (
    <section aria-labelledby="campaign-heading">
      <h2
        id="campaign-heading"
        className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground"
      >
        <Scroll className="h-4 w-4" aria-hidden />
        Campaign
      </h2>
      {body}
    </section>
  );
}
