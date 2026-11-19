"use client";

import { Check, Crown, Lock, Swords } from "lucide-react";
import {
  CAMPAIGN_TOTAL_OPPONENTS,
  getOpponentStatus,
  type CampaignProgressLike,
} from "@/lib/campaignStatus";
import { cn } from "@/lib/utils";
import { ConvexImage } from "@/components/ConvexImage";

interface CampaignPathMapProps {
  progress: CampaignProgressLike | null | undefined;
  /** Optional opponents (matched by opponentNumber) for portraits and labels. */
  opponents?: Array<{
    opponentNumber?: number;
    name: string;
    illustration?: string;
  }>;
  /** Called when a node is activated. */
  onSelect?: (opponentNumber: number) => void;
  /** Compact pips only (for cards). */
  compact?: boolean;
  className?: string;
}

const STATUS_LABEL = {
  defeated: "defeated",
  current: "next opponent",
  locked: "locked",
} as const;

/**
 * Ten-node journey path. Completed nodes are filled, the current node pulses,
 * and the final node is a boss/relic marker.
 */
export function CampaignPathMap({
  progress,
  opponents,
  onSelect,
  compact = false,
  className,
}: CampaignPathMapProps) {
  const nodes = Array.from(
    { length: CAMPAIGN_TOTAL_OPPONENTS },
    (_, i) => i + 1,
  );
  const defeated = progress?.defeatedOpponents.length ?? 0;

  if (compact) {
    return (
      <div
        role="img"
        aria-label={`${defeated} of ${CAMPAIGN_TOTAL_OPPONENTS} opponents defeated`}
        className={cn("flex gap-1", className)}
      >
        {nodes.map((n) => {
          const status = getOpponentStatus(n, progress);
          return (
            <span
              key={n}
              className={cn(
                "h-2 flex-1 rounded-full transition-colors",
                status === "defeated" && "bg-success",
                status === "current" && "bg-primary motion-safe:animate-pulse",
                status === "locked" && "bg-muted",
              )}
            />
          );
        })}
      </div>
    );
  }

  return (
    <ol
      aria-label="Campaign path"
      className={cn(
        "grid grid-cols-5 gap-y-6 sm:grid-cols-10 sm:gap-y-0",
        className,
      )}
    >
      {nodes.map((n) => {
        const status = getOpponentStatus(n, progress);
        const isBoss = n === CAMPAIGN_TOTAL_OPPONENTS;
        const opponent = opponents?.find((o) => o.opponentNumber === n);
        const name = opponent?.name;
        const portrait =
          status !== "locked" ? opponent?.illustration : undefined;
        const interactive = !!onSelect;
        const Wrapper = interactive ? "button" : "div";
        return (
          <li key={n} className="relative flex flex-col items-center">
            {/* connector to the previous node, restarting on each mobile row */}
            {n > 1 && (
              <span
                aria-hidden
                className={cn(
                  "absolute top-6 right-1/2 h-0.5 w-full",
                  (n - 1) % 5 === 0 && "hidden sm:block",
                  getOpponentStatus(n - 1, progress) === "defeated"
                    ? "bg-success"
                    : "bg-border",
                )}
              />
            )}
            <Wrapper
              {...(interactive
                ? {
                    type: "button" as const,
                    onClick: () => onSelect?.(n),
                  }
                : {})}
              aria-label={`${interactive ? "Jump to opponent" : "Opponent"} ${n}${status !== "locked" && name ? `, ${name}` : ""}: ${STATUS_LABEL[status]}${isBoss ? " (final boss, awards the Campaign Relic)" : ""}`}
              aria-current={status === "current" ? "step" : undefined}
              title={status !== "locked" && name ? name : undefined}
              className={cn(
                "relative z-10 flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 text-sm font-bold transition-all",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                status === "defeated" &&
                  "border-success bg-success text-success-foreground",
                status === "current" &&
                  "border-primary bg-primary text-primary-foreground ring-4 ring-primary/30 motion-safe:animate-pulse",
                status === "locked" &&
                  "border-border bg-muted text-muted-foreground",
                isBoss && "border-warning ring-2 ring-warning/40",
                interactive && "cursor-pointer hover:scale-110",
              )}
            >
              {portrait ? (
                <>
                  <ConvexImage
                    storageId={portrait}
                    alt=""
                    width={48}
                    height={48}
                    className={cn(
                      "h-full w-full object-cover object-top",
                      status === "defeated" && "opacity-50",
                    )}
                  />
                  {status === "defeated" && (
                    <span className="absolute inset-0 flex items-center justify-center bg-success/60">
                      <Check className="h-5 w-5 text-white" aria-hidden />
                    </span>
                  )}
                </>
              ) : status === "defeated" ? (
                <Check className="h-5 w-5" aria-hidden />
              ) : status === "current" ? (
                isBoss ? (
                  <Crown className="h-5 w-5" aria-hidden />
                ) : (
                  <Swords className="h-5 w-5" aria-hidden />
                )
              ) : isBoss ? (
                <Crown className="h-5 w-5" aria-hidden />
              ) : (
                <Lock className="h-4 w-4" aria-hidden />
              )}
            </Wrapper>
            <span
              className={cn(
                "mt-1 max-w-full truncate whitespace-nowrap text-xs font-medium",
                status === "current" ? "text-primary" : "text-muted-foreground",
              )}
            >
              {isBoss ? "Boss" : `#${n}`}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
