"use client";

import { use } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id, Doc } from "../../../../convex/_generated/dataModel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DuelTeaserCard } from "@/components/DuelTeaserCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useState,
  useMemo,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
} from "react";
import { toast } from "sonner";
import {
  labelDuplicateNames,
  ownerLabelOf,
} from "../../../../convex/lib/wizardNames";
import { ConvexError } from "convex/values";
import {
  Swords,
  Clock,
  Sparkles,
  ScrollText,
  Star,
  Share2,
} from "lucide-react";
import { Crown } from "@/components/ui/crown-icon";

import { DuelIntroduction } from "@/components/DuelIntroduction";
import { DuelRoundCard } from "@/components/DuelRoundCard";
import { useConclusionReveal } from "@/hooks/useConclusionReveal";
import { useReplayProgress } from "@/hooks/useReplayProgress";
import { ReplayNextStep, type ReplayStep } from "@/components/ReplayNextStep";
import { stopAllNarration } from "@/components/NarratedText";
import { CastSpellModal, COMPOSER_ID } from "@/components/CastSpellModal";
import {
  WatcherDialog,
  type WatcherRejection,
} from "@/components/watcher/WatcherDialog";
import { DuelScoreboard } from "@/components/DuelScoreboard";
import { RoundTimeline } from "@/components/RoundTimeline";
import { DuelModeIndicator } from "@/components/DuelModeIndicator";
import { DuelChat } from "@/components/DuelChat";
import { EnablePushPrompt } from "@/components/notifications/EnablePushPrompt";
import { ArenaPresence } from "@/components/arena/ArenaPresence";
import { OnlookerCount } from "@/components/arena/OnlookerCount";
import { ForfeitDuelButton } from "@/components/ForfeitDuelButton";
import {
  ChallengeResponsePanel,
  CreatorWaitingPanel,
} from "@/components/WaitingDuelPanel";
import { safeConvexId } from "../../../lib/utils";
import { RuneSpinner } from "@/components/ui/rune-spinner";
import posthog from "posthog-js";

interface DuelPageClientProps {
  params: Promise<{
    id: string;
  }>;
}

/** Spinner for arena preparation. Offers a reload if it takes unusually long. */
function PreparingArena() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 90_000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="space-y-3" role="status">
      <div className="flex items-center gap-3">
        <RuneSpinner size="sm" label="Loading" />
        <p className="text-muted-foreground">
          The Arcane Arbiter is preparing the magical arena...
        </p>
      </div>
      {slow && (
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          This is taking longer than usual.
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.location.reload()}
          >
            Reload
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href="/duels">Back to duels</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

export default function DuelPageClient({ params }: DuelPageClientProps) {
  const { user, isLoaded: userLoaded } = useUser();
  const [spellDescription, setSpellDescription] = useState("");
  const [isCasting, setIsCasting] = useState(false);
  const [selectedWizard, setSelectedWizard] = useState<Id<"wizards"> | null>(
    null,
  );
  const [isJoining, setIsJoining] = useState(false);
  const [castError, setCastError] = useState<string | null>(null);
  const [composerHeight, setComposerHeight] = useState(0);
  const [composerCollapsed, setComposerCollapsed] = useState(false);
  useEffect(() => {
    // Start compact on small screens. Runs once, before the duel has loaded.
    setComposerCollapsed(window.matchMedia("(max-width: 767px)").matches);
  }, []);
  const [introOpen, setIntroOpen] = useState<boolean | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const { id } = use(params);

  // Validate the ID format first
  const duelId = safeConvexId<"duels">(id);

  const duel = useQuery(api.duels.getDuel, duelId ? { duelId } : "skip");

  // Fetch wizard data for each wizard in the duel
  const rawWizard1 = useQuery(
    api.wizards.getWizardWithOwner,
    duel?.wizards[0] ? { wizardId: duel.wizards[0] } : "skip",
  );
  const rawWizard2 = useQuery(
    api.wizards.getWizardWithOwner,
    duel?.wizards[1] ? { wizardId: duel.wizards[1] } : "skip",
  );
  // Two players can name their wizards the same; add the owner so everyone
  // can tell them apart ("Frostfire (Ken)").
  const [wizard1, wizard2] = useMemo(
    () => labelDuplicateNames([rawWizard1, rawWizard2], ownerLabelOf),
    [rawWizard1, rawWizard2],
  );

  // Hide the winner until the viewer reveals the conclusion. This applies when
  // the duel has a conclusion round, or finished recently enough that the
  // conclusion is probably still being generated.
  const { revealed: conclusionRevealed, reveal: revealConclusion } =
    useConclusionReveal(id);
  const [mountedAt] = useState(() => Date.now());
  const hasConclusion = !!duel?.rounds?.some(
    (round: Doc<"duelRounds">) => round.type === "CONCLUSION",
  );
  const justCompleted =
    !!duel?.completedAt && duel.completedAt >= mountedAt - 3 * 60 * 1000;

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const castSpell = useAction(api.watcher.castSpell);
  const [watcherRejection, setWatcherRejection] =
    useState<WatcherRejection | null>(null);
  const undoSpell = useMutation(api.duels.undoSpell);
  const joinDuel = useMutation(api.duels.joinDuel);
  const requestRematch = useMutation(api.duels.requestRematch);
  const router = useRouter();
  const [isStartingRematch, setIsStartingRematch] = useState(false);
  const rematchDuel = useQuery(
    api.duels.getDuel,
    duel?.rematchDuelId ? { duelId: duel.rematchDuelId } : "skip",
  );

  // Get user's wizards for joining
  const wizards = useQuery(api.wizards.getUserWizards, user?.id ? {} : "skip");

  // A lone wizard is selected automatically.
  const effectiveWizard =
    selectedWizard ?? (wizards?.length === 1 ? wizards[0]._id : null);

  // Memoize expensive calculations
  const userWizard = useMemo(
    () =>
      [wizard1, wizard2].find(
        (wizard: Doc<"wizards"> | null | undefined) =>
          wizard?.owner === user?.id,
      ),
    [wizard1, wizard2, user?.id],
  );

  const userWizardId = userWizard?._id;

  const currentRound = useMemo(
    () =>
      duel?.rounds?.find(
        (round: Doc<"duelRounds">) => round.roundNumber === duel.currentRound,
      ),
    [duel?.rounds, duel?.currentRound],
  );

  const hasResolvedRounds = !!duel?.rounds?.some(
    (round: Doc<"duelRounds">) =>
      round.roundNumber > 0 && round.status === "COMPLETED",
  );

  const latestRoundNumber = useMemo(
    () => Math.max(0, ...(duel?.rounds ?? []).map((r) => r.roundNumber)),
    [duel?.rounds],
  );

  const lastResolvedNumber = useMemo(() => {
    const done = (duel?.rounds ?? []).filter(
      (r) =>
        r.roundNumber > 0 &&
        r.type !== "CONCLUSION" &&
        r.status === "COMPLETED",
    );
    return done.length ? Math.max(...done.map((r) => r.roundNumber)) : 0;
  }, [duel?.rounds]);

  const isPlayerInDuel = useMemo(
    () => duel?.players.includes(user?.id || ""),
    [duel?.players, user?.id],
  );

  // ---- Replay pacing ----
  // Rounds are revealed one at a time. `revealedThrough` is the last round this
  // viewer has watched; later rounds wait behind a "continue" step. A round
  // that resolves while the viewer is caught up plays its reveal right away.
  const { stored: storedProgress, save: saveProgress } = useReplayProgress(id);
  const [revealedThrough, setRevealedThrough] = useState<number | null>(null);
  // Highest resolved round the player has moved on from. The composer for the
  // next round stays hidden until then.
  const [ackedThrough, setAckedThrough] = useState(0);
  const [animating, setAnimating] = useState<{
    round: number;
    token: number;
    impact: boolean;
    done: boolean;
  } | null>(null);
  // True once the viewer watched a round reveal here; the result then follows
  // the rounds instead of sitting above them.
  const [watchedHere, setWatchedHere] = useState(false);

  useEffect(() => {
    if (
      revealedThrough !== null ||
      storedProgress === undefined ||
      !duel ||
      !userLoaded
    ) {
      return;
    }
    const participant = !!user?.id && duel.players.includes(user.id);
    const start =
      storedProgress !== null
        ? Math.min(storedProgress, lastResolvedNumber)
        : participant || conclusionRevealed
          ? lastResolvedNumber
          : 0;
    setRevealedThrough(start);
    setAckedThrough(start);
  }, [
    revealedThrough,
    storedProgress,
    duel,
    userLoaded,
    user?.id,
    lastResolvedNumber,
    conclusionRevealed,
  ]);

  useEffect(() => {
    if (revealedThrough !== null) saveProgress(revealedThrough);
  }, [revealedThrough, saveProgress]);

  const completedRoundNumbers = useMemo(
    () =>
      (duel?.rounds ?? [])
        .filter(
          (r) =>
            r.roundNumber > 0 &&
            r.type !== "CONCLUSION" &&
            r.status === "COMPLETED",
        )
        .map((r) => r.roundNumber)
        .sort((a, b) => a - b),
    [duel?.rounds],
  );
  const conclusionRound = duel?.rounds?.find((r) => r.type === "CONCLUSION");
  const conclusionRoundNo = conclusionRound?.roundNumber;
  const caughtUp =
    revealedThrough !== null && revealedThrough >= lastResolvedNumber;
  // A regular round's reveal is still playing: hold back whatever comes next.
  const revealPending =
    !!animating &&
    !animating.done &&
    animating.round !== conclusionRound?.roundNumber;
  const conclusionPlaying =
    !!animating &&
    !animating.done &&
    animating.round === conclusionRound?.roundNumber;

  const winnerGateOpen =
    // A forfeited duel has no conclusion round to wait for.
    (conclusionRevealed ||
      !!duel?.forfeitedBy ||
      !(hasConclusion || justCompleted)) &&
    caughtUp &&
    !revealPending &&
    !conclusionPlaying;
  // Once the result has been shown, a late-arriving conclusion round must not
  // hide it again.
  const [winnerShown, setWinnerShown] = useState(false);
  useEffect(() => {
    // Only latch once the duel is over, so a live viewer stays gated.
    if (winnerGateOpen && duel?.status === "COMPLETED") setWinnerShown(true);
  }, [winnerGateOpen, duel?.status]);
  const showWinner = winnerGateOpen || winnerShown;

  // Lock the introduction's initial open state once the duel has loaded, so it
  // doesn't collapse (and shift the layout) when the first round resolves.
  // A viewer starting a replay from the top sees it open.
  useEffect(() => {
    if (duel && introOpen === null && revealedThrough !== null)
      setIntroOpen(revealedThrough === 0 || !hasResolvedRounds);
  }, [duel, introOpen, hasResolvedRounds, revealedThrough]);

  const hasUserCastSpell = useMemo(
    () =>
      currentRound?.spells && userWizardId
        ? currentRound.spells[userWizardId] !== undefined
        : false,
    [currentRound?.spells, userWizardId],
  );

  const status = duel?.status;
  const currentRoundNumber = duel?.currentRound;
  const focusComposer = useCallback(() => {
    setAckedThrough((a) => Math.max(a, lastResolvedNumber));
    setComposerCollapsed(false);
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLTextAreaElement>(`#${COMPOSER_ID} textarea`)
        ?.focus();
    });
  }, [lastResolvedNumber]);
  const scrollToRound = useCallback((roundNumber: number) => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let tries = 0;
    const attempt = () => {
      const el = document.getElementById(`round-${roundNumber}`);
      if (el) {
        el.scrollIntoView({
          behavior: reduce ? "auto" : "smooth",
          block: "start",
        });
      } else if (tries++ < 8) {
        setTimeout(attempt, 250);
      }
    };
    attempt();
  }, []);
  const jumpToCurrentRound = useCallback(() => {
    if (currentRoundNumber !== undefined) scrollToRound(currentRoundNumber);
  }, [currentRoundNumber, scrollToRound]);

  // Scroll to where the viewer is on first load. After that, only offer a pill.
  const [newRoundPill, setNewRoundPill] = useState<number | null>(null);
  const following = useRef(true);
  const scrolledOnce = useRef(false);
  useEffect(() => {
    const onScroll = () => {
      const distance =
        document.documentElement.scrollHeight -
        (window.scrollY + window.innerHeight);
      following.current = distance < window.innerHeight * 1.5;
      if (following.current) setNewRoundPill(null);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const awaitingCastAck =
    status === "IN_PROGRESS" &&
    !!isPlayerInDuel &&
    !!userWizardId &&
    ackedThrough < lastResolvedNumber &&
    currentRound?.status === "WAITING_FOR_SPELLS" &&
    !hasUserCastSpell;
  // Live: the round in play. Replaying: the last round watched (none at 0).
  const initialScrollTarget =
    revealedThrough === null
      ? null
      : !caughtUp
        ? revealedThrough > 0
          ? revealedThrough
          : null
        : status !== "IN_PROGRESS"
          ? null
          : awaitingCastAck
            ? lastResolvedNumber
            : (currentRoundNumber ?? null);
  const initialScrollRef = useRef(initialScrollTarget);
  useLayoutEffect(() => {
    initialScrollRef.current = initialScrollTarget;
  });
  useEffect(() => {
    if (revealedThrough === null) return;
    if (!scrolledOnce.current) {
      if (initialScrollRef.current === null) {
        scrolledOnce.current = true;
        return;
      }
      const go = () => {
        if (initialScrollRef.current !== null)
          scrollToRound(initialScrollRef.current);
      };
      // First load: bring the active round into view.
      let interacted = false;
      const stop = () => {
        interacted = true;
      };
      const events = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
      events.forEach((ev) =>
        window.addEventListener(ev, stop, { passive: true, once: true }),
      );
      const t = setTimeout(() => {
        scrolledOnce.current = true;
        go();
      }, 300);
      // Images and narration can shift the layout, so settle once more.
      const t2 = setTimeout(() => {
        if (!interacted) go();
      }, 2000);
      return () => {
        clearTimeout(t);
        clearTimeout(t2);
        events.forEach((ev) => window.removeEventListener(ev, stop));
      };
    }
  }, [revealedThrough, scrollToRound]);

  const revealPendingRef = useRef(false);
  const conclusionRoundNoRef = useRef<number | undefined>(undefined);
  useLayoutEffect(() => {
    conclusionRoundNoRef.current = conclusionRoundNo;
    revealPendingRef.current =
      !!animating && !animating.done && animating.round !== conclusionRoundNo;
  });
  /** Reveal every round up to `n` and play the reveal of round `n`. */
  const revealTo = useCallback(
    (n: number) => {
      stopAllNarration();
      setRevealedThrough((prev) => Math.max(prev ?? 0, n));
      setAnimating({ round: n, token: Date.now(), impact: false, done: false });
      setWatchedHere(true);
      setNewRoundPill(null);
      scrollToRound(n);
      // Older rounds collapse as the replay moves on, which can shift the
      // page; correct once if the new round ended up out of place.
      setTimeout(() => {
        const top = document
          .getElementById(`round-${n}`)
          ?.getBoundingClientRect().top;
        const sticky =
          parseFloat(
            getComputedStyle(document.documentElement).getPropertyValue(
              "--duel-sticky-h",
            ),
          ) || 160;
        if (top !== undefined && Math.abs(top - sticky) > 160) scrollToRound(n);
      }, 900);
    },
    [scrollToRound],
  );
  const onRevealImpact = useCallback((n: number) => {
    setAnimating((a) => (a && a.round === n ? { ...a, impact: true } : a));
  }, []);
  const onRevealComplete = useCallback((n: number) => {
    setAnimating((a) =>
      a && a.round === n ? { ...a, impact: true, done: true } : a,
    );
    if (n === conclusionRoundNoRef.current) {
      // The ending lands: bring the result banner in and move focus to it.
      setTimeout(() => {
        const el = document.getElementById("duel-result");
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        el.focus({ preventScroll: true });
      }, 300);
    }
  }, []);

  // When a round resolves while the viewer is caught up, play its reveal and
  // bring it into view if they're following along. Otherwise offer a pill, so
  // nobody is pulled away from what they were reading. A layout effect, so the
  // finished round never paints before its reveal starts.
  const prevResolved = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (revealedThrough === null) return;
    const prev = prevResolved.current;
    prevResolved.current = lastResolvedNumber;
    if (prev === null || lastResolvedNumber <= prev) return;
    // Still replaying earlier rounds: the new one waits its turn.
    if (revealedThrough < prev) return;
    // Mid-reveal, or scrolled away reading: don't play it where it can't be
    // seen. The "continue" step (and a pill) offer it instead.
    const distance =
      document.documentElement.scrollHeight -
      (window.scrollY + window.innerHeight);
    if (revealPendingRef.current || distance > window.innerHeight * 1.5) {
      setNewRoundPill(lastResolvedNumber);
      return;
    }
    setRevealedThrough(lastResolvedNumber);
    setAnimating({
      round: lastResolvedNumber,
      token: Date.now(),
      impact: false,
      done: false,
    });
    setWatchedHere(true);
    setTimeout(() => scrollToRound(lastResolvedNumber), 400);
  }, [lastResolvedNumber, revealedThrough, scrollToRound]);

  // Health and points as of the rounds the viewer has seen, so the scoreboard
  // doesn't give away rounds they haven't watched. The round being revealed
  // counts once its damage lands.
  const displayedThrough =
    revealedThrough === null
      ? lastResolvedNumber
      : animating && !animating.impact
        ? Math.min(revealedThrough, animating.round - 1)
        : revealedThrough;
  const { shownHitPoints, shownPoints } = useMemo(() => {
    const hp: Record<string, number> = { ...(duel?.hitPoints ?? {}) };
    const pts: Record<string, number> = { ...(duel?.points ?? {}) };
    for (const r of duel?.rounds ?? []) {
      if (
        r.type === "CONCLUSION" ||
        r.status !== "COMPLETED" ||
        r.roundNumber <= displayedThrough
      ) {
        continue;
      }
      for (const [w, change] of Object.entries(r.outcome?.healthChange ?? {}))
        hp[w] = (hp[w] ?? 100) - change;
      for (const [w, change] of Object.entries(r.outcome?.pointsAwarded ?? {}))
        pts[w] = (pts[w] ?? 0) - change;
    }
    return { shownHitPoints: hp, shownPoints: pts };
  }, [duel?.hitPoints, duel?.points, duel?.rounds, displayedThrough]);

  // Each new round starts with the composer tucked away on phones, so the
  // result the player is responding to stays readable.
  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) {
      setComposerCollapsed(true);
    }
  }, [currentRoundNumber]);

  // Tell a backgrounded tab when it needs attention (your move, round resolved).
  const myTurnNow =
    !!userWizardId &&
    status === "IN_PROGRESS" &&
    currentRound?.status === "WAITING_FOR_SPELLS" &&
    !!duel?.needActionsFrom.includes(userWizardId);
  const baseTitle = useRef<string | null>(null);
  useEffect(() => {
    if (baseTitle.current === null) baseTitle.current = document.title;
    const base = baseTitle.current;
    const apply = () => {
      if (document.visibilityState === "visible") {
        document.title = base;
      } else if (myTurnNow) {
        document.title = `Your move · ${base}`;
      } else if (lastResolvedNumber) {
        document.title = `Round ${lastResolvedNumber} resolved · ${base}`;
      } else {
        document.title = base;
      }
    };
    apply();
    document.addEventListener("visibilitychange", apply);
    return () => {
      document.removeEventListener("visibilitychange", apply);
      document.title = base;
    };
  }, [myTurnNow, lastResolvedNumber]);

  // Check for loading and error states
  const isDuelLoading = duel === undefined && duelId !== null;
  const isDuelError = duel === null || duelId === null;

  // Remember the last submitted text so Undo can bring the draft back.
  const lastSubmitted = useRef<string | null>(null);
  const wasLocked = useRef(false);
  useEffect(() => {
    lastSubmitted.current = null;
    wasLocked.current = false;
  }, [currentRoundNumber]);
  useEffect(() => {
    if (hasUserCastSpell) {
      wasLocked.current = true;
      return;
    }
    // The action was locked in and has now been undone: restore the draft.
    if (wasLocked.current && lastSubmitted.current && !isCasting) {
      wasLocked.current = false;
      setSpellDescription((cur) => cur || lastSubmitted.current || "");
      lastSubmitted.current = null;
    }
  }, [hasUserCastSpell, isCasting]);

  const handleCastSpell = async () => {
    if (!duel || !spellDescription.trim() || !userWizardId) return;

    setIsCasting(true);
    setCastError(null);
    const submitted = spellDescription.trim();
    try {
      const result = await castSpell({
        duelId: duel._id,
        wizardId: userWizardId,
        spellDescription: spellDescription.trim(),
      });
      if (!result.ok) {
        // The Watcher rejected it. Keep the draft so the player can rework it.
        setWatcherRejection(result.rejection);
        posthog.capture("spell_rejected_by_watcher", {
          category: result.rejection.category,
          round_number: duel.currentRound,
        });
        return;
      }
      posthog.capture("spell_submitted", {
        round_number: duel.currentRound,
        is_campaign_battle: duel.isCampaignBattle,
        text_only_mode: duel.textOnlyMode,
      });
      lastSubmitted.current = submitted;
      requestAnimationFrame(() =>
        document
          .getElementById(`round-${duel.currentRound}`)
          ?.focus({ preventScroll: true }),
      );
      setSpellDescription("");
      toast.success("Action locked in. Waiting for the round to resolve.");
    } catch (error) {
      console.error("Failed to cast spell:", error);
      const message =
        error instanceof ConvexError && typeof error.data === "string"
          ? error.data
          : "We couldn't submit your action. Check your connection.";
      setCastError(message);
      toast.error(message);
    } finally {
      setIsCasting(false);
    }
  };

  const handleReveal = () => {
    stopAllNarration();
    setRevealedThrough(lastResolvedNumber);
    revealConclusion();
    if (conclusionRound) {
      // Play the ending; the result banner follows it.
      setWatchedHere(true);
      setAnimating({
        round: conclusionRound.roundNumber,
        token: Date.now(),
        impact: false,
        done: false,
      });
      scrollToRound(conclusionRound.roundNumber);
      return;
    }
    setAnimating(null);
    // Bring the result into view once it has rendered.
    setTimeout(() => {
      const el = document.getElementById("duel-result");
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus({ preventScroll: true });
    }, 250);
  };

  const handleUndo = async () => {
    if (!duel || !userWizardId) return;
    try {
      await undoSpell({ duelId: duel._id, wizardId: userWizardId });
    } catch (error) {
      console.error("Failed to undo action:", error);
      toast.error("Couldn't undo your action. Please try again.");
    }
  };

  const handleJoinDuel = async () => {
    if (!user?.id || !duel || !effectiveWizard) return;

    setIsJoining(true);
    setJoinError(null);
    try {
      await joinDuel({
        duelId: duel._id,
        wizards: [effectiveWizard],
      });
      posthog.capture("duel_joined", { entry_point: "duel_page" });
      // No need to redirect, the page will update automatically
    } catch (error) {
      console.error("Failed to join duel:", error);
      toast.error("Couldn't join the duel. Please try again.");
      setJoinError(
        error instanceof ConvexError && typeof error.data === "string"
          ? error.data
          : "Couldn't join the duel. Your selection is kept. Try again.",
      );
    } finally {
      setIsJoining(false);
    }
  };

  const handleRematch = async () => {
    if (!duel) return;
    setIsStartingRematch(true);
    try {
      const rematchId = await requestRematch({ duelId: duel._id });
      posthog.capture("duel_rematch_requested", { duel_id: duel._id });
      router.push(`/duels/${rematchId}`);
    } catch (error) {
      console.error("Failed to start rematch:", error);
      toast.error("Couldn't start the rematch. Please try again.");
      setIsStartingRematch(false);
    }
  };

  // Show loading state
  if (isDuelLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RuneSpinner size="lg" hideLabel label="Loading…" className="mb-6" />
          <div className="bg-card/90 backdrop-blur-sm border border-border/50 rounded-xl px-8 py-6 shadow-xl dark:shadow-2xl max-w-sm mx-auto">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              <p className="text-foreground font-semibold">Loading duel...</p>
            </div>
            <p className="text-muted-foreground text-sm">
              Preparing the magical arena
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (isDuelError) {
    const isInvalidId = duelId === null;

    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
          <div className="max-w-2xl mx-auto">
            <Card className="border-destructive/50 bg-card/90 backdrop-blur-sm shadow-xl dark:shadow-2xl">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <Swords className="h-5 w-5" />
                  {isInvalidId ? "Invalid Duel ID" : "Duel Not Found"}
                </CardTitle>
                <CardDescription>
                  {isInvalidId
                    ? "The duel ID in the URL is not valid."
                    : "We couldn't load the duel you're looking for."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">This could happen if:</p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-4">
                  {isInvalidId ? (
                    <>
                      <li>The URL was typed incorrectly</li>
                      <li>The link you followed is broken or incomplete</li>
                      <li>The duel ID format is invalid</li>
                    </>
                  ) : (
                    <>
                      <li>The duel doesn&apos;t exist or has been deleted</li>
                      <li>You don&apos;t have permission to view this duel</li>
                      <li>There&apos;s a temporary connection issue</li>
                    </>
                  )}
                </ul>
                <div className="flex gap-3 pt-4">
                  <Button asChild variant="default">
                    <Link href="/duels">Browse Duels</Link>
                  </Button>
                  {!isInvalidId && (
                    <Button
                      variant="outline"
                      className="border-border/50 hover:bg-accent/50 dark:hover:bg-accent/30"
                      onClick={() => window.location.reload()}
                    >
                      Try Again
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // At this point, duel is guaranteed to be defined (not null or undefined)
  if (!duel) {
    throw new Error("Duel should be defined at this point");
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "WAITING_FOR_PLAYERS":
        return (
          <Badge
            variant="secondary"
            className="bg-warning/80 text-warning-foreground border-warning/50 flex items-center gap-1"
          >
            <Clock className="h-3 w-3" />
            Waiting for Players
          </Badge>
        );
      case "IN_PROGRESS":
        return (
          <Badge
            variant="default"
            className="bg-success/80 text-success-foreground border-success/50 flex items-center gap-1"
          >
            <Sparkles className="h-3 w-3" />
            In Progress
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge
            variant="outline"
            className="bg-info/80 text-info-foreground border-info/50 flex items-center gap-1"
          >
            <Star className="h-3 w-3" />
            Completed
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge
            variant="destructive"
            className="bg-destructive/80 text-destructive-foreground border-destructive/50 flex items-center gap-1"
          >
            <Swords className="h-3 w-3" />
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="bg-muted/80 text-foreground border-border/50"
          >
            {status}
          </Badge>
        );
    }
  };

  const isDraw = !!duel.winners && duel.winners.length !== 1;
  const userDefeated =
    !!userWizardId &&
    !!duel.winners &&
    duel.winners.length === 1 &&
    !duel.winners.includes(userWizardId);
  const timelineEl = (
    <RoundTimeline
      rounds={duel.rounds ?? []}
      wizardIds={duel.wizards}
      currentRound={duel.currentRound}
      wizardNames={[wizard1?.name ?? "Wizard 1", wizard2?.name ?? "Wizard 2"]}
      totalRounds={
        typeof duel.numberOfRounds === "number"
          ? duel.numberOfRounds
          : undefined
      }
      revealedThrough={revealedThrough === null ? undefined : displayedThrough}
      onRevealTo={revealTo}
    />
  );

  const winnerWizard =
    duel.winners?.length === 1
      ? duel.winners[0] === duel.wizards[0]
        ? wizard1
        : wizard2
      : undefined;
  const winnerIsAI = !!winnerWizard?.isAIPowered;

  // Winner announcement for completed duels.
  const resultCard = duel.status === "COMPLETED" &&
    showWinner &&
    duel.winners !== undefined && (
      <Card
        id="duel-result"
        tabIndex={-1}
        aria-live="polite"
        className={`mb-8 outline-none animate-in fade-in zoom-in-95 duration-500 motion-reduce:animate-none ${
          userDefeated
            ? "border-2 border-destructive/40 bg-card"
            : isDraw
              ? "border-2 border-border bg-card"
              : duel.isCampaignBattle
                ? "bg-arcane-soft border-2 border-primary/50"
                : "bg-linear-to-r from-warning/20 to-gold/10 border-2 border-warning/40"
        } shadow-lg dark:shadow-xl`}
      >
        <CardHeader className="duel-reveal">
          <CardTitle
            className={`flex items-center justify-center gap-3 text-2xl ${
              userDefeated
                ? "text-destructive"
                : isDraw
                  ? "text-foreground"
                  : duel.isCampaignBattle
                    ? "text-primary"
                    : "text-warning"
            }`}
          >
            {userDefeated || isDraw ? (
              <Swords
                className={`h-8 w-8 ${userDefeated ? "text-destructive" : "text-muted-foreground"}`}
              />
            ) : duel.isCampaignBattle ? (
              <Sparkles className="h-8 w-8 text-primary" />
            ) : (
              <Crown className="h-8 w-8 text-warning" />
            )}
            {duel.winners.length !== 1
              ? "Draw!"
              : userWizardId && !duel.winners.includes(userWizardId)
                ? "Defeated"
                : userWizardId
                  ? duel.isCampaignBattle
                    ? "Campaign Victory!"
                    : "You won!"
                  : duel.isCampaignBattle
                    ? winnerIsAI
                      ? "The AI prevails"
                      : "Campaign Victory!"
                    : "Victory!"}
            {userDefeated || isDraw ? (
              <Swords
                className={`h-8 w-8 ${userDefeated ? "text-destructive" : "text-muted-foreground"}`}
              />
            ) : duel.isCampaignBattle ? (
              <Sparkles className="h-8 w-8 text-primary" />
            ) : (
              <Crown className="h-8 w-8 text-warning" />
            )}
          </CardTitle>
          <CardDescription
            className={`text-center text-lg font-medium ${
              userDefeated || isDraw
                ? "text-foreground"
                : duel.isCampaignBattle
                  ? "text-primary"
                  : "text-warning"
            }`}
          >
            {duel.winners.length === 1 ? (
              <>
                {duel.wizards[0] === duel.winners[0]
                  ? wizard1?.name
                  : wizard2?.name}{" "}
                {duel.isCampaignBattle
                  ? userDefeated
                    ? "wins this time. Try again!"
                    : winnerIsAI
                      ? "holds the line for the campaign!"
                      : "defeats the AI opponent!"
                  : duel.forfeitedBy
                    ? "wins by forfeit!"
                    : "emerges victorious!"}
              </>
            ) : (
              "The duel ends in an honorable draw!"
            )}
          </CardDescription>
          {duel.winners.length === 1 && (
            <p className="text-center text-sm text-foreground/80">
              {duel.forfeitedBy ? "Forfeited after" : "After"}{" "}
              {lastResolvedNumber} round
              {lastResolvedNumber === 1 ? "" : "s"}. Final standing:{" "}
              {duel.wizards
                .slice(0, 2)
                .map(
                  (id, i) =>
                    `${(i === 0 ? wizard1 : wizard2)?.name ?? "Wizard"} ${Math.max(0, duel.hitPoints[id] ?? 0)} HP, ${duel.points[id] ?? 0} pts`,
                )
                .join(" · ")}
            </p>
          )}
          {duel.isCampaignBattle && isPlayerInDuel && (
            <div className="flex justify-center pt-2">
              <Button asChild size="lg">
                <Link href="/campaign">
                  {userDefeated ? "Try again" : "Continue the campaign"}
                </Link>
              </Button>
            </div>
          )}
        </CardHeader>
      </Card>
    );

  const replaying =
    revealedThrough !== null &&
    (!caughtUp || (duel.status === "COMPLETED" && !showWinner));

  // The deliberate next step under the last round shown.
  const nextUnwatched = completedRoundNumbers.find(
    (n) => n > (revealedThrough ?? Infinity),
  );
  let nextStep: ReplayStep | null = null;
  if (
    revealedThrough !== null &&
    !revealPending &&
    (duel.status === "IN_PROGRESS" || duel.status === "COMPLETED")
  ) {
    if (nextUnwatched !== undefined) {
      nextStep =
        revealedThrough === 0
          ? { kind: "begin" }
          : { kind: "next", round: nextUnwatched };
    } else if (duel.status === "COMPLETED" && !conclusionRevealed) {
      if (hasConclusion) nextStep = { kind: "conclusion" };
      else if (justCompleted) nextStep = { kind: "writing-conclusion" };
    } else if (awaitingCastAck && userWizard) {
      nextStep = {
        kind: "cast",
        round: duel.currentRound,
        wizardName: userWizard.name,
      };
    }
  }
  const handleNextStep = () => {
    if (!nextStep) return;
    if (nextStep.kind === "begin" || nextStep.kind === "next") {
      if (nextUnwatched !== undefined) revealTo(nextUnwatched);
    } else if (nextStep.kind === "conclusion" && conclusionRound) {
      stopAllNarration();
      revealConclusion();
      setWatchedHere(true);
      setAnimating({
        round: conclusionRound.roundNumber,
        token: Date.now(),
        impact: false,
        done: false,
      });
      scrollToRound(conclusionRound.roundNumber);
    } else if (nextStep.kind === "cast") {
      focusComposer();
    }
  };
  const skipToLatest =
    nextStep &&
    (nextStep.kind === "begin" || nextStep.kind === "next") &&
    lastResolvedNumber > (nextUnwatched ?? 0)
      ? () => revealTo(lastResolvedNumber)
      : undefined;

  const visibleRounds = (duel.rounds ?? [])
    .filter((round: Doc<"duelRounds">) => round.roundNumber > 0)
    .filter((round: Doc<"duelRounds">) => {
      if (revealedThrough === null) return false;
      if (round.type === "CONCLUSION") {
        return caughtUp && conclusionRevealed && !revealPending;
      }
      if (round.status === "COMPLETED") {
        return round.roundNumber <= revealedThrough;
      }
      // The round in play: only once the viewer is caught up and, for a
      // player, has chosen to move on to it.
      return (
        duel.status === "IN_PROGRESS" &&
        caughtUp &&
        !revealPending &&
        !awaitingCastAck
      );
    });

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-4 sm:px-6 sm:py-12">
        <div
          className="max-w-4xl mx-auto"
          style={{ paddingBottom: composerHeight ? composerHeight + 24 : 0 }}
        >
          {duel.status !== "CANCELLED" && (
            <ArenaPresence duelId={duel._id} isPlayer={!!isPlayerInDuel} />
          )}
          <div className="mb-8">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h1 className="text-3xl font-bold text-gold-gradient font-display">
                {wizard1 && wizard2
                  ? `${wizard1.name} vs ${wizard2.name}`
                  : typeof duel.numberOfRounds === "number"
                    ? `${duel.numberOfRounds} Round Duel`
                    : "Duel to the Death"}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                {duel.isCampaignBattle && (
                  <Badge
                    variant="outline"
                    className="bg-primary/80 text-primary-foreground border-primary/50 flex items-center gap-1"
                  >
                    <Sparkles className="h-3 w-3" />
                    Campaign Battle
                  </Badge>
                )}
                <DuelModeIndicator
                  textOnlyMode={duel.textOnlyMode}
                  textOnlyReason={duel.textOnlyReason}
                />
                {duel.status !== "CANCELLED" && (
                  <OnlookerCount
                    duelId={duel._id}
                    viewerId={user?.id}
                    players={duel.players}
                    showOpponent={
                      !!isPlayerInDuel &&
                      !duel.isCampaignBattle &&
                      duel.status === "IN_PROGRESS"
                    }
                  />
                )}
                {duel.status !== "IN_PROGRESS" &&
                  duel.status !== "WAITING_FOR_PLAYERS" &&
                  duel.status !== "CANCELLED" &&
                  getStatusBadge(duel.status)}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="hidden text-sm text-muted-foreground sm:block">
                Started{" "}
                {new Date(duel.createdAt).toLocaleString([], {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
          </div>

          {duel.status === "COMPLETED" && <DuelTeaserCard duelId={duel._id} />}

          {newRoundPill !== null && !revealPending && (
            <div
              className="pointer-events-none fixed inset-x-0 z-[35] flex justify-center md:left-64"
              style={{
                bottom: `calc(var(--app-bottomnav-h, 0px) + ${composerHeight + 16}px)`,
              }}
            >
              <Button
                size="sm"
                className="pointer-events-auto rounded-full shadow-lg"
                onClick={() => {
                  const target = newRoundPill;
                  setNewRoundPill(null);
                  if (target > (revealedThrough ?? 0) && !revealPending) {
                    revealTo(target);
                  } else {
                    scrollToRound(target);
                  }
                }}
              >
                Round {newRoundPill} resolved · Watch it
              </Button>
            </div>
          )}

          {/* Sticky scoreboard: round, whose move it is, HP and points */}
          {duel.wizards.length >= 1 &&
            (wizard1 || wizard2) &&
            revealedThrough !== null && (
              <>
                <DuelScoreboard
                  wizards={[wizard1, wizard2]}
                  wizardIds={duel.wizards}
                  hitPoints={shownHitPoints}
                  points={shownPoints}
                  replay={
                    replaying ? { round: revealedThrough ?? 0 } : undefined
                  }
                  userWizardId={userWizardId}
                  winnerIds={showWinner ? duel.winners : undefined}
                  duelStatus={duel.status}
                  currentRound={duel.currentRound}
                  numberOfRounds={duel.numberOfRounds}
                  roundStatus={currentRound?.status}
                  needActionsFrom={duel.needActionsFrom}
                  onJumpToComposer={focusComposer}
                  onUndo={handleUndo}
                  resolvedRound={replaying ? undefined : lastResolvedNumber}
                  waitingSince={
                    userWizardId
                      ? currentRound?.spells?.[userWizardId]?.timestamp
                      : undefined
                  }
                  viewerKnown={
                    userLoaded &&
                    (!duel.wizards[0] || wizard1 !== undefined) &&
                    (!duel.wizards[1] || wizard2 !== undefined)
                  }
                  onJumpToCurrentRound={jumpToCurrentRound}
                  hideOutcome={!showWinner && duel.status === "COMPLETED"}
                  onReveal={
                    !showWinner && duel.status === "COMPLETED"
                      ? handleReveal
                      : undefined
                  }
                >
                  {timelineEl}
                </DuelScoreboard>
                <div className="mb-4 sm:hidden">{timelineEl}</div>
              </>
            )}

          {duel.status === "COMPLETED" && !showWinner && !watchedHere && (
            <Card className="mb-8 border-2 border-primary/50 bg-card/95 text-center shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-center gap-2 text-2xl">
                  <Sparkles
                    className="h-6 w-6 text-primary"
                    aria-hidden="true"
                  />
                  The duel is over
                </CardTitle>
                <CardDescription>
                  {caughtUp
                    ? "You've seen every round. Find out how it ended."
                    : revealedThrough === 0
                      ? "Relive it round by round, as it happened."
                      : `You're on round ${revealedThrough}. Pick up where you left off, or skip to the end.`}
                </CardDescription>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  {caughtUp ? (
                    <Button size="lg" onClick={handleReveal}>
                      Reveal the result
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="lg"
                        onClick={() =>
                          revealedThrough === 0 && nextUnwatched !== undefined
                            ? revealTo(nextUnwatched)
                            : document
                                .getElementById("replay-next")
                                ?.scrollIntoView({
                                  behavior: "smooth",
                                  block: "center",
                                })
                        }
                      >
                        {revealedThrough === 0
                          ? "Watch the duel"
                          : "Keep watching"}
                      </Button>
                      <Button size="lg" variant="ghost" onClick={handleReveal}>
                        Skip to the result
                      </Button>
                    </>
                  )}
                </div>
              </CardHeader>
            </Card>
          )}

          {/* Text-Only Mode Explanation */}
          {duel.textOnlyMode && (
            <div className="mb-8">
              <DuelModeIndicator
                textOnlyMode={duel.textOnlyMode}
                textOnlyReason={duel.textOnlyReason}
                showDetails={true}
              />
            </div>
          )}

          {!watchedHere && resultCard}

          {duel.status === "CANCELLED" && (
            <Card className="mb-8 border-destructive/40 bg-card/90 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Swords className="h-5 w-5 text-destructive" />
                  This duel was cancelled
                </CardTitle>
                <CardDescription>
                  No result will be recorded. You can start a new duel or look
                  for another.
                </CardDescription>
                <div className="flex gap-3 pt-2">
                  <Button asChild>
                    <Link href="/duels/create">Start a new duel</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/duels">Browse duels</Link>
                  </Button>
                </div>
              </CardHeader>
            </Card>
          )}

          {duel.status === "WAITING_FOR_PLAYERS" && (
            <Card className="mb-8 bg-card/90 backdrop-blur-sm border-border/50 shadow-lg dark:shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Clock className="h-5 w-5 text-warning animate-pulse" />
                  {duel.players.length >= 2
                    ? "Preparing Duel"
                    : duel.challengedUserId
                      ? "Challenge Sent"
                      : isPlayerInDuel
                        ? "Invite Your Opponent"
                        : "Waiting for Players"}
                </CardTitle>
                <CardDescription>
                  {duel.players.length >= 2
                    ? "Generating magical introduction and preparing the arena..."
                    : duel.challengedUserId
                      ? "Waiting for the challenged wizard to answer"
                      : "This duel needs one more player to begin"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!isPlayerInDuel &&
                duel.players.length < 2 &&
                duel.challengedUserId ? (
                  <ChallengeResponsePanel
                    duel={duel}
                    userId={user?.id}
                    challengerWizardName={wizard1?.name}
                  />
                ) : !isPlayerInDuel && duel.players.length < 2 ? (
                  <div className="space-y-4">
                    {userLoaded && !user ? (
                      <div>
                        <p className="text-muted-foreground mb-4">
                          Sign in to join this duel.
                        </p>
                        <Button asChild>
                          <Link
                            href={`/sign-in?redirect_url=${encodeURIComponent(`/duels/${duel._id}`)}`}
                          >
                            Sign in
                          </Link>
                        </Button>
                      </div>
                    ) : !userLoaded || wizards === undefined ? (
                      <div className="flex items-center gap-3">
                        <RuneSpinner size="sm" label="Loading" />
                        <p className="text-muted-foreground">
                          Loading your wizards...
                        </p>
                      </div>
                    ) : wizards.length === 0 ? (
                      <div>
                        <p className="text-muted-foreground mb-4">
                          You need a wizard to join this duel.
                        </p>
                        <Button asChild>
                          <Link href="/wizards/create">Create Wizard</Link>
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-muted-foreground mb-4">
                          Select a wizard to join this duel:
                        </p>
                        <div
                          role="radiogroup"
                          aria-label="Your wizards"
                          className="space-y-2 mb-4"
                        >
                          {wizards.map((wizard: Doc<"wizards">) => (
                            <button
                              type="button"
                              role="radio"
                              aria-checked={effectiveWizard === wizard._id}
                              tabIndex={
                                effectiveWizard === wizard._id ||
                                (!effectiveWizard &&
                                  wizard._id === wizards[0]._id)
                                  ? 0
                                  : -1
                              }
                              onKeyDown={(e) => {
                                const keys = [
                                  "ArrowDown",
                                  "ArrowRight",
                                  "ArrowUp",
                                  "ArrowLeft",
                                ];
                                if (!keys.includes(e.key)) return;
                                e.preventDefault();
                                const step =
                                  e.key === "ArrowDown" ||
                                  e.key === "ArrowRight"
                                    ? 1
                                    : -1;
                                const idx = wizards.findIndex(
                                  (w: Doc<"wizards">) => w._id === wizard._id,
                                );
                                const next =
                                  wizards[
                                    (idx + step + wizards.length) %
                                      wizards.length
                                  ];
                                setSelectedWizard(next._id);
                                e.currentTarget.parentElement
                                  ?.querySelectorAll<HTMLElement>(
                                    '[role="radio"]',
                                  )
                                  [wizards.indexOf(next)]?.focus();
                              }}
                              key={wizard._id}
                              className={`w-full text-left p-3 border rounded-lg cursor-pointer transition-all focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none ${
                                effectiveWizard === wizard._id
                                  ? "border-primary bg-primary/8"
                                  : "border-border hover:border-muted-foreground"
                              }`}
                              onClick={() => setSelectedWizard(wizard._id)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="block font-medium">
                                    {wizard.name}
                                  </span>
                                  <span className="block text-sm text-muted-foreground truncate">
                                    {wizard.description}
                                  </span>
                                </div>
                                {effectiveWizard === wizard._id && (
                                  <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs">
                                      ✓
                                    </span>
                                  </div>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                        {joinError && (
                          <p
                            role="alert"
                            className="mb-3 text-sm text-destructive"
                          >
                            {joinError}
                          </p>
                        )}
                        <Button
                          onClick={handleJoinDuel}
                          disabled={!effectiveWizard || isJoining}
                          className="w-full"
                        >
                          {isJoining ? "Joining..." : "Join Duel"}
                        </Button>
                        {!effectiveWizard && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            Pick a wizard above to join.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : duel.players.length < 2 ? (
                  <CreatorWaitingPanel
                    duel={duel}
                    creatorWizardName={wizard1?.name}
                  />
                ) : (
                  <PreparingArena />
                )}
              </CardContent>
            </Card>
          )}

          {isPlayerInDuel &&
            !duel.isCampaignBattle &&
            (duel.status === "WAITING_FOR_PLAYERS" ||
              duel.status === "IN_PROGRESS") && <EnablePushPrompt />}

          {isPlayerInDuel && userWizardId && duel.status === "IN_PROGRESS" && (
            <ForfeitDuelButton
              duelId={duel._id}
              isCampaignBattle={duel.isCampaignBattle}
              opponentName={
                [wizard1, wizard2].find((w) => w && w._id !== userWizardId)
                  ?.name
              }
            />
          )}

          <WatcherDialog
            rejection={watcherRejection}
            onClose={() => setWatcherRejection(null)}
            retryLabel="Rework my spell"
          />

          {/* Duelist chat and crowd reactions, revealed in step with replays */}
          {!duel.isCampaignBattle &&
            duel.players.length >= 2 &&
            duel.status !== "CANCELLED" && (
              <DuelChat
                duel={duel}
                wizardNames={Object.fromEntries(
                  [wizard1, wizard2]
                    .filter((w): w is NonNullable<typeof w> => !!w)
                    .map((w) => [w._id, w.name]),
                )}
                userId={user?.id}
                userLoaded={userLoaded}
                watchedThrough={
                  revealedThrough === null ? null : displayedThrough
                }
                resultShown={showWinner}
                live={
                  caughtUp &&
                  !revealPending &&
                  (duel.status !== "COMPLETED" || showWinner)
                }
                bottomOffset={composerHeight}
              />
            )}

          {/* Cast Spell Modal */}
          {duel.status === "IN_PROGRESS" &&
            currentRound?.status === "WAITING_FOR_SPELLS" &&
            caughtUp &&
            !revealPending &&
            !awaitingCastAck &&
            isPlayerInDuel &&
            userWizard &&
            userWizardId &&
            !hasUserCastSpell && (
              <CastSpellModal
                duelId={duel._id}
                currentRound={duel.currentRound}
                wizardName={userWizard.name}
                spellDescription={spellDescription}
                onSpellDescriptionChange={(v) => {
                  setSpellDescription(v);
                  if (castError) setCastError(null);
                }}
                onCastSpell={handleCastSpell}
                isCasting={isCasting}
                error={castError}
                collapsed={composerCollapsed}
                onCollapsedChange={setComposerCollapsed}
                onHeightChange={setComposerHeight}
              />
            )}

          {/* Show introduction for in-progress or completed duels */}
          {(duel.status === "IN_PROGRESS" || duel.status === "COMPLETED") && (
            <details
              className="mb-6 rounded-xl border border-border/50 bg-card/90 shadow-lg backdrop-blur-sm"
              open={introOpen ?? !hasResolvedRounds}
              onToggle={(e) => {
                if (e.currentTarget.open !== (introOpen ?? !hasResolvedRounds))
                  setIntroOpen(e.currentTarget.open);
              }}
            >
              <summary className="flex cursor-pointer items-center gap-2 p-4 font-semibold text-foreground focus-visible:ring-2 focus-visible:ring-primary/40 rounded-xl">
                <ScrollText className="h-5 w-5 text-info" aria-hidden="true" />
                Arena Introduction
                <span className="ml-1 hidden text-sm font-normal text-muted-foreground sm:inline">
                  The Arcane Arbiter introduces the combatants
                </span>
              </summary>
              <div className="px-4 pb-4">
                <DuelIntroduction duelId={duel._id} />
              </div>
            </details>
          )}

          {/* Individual Round Cards */}
          {visibleRounds.length > 0 && (
            <div className="space-y-6">
              {visibleRounds.map((round: Doc<"duelRounds">) => (
                <DuelRoundCard
                  key={round._id}
                  round={round}
                  duel={duel}
                  wizard1={wizard1}
                  wizard2={wizard2}
                  isLatest={
                    round.roundNumber === latestRoundNumber ||
                    round.roundNumber >=
                      (revealedThrough ?? lastResolvedNumber) - 1
                  }
                  revealToken={
                    animating?.round === round.roundNumber
                      ? animating.token
                      : undefined
                  }
                  onRevealImpact={onRevealImpact}
                  onRevealComplete={onRevealComplete}
                />
              ))}
            </div>
          )}

          {nextStep && (
            <div id="replay-next" className="scroll-mb-8">
              <ReplayNextStep
                step={nextStep}
                onContinue={handleNextStep}
                onSkipToLatest={skipToLatest}
                skipLabel={
                  duel.status === "COMPLETED"
                    ? "Skip to the final round"
                    : "Skip to the live round"
                }
                watched={displayedThrough}
                total={
                  typeof duel.numberOfRounds === "number"
                    ? duel.numberOfRounds
                    : undefined
                }
              />
            </div>
          )}

          {watchedHere && resultCard}

          {duel.status === "COMPLETED" && showWinner && !isPlayerInDuel && (
            <section
              aria-label="What next"
              className="mt-8 flex flex-col items-center gap-3 rounded-xl border border-border/50 bg-card/90 px-4 py-6 text-center shadow-lg"
            >
              <h3 className="font-display text-xl font-bold text-foreground">
                Think you could do better?
              </h3>
              <p className="max-w-sm text-sm text-muted-foreground">
                Create a wizard and step into the arena, or pass this duel on.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button asChild size="lg">
                  <Link href="/wizards/create">
                    <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
                    Create your wizard
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={async () => {
                    const url = window.location.href;
                    try {
                      if (navigator.share) {
                        await navigator.share({ url, title: document.title });
                      } else {
                        await navigator.clipboard.writeText(url);
                        toast.success("Duel link copied");
                      }
                    } catch {
                      // Share sheet dismissed or clipboard blocked.
                    }
                  }}
                >
                  <Share2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  Share this duel
                </Button>
                <Button asChild size="lg" variant="ghost">
                  <Link href="/duels/watch">Watch another duel</Link>
                </Button>
              </div>
            </section>
          )}

          {/* Rematch, shown once the result has been revealed */}
          {duel.status === "COMPLETED" &&
            showWinner &&
            !duel.isCampaignBattle &&
            !!user?.id &&
            duel.players.includes(user.id) && (
              <div className="mt-8 flex flex-col items-center gap-2 text-center">
                <Button
                  size="lg"
                  onClick={handleRematch}
                  disabled={isStartingRematch}
                >
                  {isStartingRematch ? (
                    <RuneSpinner size="sm" label="Starting rematch" />
                  ) : (
                    <Swords className="h-4 w-4 mr-2" />
                  )}
                  {!duel.rematchDuelId
                    ? "Rematch"
                    : rematchDuel?.players.includes(user.id)
                      ? "Go to Rematch"
                      : "Join Rematch"}
                </Button>
                <p className="text-sm text-muted-foreground">
                  {duel.rematchDuelId
                    ? "A rematch is ready."
                    : "Start a new duel with the same wizards and settings."}
                </p>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
