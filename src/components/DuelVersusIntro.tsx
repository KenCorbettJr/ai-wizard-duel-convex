"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import { useQuery } from "convex/react";
import { transformConvexImageUrl } from "@/lib/convex-image-proxy";
import { cn } from "@/lib/utils";

type VersusWizard = {
  name: string;
  illustration?: string;
  illustrationURL?: string;
  wins?: number;
  losses?: number;
};

interface DuelVersusIntroProps {
  /** Undefined while still loading; the backdrop shows meanwhile. */
  left?: VersusWizard;
  right?: VersusWizard;
  /** e.g. "3 rounds" or "To the death". */
  subtitle?: string;
  onDone: () => void;
}

/** How long the splash holds before leaving on its own. */
const HOLD_MS = 2600;
const EXIT_MS = 450;
/** Start even if a portrait is slow, rather than keep the player waiting. */
const IMAGE_WAIT_MS = 1500;
/** Give up if the wizards themselves never load. */
const WIZARD_WAIT_MS = 4000;

/**
 * A short "versus" splash for the moment a duel begins: the two wizards
 * slide in from either side and meet at a gold VS. Tap, click or Esc skips it.
 */
export function DuelVersusIntro({
  left,
  right,
  subtitle,
  onDone,
}: DuelVersusIntroProps) {
  const [loaded, setLoaded] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setLeaving(true);
    setTimeout(onDone, EXIT_MS);
  }, [onDone]);

  const ready = !!left && !!right;
  const portraits = [left, right].filter(
    (w) => w?.illustration || w?.illustrationURL,
  ).length;

  // The backdrop covers the page straight away. The wizards wait for both
  // portraits (or a short timeout) so nothing slides in blank.
  const playing = ready && (timedOut || loaded >= portraits);
  useEffect(() => {
    if (!ready) {
      const t = setTimeout(finish, WIZARD_WAIT_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setTimedOut(true), IMAGE_WAIT_MS);
    return () => clearTimeout(t);
  }, [ready, finish]);

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(finish, HOLD_MS);
    return () => clearTimeout(t);
  }, [playing, finish]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finish]);

  const onLoad = useCallback(() => setLoaded((n) => n + 1), []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ready ? `${left.name} versus ${right.name}` : "Duel starting"}
      onClick={finish}
      className={cn(
        "versus fixed inset-0 z-[60] flex cursor-pointer flex-col items-center justify-center overflow-hidden px-4",
        playing && "versus-play",
        leaving && "versus-leave",
      )}
    >
      <div aria-hidden className="versus-backdrop absolute inset-0" />
      <div aria-hidden className="versus-flash absolute inset-0" />

      {ready && (
        <div className="relative flex w-full max-w-3xl items-center justify-center gap-3 sm:gap-8">
          <Fighter wizard={left} side="left" onLoad={onLoad} />

          <div className="relative z-10 flex shrink-0 items-center justify-center">
            <span
              aria-hidden
              className="versus-ring absolute size-24 rounded-full sm:size-36"
            />
            <span className="versus-vs font-display text-4xl font-black tracking-wider sm:text-7xl">
              VS
            </span>
          </div>

          <Fighter wizard={right} side="right" onLoad={onLoad} />
        </div>
      )}

      {subtitle && (
        <p className="versus-subtitle relative mt-8 font-display text-sm tracking-[0.3em] text-white/80 uppercase sm:text-base">
          {subtitle}
        </p>
      )}

      <p className="versus-subtitle relative mt-6 text-xs text-white/50">
        Tap to skip
      </p>
    </div>
  );
}

function Fighter({
  wizard,
  side,
  onLoad,
}: {
  wizard: VersusWizard;
  side: "left" | "right";
  onLoad: () => void;
}) {
  const convexUrl = transformConvexImageUrl(
    useQuery(
      api.wizards.getIllustrationUrl,
      wizard.illustration ? { storageId: wizard.illustration } : "skip",
    ),
  );
  const url =
    convexUrl ?? (!wizard.illustration ? wizard.illustrationURL : undefined);
  const record =
    wizard.wins !== undefined || wizard.losses !== undefined
      ? `${wizard.wins ?? 0}W · ${wizard.losses ?? 0}L`
      : null;

  return (
    <div className={cn("versus-fighter min-w-0 flex-1", `versus-${side}`)}>
      <div className="versus-card relative mx-auto aspect-[3/4] w-full max-w-[260px] overflow-hidden rounded-2xl border-2 border-gold/70 bg-arcane">
        {url ? (
          <Image
            src={url}
            alt=""
            fill
            sizes="(min-width: 640px) 260px, 40vw"
            className="object-cover object-top"
            onLoad={onLoad}
            onError={onLoad}
            priority
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-display text-6xl font-bold text-white/90">
            {wizard.name.charAt(0)}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/85 via-black/40 to-transparent" />
        <div className="versus-name absolute inset-x-0 bottom-0 p-2.5 text-center sm:p-4">
          <div className="truncate font-display text-sm font-bold text-white sm:text-xl">
            {wizard.name}
          </div>
          {record && (
            <div className="mt-0.5 text-[10px] tracking-wider text-white/70 sm:text-xs">
              {record}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
