"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Scroll, Zap } from "lucide-react";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { ConvexImage } from "@/components/ConvexImage";
import { cn } from "@/lib/utils";

export type DuelOutcome =
  "win" | "loss" | "draw" | "live" | "waiting" | "cancelled";

/** How a duel went from one wizard's point of view. */
export function duelOutcomeFor(
  duel: Pick<Doc<"duels">, "status" | "winners" | "losers">,
  wizardId: Id<"wizards">,
): DuelOutcome {
  switch (duel.status) {
    case "IN_PROGRESS":
      return "live";
    case "WAITING_FOR_PLAYERS":
      return "waiting";
    case "CANCELLED":
      return "cancelled";
  }
  if (duel.winners?.includes(wizardId)) return "win";
  if (duel.losers?.includes(wizardId)) return "loss";
  return "draw";
}

const OUTCOME_CHIP: Record<DuelOutcome, { label: string; className: string }> =
  {
    win: {
      label: "Victory",
      className: "bg-success/15 text-success border-success/40",
    },
    loss: {
      label: "Defeat",
      className: "bg-destructive/15 text-destructive border-destructive/40",
    },
    draw: {
      label: "Draw",
      className: "bg-muted text-muted-foreground border-border",
    },
    live: { label: "Live", className: "bg-info/15 text-info border-info/40" },
    waiting: {
      label: "Waiting",
      className: "bg-warning/15 text-warning border-warning/40",
    },
    cancelled: {
      label: "Cancelled",
      className: "bg-muted text-muted-foreground border-border",
    },
  };

function formatDate(ms: number) {
  const d = new Date(ms);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

function roundsLabel(
  duel: Pick<Doc<"duels">, "status" | "numberOfRounds" | "currentRound">,
) {
  if (duel.status === "IN_PROGRESS" && duel.currentRound) {
    return typeof duel.numberOfRounds === "number"
      ? `Round ${duel.currentRound} of ${duel.numberOfRounds}`
      : `Round ${duel.currentRound}`;
  }
  return typeof duel.numberOfRounds === "number"
    ? `${duel.numberOfRounds} rounds`
    : "To the death";
}

export interface DuelOpponent {
  _id: Id<"wizards">;
  name: string;
  illustration?: string;
  illustrationURL?: string;
}

function OpponentAvatar({ wizard }: { wizard: DuelOpponent | null }) {
  const base =
    "relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-border bg-muted";
  if (wizard?.illustration) {
    return (
      <div className={base}>
        <ConvexImage
          storageId={wizard.illustration}
          alt=""
          width={88}
          height={88}
          sizes="88px"
          className="h-full w-full scale-150 rounded-none object-cover object-[50%_40%]"
        />
      </div>
    );
  }
  if (wizard?.illustrationURL) {
    return (
      <div className={base}>
        <Image
          src={wizard.illustrationURL}
          alt=""
          fill
          sizes="88px"
          className="scale-150 object-cover object-[50%_40%]"
        />
      </div>
    );
  }
  return (
    <div className={cn(base, "flex items-center justify-center")}>
      <Zap className="h-4 w-4 text-muted-foreground" aria-hidden />
    </div>
  );
}

/** One line of a wizard's duel history: opponent, result, date, length. */
export function WizardDuelRow({
  duel,
  wizardId,
}: {
  duel: Pick<
    Doc<"duels">,
    | "_id"
    | "status"
    | "wizards"
    | "winners"
    | "losers"
    | "numberOfRounds"
    | "currentRound"
    | "createdAt"
    | "isCampaignBattle"
  > & {
    opponent: DuelOpponent | null;
    extraOpponents: number;
  };
  wizardId: Id<"wizards">;
}) {
  const { opponent, extraOpponents } = duel;
  const outcome = duelOutcomeFor(duel, wizardId);
  const chip = OUTCOME_CHIP[outcome];
  const hasOpponent = duel.wizards.some((id) => id !== wizardId);

  const opponentName = !hasOpponent
    ? "Awaiting a challenger"
    : `vs ${opponent?.name ?? "Unknown wizard"}${extraOpponents > 0 ? ` +${extraOpponents}` : ""}`;

  return (
    <li>
      <Link
        href={`/duels/${duel._id}`}
        className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-accent/50 focus-visible:bg-accent/50 sm:px-4"
      >
        <OpponentAvatar wizard={opponent} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-foreground">
            {opponentName}
          </div>
          <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            {duel.isCampaignBattle && (
              <>
                <Scroll className="h-3 w-3 shrink-0" aria-hidden />
                <span>Campaign ·</span>
              </>
            )}
            <span className="truncate">
              {formatDate(duel.createdAt)}
              {/* Length is minor detail on phones, except a live round count. */}
              <span
                className={
                  duel.status === "IN_PROGRESS" ? undefined : "hidden sm:inline"
                }
              >
                {" "}
                · {roundsLabel(duel)}
              </span>
            </span>
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
            chip.className,
          )}
        >
          {chip.label}
        </span>
        <ChevronRight
          className="h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
      </Link>
    </li>
  );
}
