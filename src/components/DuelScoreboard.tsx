"use client";

import { memo, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Heart,
  Star,
  Swords,
  Sparkles,
  Clock,
  Skull,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConvexImage } from "@/components/ConvexImage";
import { Crown } from "@/components/ui/crown-icon";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserIdDisplay } from "@/components/UserIdDisplay";
import { Id } from "../../convex/_generated/dataModel";

export interface ScoreboardWizard {
  _id: Id<"wizards">;
  name: string;
  illustration?: string;
  owner?: string;
  description?: string;
  ownerUserId?: string;
  ownerDisplayName?: string;
}

interface DuelScoreboardProps {
  wizards: [
    ScoreboardWizard | null | undefined,
    ScoreboardWizard | null | undefined,
  ];
  wizardIds: Id<"wizards">[];
  hitPoints: Record<string, number>;
  points: Record<string, number>;
  maxHitPoints?: number;
  userWizardId?: Id<"wizards">;
  winnerIds?: Id<"wizards">[];
  duelStatus: string;
  currentRound: number;
  numberOfRounds: number | "TO_THE_DEATH";
  roundStatus?: string;
  /** Wizards that still owe an action this round. */
  needActionsFrom: Id<"wizards">[];
  onJumpToComposer?: () => void;
  onJumpToCurrentRound?: () => void;
  /** Set when the duel is over but the viewer hasn't revealed the result. */
  onReveal?: () => void;
  /** Lets a player take back a locked-in action without scrolling to the round. */
  onUndo?: () => Promise<void> | void;
  /** Highest resolved round. Announced politely to screen readers. */
  resolvedRound?: number;
  /** When the viewer locked in their action, to show how long they have waited. */
  waitingSince?: number;
  /** False until the viewer's identity and wizards have loaded. */
  viewerKnown?: boolean;
  /** Hide "Defeated" and the final label until the viewer reveals the result. */
  hideOutcome?: boolean;
  /** Rendered as the bottom row, e.g. the round timeline. */
  children?: ReactNode;
  /**
   * Set while the viewer is replaying rounds they haven't watched yet. Shows
   * the round being watched instead of the live state, and hides live actions.
   */
  replay?: { round: number };
}

export function describeTurn(args: {
  duelStatus: string;
  roundStatus?: string;
  userWizardId?: Id<"wizards">;
  needActionsFrom: Id<"wizards">[];
  wizardIds: Id<"wizards">[];
  nameOf: (id: Id<"wizards">) => string;
}): { text: string; tone: "action" | "waiting" | "busy" | "done" | "idle" } {
  const { duelStatus, roundStatus, userWizardId, needActionsFrom, wizardIds } =
    args;
  if (duelStatus === "WAITING_FOR_PLAYERS") {
    return { text: "Waiting for the duel to begin", tone: "idle" };
  }
  if (duelStatus === "CANCELLED") {
    return { text: "Duel cancelled", tone: "done" };
  }
  if (duelStatus === "COMPLETED") {
    return { text: "Duel complete", tone: "done" };
  }
  if (roundStatus === "PROCESSING") {
    return { text: "The Arcane Arbiter is resolving the round", tone: "busy" };
  }
  if (roundStatus === "WAITING_FOR_SPELLS") {
    const total = wizardIds.length || 2;
    const submitted = total - needActionsFrom.length;
    if (userWizardId && needActionsFrom.includes(userWizardId)) {
      return {
        text: submitted > 0 ? "Your move. Your opponent is ready" : "Your move",
        tone: "action",
      };
    }
    const pending = needActionsFrom.map(args.nameOf).join(" and ");
    if (userWizardId) {
      return {
        text: `Action submitted. Waiting on ${pending || "the other wizard"}`,
        tone: "waiting",
      };
    }
    return {
      text: `Waiting on ${pending || "the wizards"}`,
      tone: "waiting",
    };
  }
  return { text: "Duel in progress", tone: "idle" };
}

/** Shows a floating "+/-N" for a couple of seconds whenever `value` changes. */
function useDelta(value: number | undefined) {
  const prev = useRef(value);
  const [delta, setDelta] = useState<{ amount: number; key: number } | null>(
    null,
  );
  useEffect(() => {
    if (value === undefined) return;
    const before = prev.current;
    prev.current = value;
    if (before === undefined || before === value) return;
    setDelta({ amount: value - before, key: Date.now() });
    const t = setTimeout(() => setDelta(null), 3000);
    return () => clearTimeout(t);
  }, [value]);
  return delta;
}

/** Minutes waited, refreshed every 15s. Hidden from screen readers. */
function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);
  const mins = Math.floor(Math.max(0, now - since) / 60_000);
  if (mins < 1) return null;
  return (
    <span aria-hidden="true" className="shrink-0 text-muted-foreground">
      · {mins}m
    </span>
  );
}

function Combatant({
  wizard,
  hp,
  maxHp,
  points,
  isYou,
  isWinner,
  hasSubmitted,
  hideOutcome,
  align,
}: {
  wizard: ScoreboardWizard | null | undefined;
  hp: number;
  maxHp: number;
  points: number;
  isYou: boolean;
  isWinner: boolean;
  hasSubmitted: boolean | null;
  hideOutcome: boolean;
  align: "left" | "right";
}) {
  const hpDelta = useDelta(hp);
  const pointsDelta = useDelta(points);
  const ratio = Math.max(0, Math.min(1, hp / maxHp));
  const state = hideOutcome
    ? null
    : hp <= 0
      ? "Defeated"
      : ratio <= 0.3
        ? "Critical"
        : null;
  const barColor =
    ratio > 0.6 ? "bg-success" : ratio > 0.3 ? "bg-warning" : "bg-destructive";
  const name = wizard?.name ?? "Loading…";
  const right = align === "right";

  return (
    <div
      className={`flex min-w-0 flex-1 items-center gap-2 sm:gap-3 ${right ? "flex-row-reverse text-right" : ""}`}
    >
      <Dialog>
        <DialogTrigger
          disabled={!wizard?.illustration}
          aria-label={`View ${name}`}
          className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 enabled:cursor-zoom-in"
        >
          <div
            className={`relative size-9 shrink-0 overflow-hidden rounded-full border-2 sm:size-14 md:size-20 ${
              isWinner
                ? "border-warning ring-2 ring-warning/50"
                : isYou
                  ? "border-info"
                  : "border-border"
            } ${hp <= 0 && !hideOutcome ? "grayscale" : ""} ${hpDelta && hpDelta.amount < 0 ? "duel-hit" : ""}`}
          >
            {wizard?.illustration ? (
              <ConvexImage
                storageId={wizard.illustration}
                alt=""
                width={160}
                height={160}
                className="h-full w-full object-cover object-top"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-primary to-gold text-sm font-bold text-white">
                {name.charAt(0)}
              </div>
            )}
          </div>
        </DialogTrigger>
        {wizard?.illustration && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{name}</DialogTitle>
              <DialogDescription className="line-clamp-4">
                {wizard.description ?? ""}
              </DialogDescription>
            </DialogHeader>
            <div className="aspect-square w-full overflow-hidden rounded-lg">
              <ConvexImage
                storageId={wizard.illustration}
                alt={name}
                width={1024}
                height={1024}
                sizes="(min-width: 512px) 480px, 100vw"
                quality={95}
                className="h-full w-full object-cover object-top"
              />
            </div>
            <div className="flex items-center justify-between gap-2 text-sm">
              {wizard.ownerUserId ? (
                <UserIdDisplay
                  userId={wizard.ownerUserId}
                  displayName={wizard.ownerDisplayName}
                  size="sm"
                  showAvatar={false}
                />
              ) : (
                <span />
              )}
              <Link
                href={`/wizards/${wizard._id}`}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                View wizard
              </Link>
            </div>
          </DialogContent>
        )}
      </Dialog>
      <div className="min-w-0 flex-1">
        <div
          className={`flex items-center gap-1.5 ${right ? "flex-row-reverse" : ""}`}
        >
          {isWinner && <Crown className="h-4 w-4 shrink-0 text-warning" />}
          <span className="truncate text-sm font-semibold text-foreground sm:text-base">
            {name}
          </span>
          {isYou && (
            <span className="hidden shrink-0 rounded bg-info/20 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-info min-[420px]:inline">
              You
            </span>
          )}
        </div>
        <div className="relative mt-1">
          <div
            role="progressbar"
            aria-label={`${name} health`}
            aria-valuemin={0}
            aria-valuemax={maxHp}
            aria-valuenow={Math.max(0, hp)}
            aria-valuetext={
              hideOutcome
                ? "Hidden until the result is revealed"
                : `${Math.max(0, hp)} of ${maxHp} health${state ? `, ${state.toLowerCase()}` : ""}`
            }
            className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
          >
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out motion-reduce:transition-none ${barColor} ${right ? "ml-auto" : ""}`}
              style={{ width: `${ratio * 100}%` }}
            />
          </div>
          {hpDelta && (
            <span
              key={hpDelta.key}
              aria-hidden="true"
              className={`pointer-events-none absolute -top-5 animate-in fade-in slide-in-from-bottom-2 text-sm font-bold motion-reduce:animate-none ${
                hpDelta.amount < 0 ? "text-destructive" : "text-success"
              } ${right ? "left-0" : "right-0"}`}
            >
              {hpDelta.amount > 0 ? "+" : ""}
              {hpDelta.amount} HP
            </span>
          )}
        </div>
        <div
          className={`duel-scoreboard-details mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground ${right ? "justify-end" : ""}`}
        >
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            {hp <= 0 && !hideOutcome ? (
              <Skull className="h-3 w-3 text-destructive" aria-hidden="true" />
            ) : (
              <Heart
                className={`h-3 w-3 ${ratio <= 0.3 ? "text-destructive" : "text-success"}`}
                aria-hidden="true"
              />
            )}
            {`${Math.max(0, hp)}/${maxHp} HP`}
            {state && (
              <span className="ml-1 rounded bg-destructive/15 px-1 text-[10px] font-bold uppercase text-destructive">
                {state}
              </span>
            )}
          </span>
          <span className="relative inline-flex items-center gap-1">
            <span className="sr-only">Points: </span>
            <Star className="h-3 w-3 text-gold" aria-hidden="true" />
            <span className="font-medium text-foreground">{points}</span> pts
            {pointsDelta && (
              <span
                key={pointsDelta.key}
                aria-hidden="true"
                className="animate-in fade-in text-success font-bold motion-reduce:animate-none"
              >
                {pointsDelta.amount > 0 ? "+" : ""}
                {pointsDelta.amount}
              </span>
            )}
          </span>
          {hasSubmitted !== null && (
            <span
              className={`inline-flex items-center gap-1 ${hasSubmitted ? "text-success" : "text-warning animate-pulse motion-reduce:animate-none"}`}
            >
              {hasSubmitted ? (
                <Check className="h-3 w-3" aria-hidden="true" />
              ) : (
                <Clock className="h-3 w-3" aria-hidden="true" />
              )}
              <span className="sr-only sm:not-sr-only">
                {hasSubmitted ? "Ready" : "Thinking"}
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export const DuelScoreboard = memo(function DuelScoreboard({
  wizards,
  wizardIds,
  hitPoints,
  points,
  maxHitPoints = 100,
  userWizardId,
  winnerIds,
  duelStatus,
  currentRound,
  numberOfRounds,
  roundStatus,
  needActionsFrom,
  onJumpToComposer,
  onJumpToCurrentRound,
  onReveal,
  onUndo,
  resolvedRound,
  waitingSince,
  viewerKnown = true,
  hideOutcome = false,
  children,
  replay,
}: DuelScoreboardProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [undoing, setUndoing] = useState(false);
  // Publish the real height so scroll offsets match the sticky header.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const root = document.documentElement;
    const update = () =>
      root.style.setProperty(
        "--duel-sticky-h",
        `${Math.ceil(el.getBoundingClientRect().height)}px`,
      );
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty("--duel-sticky-h");
    };
  }, []);
  const nameOf = (id: Id<"wizards">) =>
    wizards.find((w) => w?._id === id)?.name ?? "the other wizard";
  const turn: ReturnType<typeof describeTurn> = replay
    ? {
        text:
          replay.round === 0
            ? "Replay: the arena awaits"
            : `Replay: watching round ${replay.round}`,
        tone: "idle",
      }
    : describeTurn({
        duelStatus,
        roundStatus,
        userWizardId,
        needActionsFrom,
        wizardIds,
        nameOf,
      });
  const inRound = duelStatus === "IN_PROGRESS" && !replay;
  const roundLabel = replay
    ? replay.round === 0
      ? "Introduction"
      : typeof numberOfRounds === "number"
        ? `Round ${replay.round} of ${numberOfRounds}`
        : `Round ${replay.round} · To the death`
    : duelStatus === "WAITING_FOR_PLAYERS"
      ? "Duel lobby"
      : duelStatus === "CANCELLED"
        ? "Cancelled"
        : duelStatus === "COMPLETED"
          ? hideOutcome
            ? `Round ${typeof numberOfRounds === "number" ? Math.min(currentRound, numberOfRounds) : currentRound}`
            : "Final"
          : typeof numberOfRounds === "number"
            ? `Round ${Math.min(currentRound, numberOfRounds)} of ${numberOfRounds}`
            : `Round ${currentRound} · To the death`;
  const showReadiness = inRound && roundStatus === "WAITING_FOR_SPELLS";

  const toneClass = {
    action: "bg-warning/20 text-foreground border-warning/60",
    waiting: "bg-info/15 text-foreground border-info/50",
    busy: "bg-primary/10 text-foreground border-primary/40",
    done: "bg-muted text-foreground border-border",
    idle: "bg-muted text-foreground border-border",
  }[turn.tone];

  return (
    <section
      ref={sectionRef}
      aria-label="Duel scoreboard"
      className="sticky top-[var(--app-navbar-h)] z-20 md:top-0 -mx-4 mb-6 border-b border-border/60 bg-card/95 px-3 py-2 sm:py-3 sm:px-4 shadow-md backdrop-blur-md sm:mx-0 sm:rounded-xl sm:border"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Swords className="h-4 w-4 text-primary" aria-hidden="true" />
          {onJumpToCurrentRound && inRound ? (
            <button
              type="button"
              onClick={onJumpToCurrentRound}
              className="text-sm font-bold text-foreground underline-offset-4 hover:underline focus-visible:underline"
            >
              {roundLabel}
            </button>
          ) : (
            <span className="text-sm font-bold text-foreground">
              {roundLabel}
            </span>
          )}
        </div>
        <div
          role="status"
          aria-live="polite"
          title={turn.text}
          className={`flex min-w-0 max-w-full items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium sm:text-sm ${toneClass}`}
        >
          {turn.tone === "busy" && (
            <Sparkles
              className="h-3.5 w-3.5 animate-pulse motion-reduce:animate-none"
              aria-hidden="true"
            />
          )}
          {viewerKnown && !userWizardId && inRound && (
            <span className="rounded bg-muted px-1.5 text-[10px] font-semibold uppercase tracking-wide">
              Spectating
            </span>
          )}
          <span className="line-clamp-2 sm:line-clamp-none">{turn.text}</span>
          {turn.tone === "waiting" && userWizardId && waitingSince ? (
            <Elapsed since={waitingSince} />
          ) : null}
          {resolvedRound ? (
            <span className="sr-only">. Round {resolvedRound} resolved.</span>
          ) : null}
        </div>
        {turn.tone === "waiting" &&
          userWizardId &&
          roundStatus === "WAITING_FOR_SPELLS" &&
          onUndo && (
            <Button
              size="sm"
              variant="outline"
              disabled={undoing}
              onClick={async () => {
                setUndoing(true);
                try {
                  await onUndo();
                } finally {
                  setUndoing(false);
                }
              }}
            >
              {undoing ? (
                "Undoing..."
              ) : (
                <>
                  Undo<span className="hidden sm:inline"> action</span>
                </>
              )}
            </Button>
          )}
        {duelStatus === "COMPLETED" && onReveal && !replay && (
          <Button size="sm" onClick={onReveal}>
            Reveal<span className="hidden sm:inline"> the result</span>
          </Button>
        )}
        {turn.tone === "action" && onJumpToComposer && (
          <Button
            size="sm"
            onClick={onJumpToComposer}
            className="hidden sm:inline-flex"
          >
            Write your action
          </Button>
        )}
      </div>
      <div className="flex items-stretch gap-2 sm:gap-4">
        {[0, 1].map((i) => {
          const id = wizardIds[i];
          if (!id) {
            return (
              <div key="open-slot" className="contents">
                <div
                  className="flex shrink-0 items-center text-muted-foreground"
                  aria-hidden="true"
                >
                  <span className="text-xs font-bold">VS</span>
                </div>
                <div className="flex min-w-0 flex-1 items-center justify-end gap-3 text-right">
                  <span className="text-sm text-muted-foreground">
                    Waiting for an opponent to join
                  </span>
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-border text-muted-foreground sm:size-14 md:size-20"
                    aria-hidden="true"
                  >
                    ?
                  </div>
                </div>
              </div>
            );
          }
          return (
            <div key={id} className="contents">
              {i === 1 && (
                <div
                  className="flex shrink-0 items-center text-muted-foreground"
                  aria-hidden="true"
                >
                  <span className="text-xs font-bold">VS</span>
                </div>
              )}
              <Combatant
                wizard={wizards[i]}
                hp={hitPoints[id] ?? maxHitPoints}
                maxHp={maxHitPoints}
                points={points[id] ?? 0}
                isYou={userWizardId === id}
                isWinner={!!winnerIds?.includes(id)}
                hideOutcome={hideOutcome}
                hasSubmitted={
                  showReadiness ? !needActionsFrom.includes(id) : null
                }
                align={i === 0 ? "left" : "right"}
              />
            </div>
          );
        })}
      </div>
      {children && (
        <div className="duel-scoreboard-extras hidden sm:block">{children}</div>
      )}
    </section>
  );
});
