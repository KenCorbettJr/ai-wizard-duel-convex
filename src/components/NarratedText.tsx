"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
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
/** Fired when a narration starts, so any other narration on the page pauses. */
const PLAY_EVENT = "duel-narration-play";

/**
 * Asks the player to start from the beginning. `force` plays even when the
 * viewer turned autoplay off (an explicit "replay this round").
 */
/** Fades out whatever narration is playing (e.g. when moving to the next round). */
export function stopAllNarration() {
  window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: "" }));
}

export interface NarrationPlaySignal {
  token: number;
  force: boolean;
}

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
  playSignal,
  children,
}: {
  narration?: RoundNarration;
  playSignal?: NarrationPlaySignal;
  children: ReactNode;
}) {
  if (!narration || narration.status === "FAILED") {
    return <>{children}</>;
  }
  return (
    <NarrationPlayer narration={narration} playSignal={playSignal}>
      {children}
    </NarrationPlayer>
  );
}

function NarrationPlayer({
  narration,
  playSignal,
  children,
}: {
  narration: RoundNarration;
  playSignal?: NarrationPlaySignal;
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

  // A reveal or replay asked for the narration. Waits for the audio URL.
  const handledSignal = useRef<number | null>(null);
  useEffect(() => {
    const audio = audioRef.current;
    if (!playSignal || !audio || !url) return;
    if (handledSignal.current === playSignal.token) return;
    handledSignal.current = playSignal.token;
    autoplayTried.current = true;
    if (!playSignal.force && !autoplay) return;
    audio.currentTime = 0;
    audio.play().catch(() => setBlocked(true));
  }, [playSignal, url, autoplay]);

  // Only one narration plays at a time.
  const playerId = useId();
  useEffect(() => {
    const onOther = (e: Event) => {
      const audio = audioRef.current;
      if ((e as CustomEvent<string>).detail === playerId || !audio) return;
      if (audio.paused) return;
      // Fade out rather than cut the announcer off mid-word.
      const start = audio.volume;
      let step = 0;
      const fade = setInterval(() => {
        step++;
        audio.volume = Math.max(0, start * (1 - step / 8));
        if (step >= 8) {
          clearInterval(fade);
          audio.pause();
          audio.volume = start;
        }
      }, 60);
    };
    window.addEventListener(PLAY_EVENT, onOther);
    return () => window.removeEventListener(PLAY_EVENT, onOther);
  }, [playerId]);

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
              onPlay={() => {
                setPlaying(true);
                setBlocked(false);
                window.dispatchEvent(
                  new CustomEvent(PLAY_EVENT, { detail: playerId }),
                );
              }}
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
