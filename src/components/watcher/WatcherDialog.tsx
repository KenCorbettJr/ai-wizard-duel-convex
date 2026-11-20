"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, Hourglass } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { COOLDOWN_STRIKES } from "../../../convex/lib/watcherRules";
import type { WatcherRejectionResult } from "../../../convex/watcher";

export const WATCHER_PORTRAIT = "/images/watcher/watcher.jpg";
export const WATCHER_AVATAR = "/images/watcher/watcher-avatar.jpg";

export type WatcherRejection = WatcherRejectionResult;

interface WatcherDialogProps {
  rejection: WatcherRejection | null;
  onClose: () => void;
  /** Button label for trying again, e.g. "Recast spell". */
  retryLabel?: string;
}

function useCountdown(until?: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!until) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [until]);
  if (!until) return null;
  const ms = Math.max(0, until - now);
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return {
    done: ms === 0,
    label: `${minutes}:${String(seconds).padStart(2, "0")}`,
  };
}

/** One eye per strike, so players can see silence approaching. */
function StrikeEyes({ count }: { count: number }) {
  const shown = Math.min(count, COOLDOWN_STRIKES);
  return (
    <div
      className="flex items-center gap-1.5"
      role="img"
      aria-label={`${shown} of ${COOLDOWN_STRIKES} warnings`}
    >
      {Array.from({ length: COOLDOWN_STRIKES }, (_, i) => (
        <Eye
          key={i}
          aria-hidden="true"
          className={
            i < shown
              ? "size-4 text-violet-300 drop-shadow-[0_0_6px_rgb(196_181_253/0.8)]"
              : "size-4 text-white/20"
          }
        />
      ))}
    </div>
  );
}

/**
 * The Watcher appears when something a player wrote breaks the rules. The
 * attempt is rejected, nothing is spent, and the player can try again.
 */
export function WatcherDialog({
  rejection,
  onClose,
  retryLabel = "Try again",
}: WatcherDialogProps) {
  const countdown = useCountdown(rejection?.cooldownUntil);
  const isCooldown = rejection?.category === "cooldown";
  const isUnavailable = rejection?.category === "unavailable";
  const showStrikes =
    !!rejection && !isUnavailable && rejection.strikeCount > 0;

  return (
    <Dialog open={!!rejection} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md overflow-hidden border-violet-400/30 bg-[#0d0f1a] p-0 text-slate-100 shadow-violet-900/40 [&>button]:text-slate-300">
        <div className="relative h-56 w-full sm:h-64">
          <Image
            src={WATCHER_PORTRAIT}
            alt="The Watcher, a hooded wizard in dark robes with glowing eyes"
            fill
            priority
            sizes="(max-width: 640px) 100vw, 448px"
            className="object-cover object-[50%_20%]"
          />
          <div className="absolute inset-0 bg-linear-to-b from-transparent via-[#0d0f1a]/30 to-[#0d0f1a]" />
          <p className="absolute bottom-3 left-6 text-xs font-medium uppercase tracking-[0.3em] text-violet-200/80">
            The Watcher
          </p>
        </div>

        <div className="space-y-4 px-6 pb-6">
          <DialogTitle className="font-serif text-xl leading-snug text-slate-50">
            &ldquo;{rejection?.message}&rdquo;
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-300">
            {rejection?.hint}
          </DialogDescription>

          {isCooldown && countdown && !countdown.done && (
            <div className="flex items-center gap-2 rounded-lg border border-violet-400/20 bg-violet-950/40 px-3 py-2 text-sm text-violet-100">
              <Hourglass className="size-4 shrink-0" aria-hidden="true" />
              <span>
                Your magic returns in{" "}
                <span className="font-mono tabular-nums">
                  {countdown.label}
                </span>
              </span>
            </div>
          )}

          {showStrikes && !isCooldown && (
            <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
              <span>
                {rejection.strikeCount >= COOLDOWN_STRIKES - 1
                  ? "One more and the Watcher silences you for a while."
                  : "The Watcher remembers."}
              </span>
              <StrikeEyes count={rejection.strikeCount} />
            </div>
          )}

          <p className="text-xs text-slate-500">
            Nothing was spent. Your text is still there to edit.{" "}
            <Link
              href="/rules"
              target="_blank"
              className="text-violet-300 underline-offset-4 hover:underline"
            >
              Read the arena rules
            </Link>
          </p>

          <Button
            onClick={onClose}
            className="w-full bg-violet-600 text-white hover:bg-violet-500"
            disabled={isCooldown && !!countdown && !countdown.done}
          >
            {isCooldown && countdown && !countdown.done
              ? "Silenced"
              : retryLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
