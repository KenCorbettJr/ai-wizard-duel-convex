"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAction, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { MessageCircle, MessageCircleOff, Send, X } from "lucide-react";
import posthog from "posthog-js";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import {
  MAX_CHAT_LENGTH,
  messageReached,
  textBlockedReason,
} from "../../convex/lib/duelChat";
import { Button } from "@/components/ui/button";
import {
  WatcherDialog,
  type WatcherRejection,
} from "@/components/watcher/WatcherDialog";
import { cn } from "@/lib/utils";

type ChatMessage = NonNullable<
  FunctionReturnType<typeof api.duelChat.listMessages>
>[number];

interface DuelChatProps {
  duel: Doc<"duels">;
  /** Wizard names by id, for labelling messages. */
  wizardNames: Record<string, string>;
  userId?: string;
  userLoaded: boolean;
  /**
   * The last round the viewer has watched resolve, or null while that isn't
   * known yet. Messages sent later stay hidden so a replay isn't spoiled.
   */
  watchedThrough: number | null;
  /** Whether the viewer has seen how the duel ended. */
  resultShown: boolean;
  /** Whether the viewer is caught up with the duel (not replaying). */
  live: boolean;
  /** Space taken at the bottom of the screen by the spell composer. */
  bottomOffset: number;
}

function timeLabel(ts: number) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function segmentLabel(afterRound: number, postDuel?: boolean) {
  if (postDuel) return "After the duel";
  return afterRound === 0 ? "Before round 1" : `After round ${afterRound}`;
}

/**
 * Chat between the duelists, in a floating panel. Signed-in viewers can read
 * along. During a replay, messages appear as the viewer reaches the point in
 * the duel where they were sent.
 */
export function DuelChat({
  duel,
  wizardNames,
  userId,
  userLoaded,
  watchedThrough,
  resultShown,
  live,
  bottomOffset,
}: DuelChatProps) {
  const signedIn = !!userId;
  const all = useQuery(
    api.duelChat.listMessages,
    signedIn ? { duelId: duel._id } : "skip",
  );
  const sendChatMessage = useAction(api.watcher.sendChatMessage);
  const turnOffChat = useMutation(api.duelChat.turnOffChat);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejection, setRejection] = useState<WatcherRejection | null>(null);
  const [confirmOff, setConfirmOff] = useState(false);
  const [lastSeenAt, setLastSeenAt] = useState(0);
  // Re-check time-based rules (post-duel window) every so often.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const reached = useMemo(
    () =>
      watchedThrough === null || !all
        ? []
        : all.filter((m) => messageReached(m, watchedThrough, resultShown)),
    [all, watchedThrough, resultShown],
  );
  const hiddenCount = (all?.length ?? 0) - reached.length;

  // Group into stretches between rounds.
  const segments = useMemo(() => {
    const out: { key: string; label: string; texts: ChatMessage[] }[] = [];
    for (const m of reached) {
      const key = m.postDuel ? "post" : `r${m.afterRound}`;
      let seg = out[out.length - 1];
      if (!seg || seg.key !== key) {
        seg = { key, label: segmentLabel(m.afterRound, m.postDuel), texts: [] };
        out.push(seg);
      }
      seg.texts.push(m);
    }
    return out;
  }, [reached]);

  const unread = open
    ? 0
    : reached.filter((m) => !m.mine && m.createdAt > lastSeenAt).length;
  // Everything reached counts as read once the panel is opened or closed.
  const markRead = () => {
    if (reached.length) {
      setLastSeenAt(Math.max(...reached.map((m) => m.createdAt)));
    }
  };

  // Keep the newest message in view when already at the bottom.
  const listRef = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  useEffect(() => {
    const el = listRef.current;
    if (el && atBottom.current) el.scrollTop = el.scrollHeight;
  }, [segments, open]);

  const isDuelist = !!userId && duel.players.includes(userId);
  const textBlocked = userId ? textBlockedReason(duel, userId, now) : null;
  const canText = isDuelist && !textBlocked && live;
  const chatOff = duel.chatEnabled === false;

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const result = await sendChatMessage({ duelId: duel._id, body });
      if (!result.ok) {
        setRejection(result.rejection);
        posthog.capture("chat_rejected_by_watcher", {
          category: result.rejection.category,
        });
        return;
      }
      atBottom.current = true;
      setDraft("");
      posthog.capture("chat_message_sent", { round: duel.currentRound });
    } catch (e) {
      setError(
        e instanceof ConvexError && typeof e.data === "string"
          ? e.data
          : "Couldn't send that. Check your connection.",
      );
    } finally {
      setSending(false);
    }
  };

  const handleTurnOff = async () => {
    setConfirmOff(false);
    try {
      await turnOffChat({ duelId: duel._id });
      posthog.capture("duel_chat_turned_off");
    } catch {
      setError("Couldn't turn chat off. Try again.");
    }
  };

  // With chat off and nothing said, there's nothing to open.
  if (chatOff && (!all || all.length === 0)) return null;

  const bottom = bottomOffset + 16;

  return (
    <>
      {!open && (
        <Button
          type="button"
          size="lg"
          variant="secondary"
          className="fixed right-4 z-[36] h-12 rounded-full border border-border/60 px-4 shadow-lg sm:right-6"
          style={{ bottom }}
          onClick={() => {
            markRead();
            setOpen(true);
          }}
          aria-expanded={false}
          aria-controls="duel-chat"
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
          <span className="ml-2">Chat</span>
          {unread > 0 && (
            <span className="ml-2 rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
              {unread}
              <span className="sr-only"> unread</span>
            </span>
          )}
        </Button>
      )}

      {open && (
        <section
          id="duel-chat"
          aria-label="Duel chat"
          className="fixed inset-x-2 z-[36] flex max-h-[60vh] flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-2xl sm:inset-x-auto sm:right-6 sm:h-[28rem] sm:max-h-[70vh] sm:w-[22rem]"
          style={{ bottom }}
        >
          <header className="flex items-center justify-between gap-2 border-b border-border/50 px-3 py-2">
            <div className="flex items-center gap-2">
              <MessageCircle
                className="h-4 w-4 text-primary"
                aria-hidden="true"
              />
              <h2 className="text-sm font-semibold">Duel chat</h2>
            </div>
            <div className="flex items-center gap-1">
              {isDuelist && !chatOff && !confirmOff && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs text-muted-foreground"
                  onClick={() => setConfirmOff(true)}
                >
                  <MessageCircleOff
                    className="mr-1 h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                  Turn off
                </Button>
              )}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => {
                  markRead();
                  setOpen(false);
                }}
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </header>

          {confirmOff && (
            <div className="border-b border-border/50 bg-muted/40 px-3 py-2 text-sm">
              <p className="mb-2">
                Turn chat off for the rest of this duel? Neither of you will be
                able to send messages.
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" onClick={handleTurnOff}>
                  Turn chat off
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmOff(false)}
                >
                  Keep it on
                </Button>
              </div>
            </div>
          )}

          {!signedIn ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
              {userLoaded ? (
                <>
                  <p>
                    Sign in to see what the duelists are saying and to react.
                  </p>
                  <Button asChild size="sm">
                    <Link
                      href={`/sign-in?redirect_url=${encodeURIComponent(`/duels/${duel._id}`)}`}
                    >
                      Sign in
                    </Link>
                  </Button>
                </>
              ) : null}
            </div>
          ) : (
            <>
              <div
                ref={listRef}
                onScroll={(e) => {
                  const el = e.currentTarget;
                  atBottom.current =
                    el.scrollHeight - el.scrollTop - el.clientHeight < 40;
                }}
                className="flex-1 space-y-3 overflow-y-auto px-3 py-3"
                aria-live="polite"
                aria-relevant="additions"
              >
                {all === undefined ? (
                  <p className="text-center text-sm text-muted-foreground">
                    Loading…
                  </p>
                ) : segments.length === 0 ? (
                  <p className="pt-6 text-center text-sm text-muted-foreground">
                    {hiddenCount > 0
                      ? "Keep watching. The chat unlocks as the duel plays out."
                      : chatOff
                        ? "Chat is off for this duel."
                        : isDuelist
                          ? "Say something to your rival. Your magic still does the real talking."
                          : "The duelists haven't said anything yet."}
                  </p>
                ) : (
                  segments.map((seg) => (
                    <div key={seg.key} className="space-y-2">
                      <p className="text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {seg.label}
                      </p>
                      {seg.texts.map((m) => {
                        const side =
                          m.wizardId === duel.wizards[0] ? "first" : "second";
                        return (
                          <div
                            key={m._id}
                            className={cn(
                              "flex flex-col",
                              m.mine ? "items-end" : "items-start",
                            )}
                          >
                            <span
                              className={cn(
                                "mb-0.5 text-xs font-semibold",
                                side === "first"
                                  ? "text-primary"
                                  : "text-warning",
                              )}
                            >
                              {(m.wizardId && wizardNames[m.wizardId]) ??
                                "Wizard"}
                              <span className="ml-2 font-normal text-muted-foreground">
                                {timeLabel(m.createdAt)}
                              </span>
                            </span>
                            <p
                              className={cn(
                                "max-w-[85%] break-words rounded-2xl px-3 py-1.5 text-sm",
                                m.mine
                                  ? "rounded-br-sm bg-primary text-primary-foreground"
                                  : "rounded-bl-sm bg-muted text-foreground",
                              )}
                            >
                              {m.body}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
                {segments.length > 0 && hiddenCount > 0 && (
                  <p className="text-center text-xs text-muted-foreground">
                    More chat unlocks as you keep watching.
                  </p>
                )}
              </div>

              <div className="space-y-2 border-t border-border/50 px-3 py-2">
                {canText && (
                  <form
                    className="flex items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void handleSend();
                    }}
                  >
                    <label htmlFor="duel-chat-input" className="sr-only">
                      Message your rival
                    </label>
                    <input
                      id="duel-chat-input"
                      value={draft}
                      onChange={(e) => {
                        setDraft(e.target.value);
                        if (error) setError(null);
                      }}
                      maxLength={MAX_CHAT_LENGTH}
                      autoComplete="off"
                      placeholder="Taunt your rival…"
                      className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      disabled={!draft.trim() || sending}
                      aria-label="Send"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                )}
                {isDuelist && !canText && textBlocked && (
                  <p className="text-xs text-muted-foreground">{textBlocked}</p>
                )}
                {isDuelist && !canText && !textBlocked && !live && (
                  <p className="text-xs text-muted-foreground">
                    Catch up to the live round to chat.
                  </p>
                )}
                {error && (
                  <p role="alert" className="text-xs text-destructive">
                    {error}
                  </p>
                )}
              </div>
            </>
          )}
        </section>
      )}

      <WatcherDialog
        rejection={rejection}
        onClose={() => setRejection(null)}
        retryLabel="Rewrite my message"
      />
    </>
  );
}
