"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConvexImage } from "@/components/ConvexImage";
import { ImageLightbox } from "@/components/ImageLightbox";
import { D20Die } from "@/components/ui/d20-die";
import {
  Sparkles,
  RefreshCw,
  Scroll,
  ChevronDown,
  Check,
  RotateCcw,
  FastForward,
} from "lucide-react";
import { toast } from "sonner";
import { Doc } from "../../convex/_generated/dataModel";
import { memo, useState, useEffect, useRef, useCallback } from "react";
import { RuneSpinner } from "@/components/ui/rune-spinner";
import {
  NarratedText,
  type NarrationPlaySignal,
} from "@/components/NarratedText";
import { useConclusionReveal } from "@/hooks/useConclusionReveal";
import { MediaRetryButton } from "@/components/MediaRetryButton";
import { SpellReactions } from "@/components/SpellReactions";

type RoundWizard = Doc<"wizards"> | null | undefined;

interface DuelRoundCardProps {
  round: Doc<"duelRounds">;
  duel: Doc<"duels">;
  /** Wizards already loaded by the page. Avoids a query per round. */
  wizard1?: RoundWizard;
  wizard2?: RoundWizard;
  /** The newest round stays expanded. Older completed rounds start collapsed. */
  isLatest?: boolean;
  /**
   * Changing this to a new non-zero value plays the staged reveal of a
   * completed round. Zero or undefined shows the round as-is.
   */
  revealToken?: number;
  /** Called when the reveal reaches the damage step, so totals can update. */
  onRevealImpact?: (roundNumber: number) => void;
  /** Called when the staged reveal has finished or was skipped. */
  onRevealComplete?: (roundNumber: number) => void;
}

/** Reveal steps, in order. */
const STAGE = {
  START: 0,
  SPELL_A: 1,
  SPELL_B: 2,
  DICE: 3,
  IMAGE: 4,
  RESULT: 5,
  IMPACT: 6,
  DONE: 7,
} as const;

/** When each step starts, in ms from the start of the reveal. */
function revealSchedule(
  hasImage: boolean,
  hasSpells: boolean,
): Array<[number, number]> {
  const imageGap = hasImage ? 1300 : 300;
  const spells = 150;
  // Rounds without spells (the conclusion) go straight to the scene.
  const dice = hasSpells ? spells + 1100 : spells;
  // Hold on the dice long enough to read them before the view moves on.
  const image = hasSpells ? dice + 1300 : dice;
  const result = image + imageGap;
  const impact = result + 1300;
  return [
    [STAGE.SPELL_A, spells],
    [STAGE.SPELL_B, spells + 450],
    [STAGE.DICE, dice],
    [STAGE.IMAGE, image],
    [STAGE.RESULT, result],
    [STAGE.IMPACT, impact],
    [STAGE.DONE, impact + 700],
  ];
}

/** The result line, one word at a time. Whitespace (and line breaks) kept. */
function RevealWords({ text }: { text: string }) {
  let i = 0;
  return (
    <span className="reveal-words">
      {text.split(/(\s+)/).map((part, idx) =>
        /^\s+$/.test(part) || !part ? (
          part
        ) : (
          <span
            key={idx}
            className="inline-block"
            style={{ "--i": i++ } as React.CSSProperties}
          >
            {part}
          </span>
        ),
      )}
    </span>
  );
}

const PROCESSING_STAGES = [
  "Reading both actions",
  "Rolling for luck",
  "Writing the tale",
  "Generating the scene",
];

/** Processing starts when the last wizard submits, so use the newest spell time. */
function processingStartedAt(round: Doc<"duelRounds">): number {
  const times = Object.values(round.spells ?? {}).map((s) => s.timestamp);
  return times.length ? Math.max(...times) : round._creationTime;
}

function ProcessingStages({
  startedAt,
  textOnly,
}: {
  startedAt: number;
  textOnly: boolean;
}) {
  const stages = textOnly ? PROCESSING_STAGES.slice(0, 3) : PROCESSING_STAGES;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const elapsed = Math.max(0, (now - startedAt) / 1000);
  // Estimated from elapsed time. The backend does not report sub-steps.
  const current = Math.min(
    stages.length - 1,
    elapsed < 6 ? 0 : elapsed < 14 ? 1 : elapsed < 30 ? 2 : 3,
  );
  return (
    <ol
      className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs"
      aria-label="Estimated round progress"
      title="Estimated from elapsed time"
    >
      <li className="sr-only">Estimated from elapsed time</li>
      {stages.map((label, i) => (
        <li
          key={label}
          aria-current={i === current ? "step" : undefined}
          className={`flex items-center gap-1 ${
            i < current
              ? "text-success"
              : i === current
                ? "font-semibold text-primary"
                : "text-muted-foreground"
          }`}
        >
          {i < current ? (
            <Check className="h-3 w-3" aria-hidden="true" />
          ) : (
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full bg-current ${i === current ? "animate-pulse motion-reduce:animate-none" : ""}`}
              aria-hidden="true"
            />
          )}
          {label}
          {i === stages.length - 1 && elapsed > 60 && (
            <span className="text-muted-foreground"> · still working…</span>
          )}
        </li>
      ))}
    </ol>
  );
}

function DeltaValue({ value }: { value: number }) {
  if (value === 0) return <span>0</span>;
  if (value > 0)
    return <span className="font-bold text-success">+{value}</span>;
  return <span className="text-destructive font-bold">{value}</span>;
}

export const DuelRoundCard = memo(function DuelRoundCard({
  round,
  duel,
  wizard1: wizard1Prop,
  wizard2: wizard2Prop,
  isLatest = true,
  revealToken,
  onRevealImpact,
  onRevealComplete,
}: DuelRoundCardProps) {
  const { user } = useUser();
  const [showReprocessButton, setShowReprocessButton] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const { revealed, reveal } = useConclusionReveal(duel._id);
  const conclusionLocked = round.type === "CONCLUSION" && !revealed;
  const [expandedOverride, setExpandedOverride] = useState<boolean | null>(
    null,
  );

  const triggerRoundProcessing = useMutation(api.duels.triggerRoundProcessing);
  const retryNarration = useMutation(api.roundMedia.retryRoundNarration);
  const retryIllustration = useMutation(api.roundMedia.retryRoundIllustration);
  const isDuelist = !!user?.id && duel.players.includes(user.id);

  // Fetch wizard data for each wizard in the duel
  const fetched1 = useQuery(
    api.wizards.getWizardWithOwner,
    duel.wizards[0] && wizard1Prop === undefined
      ? { wizardId: duel.wizards[0] }
      : "skip",
  );
  const fetched2 = useQuery(
    api.wizards.getWizardWithOwner,
    duel.wizards[1] && wizard2Prop === undefined
      ? { wizardId: duel.wizards[1] }
      : "skip",
  );
  const wizard1 = wizard1Prop !== undefined ? wizard1Prop : fetched1;
  const wizard2 = wizard2Prop !== undefined ? wizard2Prop : fetched2;

  // Expand when a timeline chip jumps to this round.
  useEffect(() => {
    const onExpand = (e: Event) => {
      const n = (e as CustomEvent<{ roundNumber: number }>).detail?.roundNumber;
      if (n === round.roundNumber) setExpandedOverride(true);
    };
    window.addEventListener("duel-expand-round", onExpand);
    return () => window.removeEventListener("duel-expand-round", onExpand);
  }, [round.roundNumber]);

  // Staged reveal. `animated` stays true after a run so the classes that
  // played don't snap back; a static card never sets it.
  const [stage, setStage] = useState<number>(STAGE.DONE);
  const [animated, setAnimated] = useState(false);
  const [playSignal, setPlaySignal] = useState<NarrationPlaySignal>();
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const callbacks = useRef({ onRevealImpact, onRevealComplete });
  useEffect(() => {
    callbacks.current = { onRevealImpact, onRevealComplete };
  });
  const notify = useRef(false); // only page-driven runs report back
  const pendingAudio = useRef<(() => void) | null>(null);
  const hasImage = !!round.outcome?.illustration;
  // Read at the moment a reveal starts. Keeping these out of startReveal's
  // dependencies stops images or spell data arriving mid-reveal from
  // restarting it (and with it the narration).
  const revealInputs = useRef({ hasImage, spells: round.spells });
  useEffect(() => {
    revealInputs.current = { hasImage, spells: round.spells };
  });
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  const finish = useCallback(() => {
    if (pendingAudio.current) {
      // Skipped before the scene: still start the announcer.
      pendingAudio.current();
    }
    clearTimers();
    setStage(STAGE.DONE);
    if (notify.current) {
      notify.current = false;
      callbacks.current.onRevealImpact?.(round.roundNumber);
      callbacks.current.onRevealComplete?.(round.roundNumber);
    }
  }, [round.roundNumber]);
  const startReveal = useCallback(
    (fromPage: boolean, forceAudio: boolean) => {
      clearTimers();
      notify.current = fromPage;
      const playAudio = () => {
        pendingAudio.current = null;
        setPlaySignal({ token: Date.now(), force: forceAudio });
      };
      pendingAudio.current = playAudio;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        playAudio();
        finish();
        return;
      }
      setAnimated(true);
      setStage(STAGE.START);
      // Follow the reveal down the card unless the viewer takes over scrolling.
      let follow = true;
      const stop = () => {
        follow = false;
      };
      const events = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
      events.forEach((ev) =>
        window.addEventListener(ev, stop, { passive: true, once: true }),
      );
      const followTo = (id: string, block: ScrollLogicalPosition) => {
        if (!follow) return;
        document
          .getElementById(id)
          ?.scrollIntoView({ behavior: "smooth", block });
      };
      timers.current.push(
        setTimeout(
          () => events.forEach((ev) => window.removeEventListener(ev, stop)),
          8000,
        ),
      );
      const { hasImage: withImage, spells } = revealInputs.current;
      for (const [step, at] of revealSchedule(
        withImage,
        Object.keys(spells ?? {}).length > 0,
      )) {
        timers.current.push(
          setTimeout(() => {
            if (step === STAGE.DONE) {
              finish();
              return;
            }
            setStage(step);
            const base = `round-${round.roundNumber}`;
            if (step === STAGE.IMAGE) {
              // The announcer starts as the scene appears.
              playAudio();
              followTo(`${base}-art`, "center");
            }
            if (step === STAGE.RESULT) followTo(`${base}-result`, "nearest");
            if (step === STAGE.IMPACT && notify.current) {
              callbacks.current.onRevealImpact?.(round.roundNumber);
            }
          }, at),
        );
      }
    },
    [finish, round.roundNumber],
  );
  const completed = round.status === "COMPLETED";
  // Each reveal token starts one reveal, even if this effect re-runs.
  const handledReveal = useRef<number | undefined>(undefined);
  // Unmounting cancels the reveal's timers, so forget the token too. A newly
  // resolved round mounts with its token already set, and Strict Mode then
  // unmounts and remounts it: the reveal has to start again, not stall.
  useEffect(
    () => () => {
      clearTimers();
      handledReveal.current = undefined;
    },
    [],
  );
  useEffect(() => {
    if (!revealToken || !completed) return;
    if (handledReveal.current === revealToken) return;
    handledReveal.current = revealToken;
    startReveal(true, false);
  }, [revealToken, completed, startReveal]);
  const revealing = animated && stage < STAGE.DONE;
  /** Class for an element that appears at `at`: hidden before, animated on. */
  const at = (step: number, anim = "reveal-pop") =>
    !animated ? "" : stage < step ? "reveal-wait" : anim;

  // Flash the card briefly when a round resolves while the viewer is here.
  const prevStatus = useRef(round.status);
  const [justResolved, setJustResolved] = useState(false);
  useEffect(() => {
    if (prevStatus.current !== "COMPLETED" && round.status === "COMPLETED") {
      setJustResolved(true);
      const t = setTimeout(() => setJustResolved(false), 4000);
      prevStatus.current = round.status;
      return () => clearTimeout(t);
    }
    prevStatus.current = round.status;
  }, [round.status]);

  // Show the reprocess button 1 minute after the round entered PROCESSING. The
  // start is never earlier than when this card mounted, so a client clock that
  // runs ahead of the server can't show it early.
  const [mountedAt] = useState(() => Date.now());
  const startedAtMs = Math.max(processingStartedAt(round), mountedAt);
  useEffect(() => {
    if (round.status === "PROCESSING") {
      const remaining = Math.max(0, 60000 - (Date.now() - startedAtMs));
      const timer = setTimeout(() => {
        setShowReprocessButton(true);
      }, remaining); // 1 minute after the round started processing

      return () => clearTimeout(timer);
    } else {
      setShowReprocessButton(false);
    }
  }, [round.status, startedAtMs]);

  const handleReprocess = async () => {
    try {
      setIsReprocessing(true);
      await triggerRoundProcessing({
        duelId: duel._id,
        roundId: round._id,
      });
      setShowReprocessButton(false);
    } catch (error) {
      console.error("Failed to reprocess round:", error);
      toast.error("Couldn't reprocess the round. Please try again.");
    } finally {
      setIsReprocessing(false);
    }
  };

  // Show loading state if wizards are still being fetched
  if (wizard1 === undefined || wizard2 === undefined) {
    return (
      <Card className="mb-4 w-full bg-card/90 backdrop-blur-sm border-border/50 shadow-lg">
        <CardHeader>
          <CardTitle>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-foreground">
                {round.type === "CONCLUSION"
                  ? "Conclusion"
                  : `Round ${round.roundNumber}`}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RuneSpinner size="md" label="Loading…" />
            <span className="ml-2 text-muted-foreground">
              Loading round data...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Find the user's wizard in this duel
  const userWizard = [wizard1, wizard2].find(
    (wizard) => wizard?.owner === user?.id,
  );

  const isWaitingForMyAction = () => {
    return (
      round.status === "WAITING_FOR_SPELLS" &&
      userWizard &&
      duel.needActionsFrom.includes(userWizard._id)
    );
  };

  const getStatusBadge = () => {
    if (round.status === "COMPLETED") {
      return null; // No badge for completed rounds
    }

    if (isWaitingForMyAction()) {
      return null; // The scoreboard and composer already prompt the player
    }

    if (round.status === "WAITING_FOR_SPELLS") {
      return null; // The banner below already explains who we are waiting on
    }

    if (round.status === "PROCESSING") {
      return (
        <Badge
          variant="secondary"
          className="bg-primary/12 text-primary border-primary/30"
        >
          <Sparkles className="h-3 w-3 mr-1 animate-pulse" />
          Awaiting Narration
        </Badge>
      );
    }

    return null;
  };

  const getRoundTitle = () => {
    if (round.type === "CONCLUSION") {
      return "Conclusion";
    }
    return `Round ${round.roundNumber}`;
  };

  // Winner of this round: more points awarded, else the smaller health loss.
  // Hidden until the reveal reaches the damage step.
  const isWinner = (wizardId: string) =>
    (!animated || stage >= STAGE.IMPACT) && roundWinner(wizardId);
  const roundWinner = (wizardId: string) => {
    const [a, b] = duel.wizards;
    const compare = (rec?: Record<string, number>) =>
      rec && rec[a] !== undefined && rec[b] !== undefined
        ? Math.sign(rec[a] - rec[b])
        : 0;
    const result =
      compare(round.outcome?.pointsAwarded) ||
      compare(round.outcome?.healthChange);
    if (!result) return false;
    return wizardId === (result > 0 ? a : b);
  };

  const renderWizardThumbnail = (wizardId: unknown) => {
    const wizard = wizardId === duel.wizards[0] ? wizard1 : wizard2;

    if (!wizard?.illustration) {
      return (
        <div className="w-12 h-12 bg-linear-to-br from-primary to-gold rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-sm">
            {wizard?.name?.charAt(0) || "?"}
          </span>
        </div>
      );
    }

    return (
      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-md">
        <ConvexImage
          storageId={wizard.illustration}
          alt={wizard.name}
          width={96}
          height={96}
          className="w-full h-full object-cover"
        />
      </div>
    );
  };

  const canCollapse =
    round.status === "COMPLETED" && round.type !== "CONCLUSION" && !isLatest;
  const expanded = !canCollapse || (expandedOverride ?? false);
  const bodyId = `round-${round.roundNumber}-body`;

  const hpSummary = duel.wizards.slice(0, 2).map((id, i) => {
    const change = round.outcome?.healthChange?.[id] ?? 0;
    const name = (i === 0 ? wizard1 : wizard2)?.name ?? "Wizard";
    return change !== 0 ? `${name} ${change > 0 ? "+" : ""}${change} HP` : null;
  });
  const summary = [...hpSummary.filter(Boolean)].join(" · ");

  return (
    <Card
      id={`round-${round.roundNumber}`}
      tabIndex={-1}
      data-resolved={justResolved && !animated ? "true" : undefined}
      aria-busy={revealing || undefined}
      className="mb-4 outline-none data-[resolved=true]:duel-flash w-full scroll-mt-[calc(var(--app-navbar-h)+var(--duel-sticky-h,10rem)+1rem)] md:scroll-mt-[calc(var(--duel-sticky-h,10rem)+1rem)] border-border/50 bg-card/90 shadow-lg backdrop-blur-sm"
    >
      <CardHeader>
        <CardTitle className="min-w-0">
          {canCollapse ? (
            <h2 className="w-full min-w-0">
              <button
                type="button"
                onClick={() => setExpandedOverride(!expanded)}
                aria-expanded={expanded}
                aria-controls={bodyId}
                className="flex w-full min-w-0 items-center justify-between gap-3 rounded-md text-left focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-xl font-bold text-foreground sm:text-2xl">
                    {getRoundTitle()}
                  </span>
                  {!expanded && (
                    <span className="mt-1 block truncate font-sans text-sm font-normal normal-case tracking-normal text-muted-foreground">
                      {[summary, round.outcome?.result]
                        .filter(Boolean)
                        .join(" — ") || "Round complete"}
                    </span>
                  )}
                </span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
            </h2>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
                {getRoundTitle()}
              </h2>
              {getStatusBadge()}
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent
        id={bodyId}
        hidden={!expanded}
        className={
          expanded
            ? "animate-in fade-in slide-in-from-bottom-2 duration-500 motion-reduce:animate-none"
            : undefined
        }
      >
        {round.status === "WAITING_FOR_SPELLS" &&
          !isWaitingForMyAction() &&
          userWizard && (
            <div className="mb-4 rounded-lg border border-info/50 bg-info/10 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-medium text-foreground">
                  Your action is locked in. Waiting for the other wizard.
                </p>
              </div>
              {round.spells?.[userWizard._id]?.description && (
                <blockquote className="mt-2 border-l-2 border-info/50 pl-3 text-sm italic text-foreground/80">
                  {round.spells[userWizard._id].description}
                </blockquote>
              )}
            </div>
          )}

        {round.status === "WAITING_FOR_SPELLS" &&
          !isWaitingForMyAction() &&
          !userWizard && (
            <div className="mb-4 rounded-lg border border-info/50 bg-info/10 p-3">
              <p className="font-medium text-foreground">
                Waiting for the wizards to submit their actions.
              </p>
            </div>
          )}

        {round.status === "PROCESSING" && (
          <div className="mb-4 p-3 bg-primary/8 border border-primary/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <RuneSpinner size="sm" label="Loading" />
                <div>
                  <p className="text-primary font-medium">
                    The Arcane Arbiter is weaving the tale of this round...
                  </p>
                  <ProcessingStages
                    startedAt={processingStartedAt(round)}
                    textOnly={!!duel.textOnlyMode}
                  />
                  {round.spells && (
                    <ul className="mt-3 space-y-1 text-sm">
                      {duel.wizards.slice(0, 2).map((id, i) => {
                        const spell = round.spells?.[id];
                        if (!spell) return null;
                        return (
                          <li key={id} className="break-words">
                            <span className="font-semibold">
                              {(i === 0 ? wizard1 : wizard2)?.name ?? "Wizard"}:
                            </span>{" "}
                            <span className="italic text-foreground/80">
                              {spell.description}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {showReprocessButton && userWizard && (
                    <p className="text-primary text-sm mt-1">
                      Taking longer than expected? Try reprocessing the round.
                    </p>
                  )}
                </div>
              </div>
              {showReprocessButton && userWizard && (
                <Button
                  onClick={handleReprocess}
                  disabled={isReprocessing}
                  variant="outline"
                  size="sm"
                  className="ml-4 bg-card border-primary/50 text-primary hover:bg-primary/8"
                >
                  {isReprocessing ? (
                    <>
                      <RuneSpinner size="sm" label="Loading" />
                      Reprocessing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3 w-3 mr-2" />
                      Reprocess Round
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}

        {round.status === "COMPLETED" && conclusionLocked && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <p className="text-muted-foreground">
              The duel is over. Ready to hear how it ended?
            </p>
            <Button size="lg" onClick={reveal}>
              <Scroll className="h-4 w-4 mr-2" />
              Reveal the Conclusion
            </Button>
          </div>
        )}

        {round.status === "COMPLETED" && !conclusionLocked && (
          <div className="space-y-6">
            <div className="-mt-2 flex justify-end">
              {revealing ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={finish}
                  data-reveal-skip=""
                  className="text-muted-foreground"
                >
                  <FastForward className="mr-1 h-4 w-4" aria-hidden="true" />
                  Skip
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => startReveal(false, true)}
                  className="text-muted-foreground"
                  aria-label={`Replay ${getRoundTitle().toLowerCase()}`}
                >
                  <RotateCcw className="mr-1 h-4 w-4" aria-hidden="true" />
                  Replay round
                </Button>
              )}
            </div>
            {/* Face-off: each wizard's action, luck roll and result */}
            {round.spells && duel.wizards.length >= 2 && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {[0, 1].map((i) => {
                  const id = duel.wizards[i];
                  const wiz = i === 0 ? wizard1 : wizard2;
                  const spell = round.spells?.[id];
                  const roll = round.outcome?.luckRolls?.[id];
                  const hp = round.outcome?.healthChange?.[id];
                  const pts = round.outcome?.pointsAwarded?.[id];
                  const impact = animated && stage >= STAGE.IMPACT;
                  const hurt = (hp ?? 0) < 0;
                  return (
                    <div
                      key={id}
                      className={`min-w-0 rounded-lg border p-3 transition-colors duration-500 ${
                        isWinner(id)
                          ? "border-warning/60 bg-warning/10"
                          : "border-border/60 bg-muted/30"
                      } ${at(
                        i === 0 ? STAGE.SPELL_A : STAGE.SPELL_B,
                        i === 0 ? "reveal-slide-left" : "reveal-slide-right",
                      )} ${impact && isWinner(id) ? "reveal-winner" : ""}`}
                    >
                      <div className={impact && hurt ? "duel-hit" : ""}>
                        <div className="mb-2 flex items-center gap-3">
                          {renderWizardThumbnail(id)}
                          <span className="min-w-0 flex-1 truncate font-semibold">
                            {wiz?.name ?? "Wizard"}
                          </span>
                          {roll !== undefined && (
                            <div className={at(STAGE.DICE, "reveal-roll")}>
                              <D20Die value={roll} size="sm" />
                            </div>
                          )}
                        </div>
                        {spell && (
                          <blockquote className="break-words border-l-2 border-info/60 pl-3 text-sm italic text-foreground/90">
                            {spell.description}
                          </blockquote>
                        )}
                        {/* After the reveal, so counts don't jump ahead of it */}
                        {spell && !revealing && (
                          <SpellReactions
                            duelId={duel._id}
                            roundId={round._id}
                            wizardId={id}
                            wizardName={wiz?.name ?? "this wizard"}
                            signedIn={!!user}
                            ownSpell={!!user && wiz?.owner === user.id}
                            className={animated ? "reveal-pop" : undefined}
                          />
                        )}
                        {(hp !== undefined || pts !== undefined) && (
                          <div
                            className={`mt-3 flex flex-wrap gap-2 text-sm ${at(STAGE.IMPACT, "reveal-impact")}`}
                          >
                            {hp !== undefined && (
                              <span className="inline-flex items-center gap-1 rounded bg-background px-2 py-0.5">
                                <span className="text-muted-foreground">
                                  HP
                                </span>
                                <DeltaValue value={hp} />
                              </span>
                            )}
                            {pts !== undefined && (
                              <span className="inline-flex items-center gap-1 rounded bg-background px-2 py-0.5">
                                <span className="text-muted-foreground">
                                  Points
                                </span>
                                <DeltaValue value={pts} />
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Round Illustration */}
            {round.outcome?.illustration ? (
              <div
                id={`round-${round.roundNumber}-art`}
                className={`bg-black mb-4 max-w-2xl mx-auto rounded-lg overflow-hidden ${at(STAGE.IMAGE, "")}`}
              >
                <ImageLightbox
                  storageId={round.outcome.illustration}
                  alt={`Round ${round.roundNumber} illustration`}
                >
                  <ConvexImage
                    // Shown at its own shape, never cropped: new scenes are 3:2,
                    // but older ones are square or 16:9 with wizards at the edges.
                    className={`w-full h-auto ${at(STAGE.IMAGE, "reveal-image")}`}
                    storageId={round.outcome.illustration}
                    alt={
                      round.outcome.illustrationPrompt ||
                      `Round ${round.roundNumber} illustration`
                    }
                    width={1152}
                    height={768}
                    sizes="(min-width: 672px) 672px, 100vw"
                    quality={95}
                  />
                </ImageLightbox>
              </div>
            ) : round.illustrationStatus === "PENDING" ? (
              <div
                id={`round-${round.roundNumber}-art`}
                className={`${at(STAGE.IMAGE)} mb-4 max-w-2xl mx-auto flex items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 bg-card/50 p-6`}
              >
                <RuneSpinner size="sm" label="Generating the scene" />
                <span className="text-sm text-muted-foreground">
                  Generating the scene...
                </span>
              </div>
            ) : round.illustrationStatus === "FAILED" && isDuelist ? (
              <div
                id={`round-${round.roundNumber}-art`}
                className={`${at(STAGE.IMAGE)} mb-4 max-w-2xl mx-auto flex flex-wrap items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 bg-card/50 p-6`}
              >
                <span className="text-sm text-muted-foreground">
                  The scene for this round couldn&apos;t be generated.
                </span>
                <MediaRetryButton
                  onRetry={() => retryIllustration({ roundId: round._id })}
                />
              </div>
            ) : null}

            {/* Result teaser, always visible and not read aloud */}
            {round.outcome?.result && (
              <div
                id={`round-${round.roundNumber}-result`}
                className={`scroll-mb-6 whitespace-pre-line text-xl italic text-foreground/90 leading-relaxed ${
                  animated && stage < STAGE.RESULT ? "reveal-wait" : ""
                }`}
              >
                {animated && stage >= STAGE.RESULT && revealing ? (
                  <RevealWords text={round.outcome.result} />
                ) : (
                  round.outcome.result
                )}
              </div>
            )}

            {/* Narration audio, with the written text in a dropdown */}
            {round.outcome?.narrative && (
              <div className={at(STAGE.RESULT, "reveal-pop")}>
                <NarratedText
                  narration={round.narration}
                  playSignal={playSignal}
                  onRetry={
                    isDuelist
                      ? () => retryNarration({ roundId: round._id })
                      : undefined
                  }
                >
                  <div className="whitespace-pre-line">
                    <div className="text-foreground/80 leading-relaxed">
                      {round.outcome.narrative}
                    </div>
                  </div>
                </NarratedText>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
