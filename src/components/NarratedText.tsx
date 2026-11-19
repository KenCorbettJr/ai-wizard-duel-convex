"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery } from "convex/react";
import { ChevronDown, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { transformConvexImageUrl } from "@/lib/convex-image-proxy";
import { RuneSpinner } from "@/components/ui/rune-spinner";

export interface RoundNarration {
  status: "PENDING" | "READY" | "FAILED";
  storageId?: string;
  generatedAt?: number;
}

const AUTOPLAY_KEY = "narrationAutoplay";
const FRESH_MS = 90_000;

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Plays the announcer narration for a round and tucks the written text into a
 * dropdown. Without a narration (none yet, failed, or older rounds) the text
 * is shown directly.
 */
export function NarratedText({
  narration,
  children,
}: {
  narration?: RoundNarration;
  children: ReactNode;
}) {
  if (!narration || narration.status === "FAILED") {
    return <>{children}</>;
  }
  return <NarrationPlayer narration={narration}>{children}</NarrationPlayer>;
}

function NarrationPlayer({
  narration,
  children,
}: {
  narration: RoundNarration;
  children: ReactNode;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const autoplayTried = useRef(false);
  // Was this narration still pending when we first rendered it? Then it is
  // being generated live, and we should play it as soon as it lands.
  const startedPending = useRef(narration.status === "PENDING");

  const [showText, setShowText] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const [blocked, setBlocked] = useState(false);

  // Only autoplay narration for a round that is actually on screen.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    setAutoplay(localStorage.getItem(AUTOPLAY_KEY) !== "false");
  }, []);

  const rawUrl = useQuery(
    api.wizards.getIllustrationUrl,
    narration.storageId ? { storageId: narration.storageId } : "skip",
  );
  const url = transformConvexImageUrl(rawUrl);

  // Autoplay once, only for narration generated live or just now, so opening
  // an old duel never plays every round at once.
  useEffect(() => {
    const audio = audioRef.current;
    const isFresh =
      !!narration.generatedAt && Date.now() - narration.generatedAt < FRESH_MS;
    if (
      !audio ||
      !url ||
      !autoplay ||
      !inView ||
      autoplayTried.current ||
      !(startedPending.current || isFresh)
    ) {
      return;
    }
    autoplayTried.current = true;
    audio.play().catch(() => setBlocked(true)); // browser blocked autoplay
  }, [url, autoplay, inView, narration.generatedAt]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setBlocked(false);
    if (audio.paused) {
      void audio.play();
    } else {
      audio.pause();
    }
  };

  const toggleAutoplay = () => {
    const next = !autoplay;
    setAutoplay(next);
    localStorage.setItem(AUTOPLAY_KEY, String(next));
  };

  const ready = narration.status === "READY" && !!url;

  return (
    <div ref={rootRef} className="space-y-3">
      <div
        className={`flex items-center gap-3 rounded-lg border bg-card/70 p-3 ${
          blocked ? "border-warning/60 animate-pulse" : "border-border/50"
        }`}
      >
        {ready ? (
          <>
            <button
              type="button"
              onClick={toggle}
              aria-label={playing ? "Pause narration" : "Play narration"}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90"
            >
              {playing ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </button>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">
                {blocked ? "Tap to hear the announcer" : "The Announcer"}
              </div>
              <input
                type="range"
                aria-label="Narration progress"
                className="w-full accent-primary"
                min={0}
                max={duration || 0}
                step={0.1}
                value={time}
                onChange={(e) => {
                  const audio = audioRef.current;
                  if (audio) audio.currentTime = Number(e.target.value);
                }}
              />
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">
              {formatTime(time)} / {formatTime(duration)}
            </span>
            <button
              type="button"
              onClick={toggleAutoplay}
              aria-label={
                autoplay
                  ? "Turn off narration autoplay"
                  : "Turn on narration autoplay"
              }
              title={autoplay ? "Autoplay on" : "Autoplay off"}
              className="text-muted-foreground hover:text-foreground"
            >
              {autoplay ? (
                <Volume2 className="h-5 w-5" />
              ) : (
                <VolumeX className="h-5 w-5" />
              )}
            </button>
            <audio
              ref={audioRef}
              src={url ?? undefined}
              preload="auto"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
              onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
            />
          </>
        ) : (
          <>
            <RuneSpinner size="sm" label="Preparing narration" />
            <span className="text-sm text-muted-foreground">
              The announcer is clearing his throat...
            </span>
          </>
        )}
      </div>

      {/* While the audio is still being made, show the text straight away. */}
      {ready && (
        <button
          type="button"
          onClick={() => setShowText((s) => !s)}
          aria-expanded={showText}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${showText ? "rotate-180" : ""}`}
          />
          {showText ? "Hide text" : "Read the text"}
        </button>
      )}
      {(showText || !ready) && <div className="space-y-6">{children}</div>}
    </div>
  );
}
