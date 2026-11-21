"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useConvexAuth, useMutation } from "convex/react";
import usePresence from "@convex-dev/presence/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

const VIEWER_ID_KEY = "arena_viewer_id";
const HEARTBEAT_MS = 10_000; // Offline after 25s without one, or at once when hidden

/** Stable per-browser ID for viewers who aren't signed in. */
function anonymousViewerId(): string {
  try {
    const existing = localStorage.getItem(VIEWER_ID_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(VIEWER_ID_KEY, id);
    return id;
  } catch {
    // Storage blocked: count this visit on its own.
    return crypto.randomUUID();
  }
}

/**
 * Puts the viewer in the duel's arena (presence room) while the page is open
 * and visible. Renders nothing. For duelists it also clears the duel's
 * notifications on arrival, and asks for a reminder when they step away
 * mid-turn.
 */
export function ArenaPresence({
  duelId,
  isPlayer,
}: {
  duelId: Id<"duels">;
  isPlayer: boolean;
}) {
  const { isLoaded, user } = useUser();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const [anonId] = useState(() =>
    typeof window === "undefined" ? null : anonymousViewerId(),
  );

  // Wait until we know who this is, so a viewer doesn't flip identities.
  if (!isLoaded || isLoading) return null;
  const presenceId =
    isAuthenticated && user ? `user:${user.id}` : anonId && `anon:${anonId}`;
  if (!presenceId) return null;

  return (
    <>
      <JoinArena duelId={duelId} presenceId={presenceId} />
      {isPlayer && <DuelistAttendance duelId={duelId} />}
    </>
  );
}

function JoinArena({
  duelId,
  presenceId,
}: {
  duelId: Id<"duels">;
  presenceId: string;
}) {
  usePresence(api.presence, duelId, presenceId, HEARTBEAT_MS);
  const recordView = useMutation(api.duelViews.recordDuelView);

  // Count a view on arrival and whenever the tab comes back into view. The
  // server folds repeats within 30 minutes into one visit.
  useEffect(() => {
    const record = () => {
      if (document.visibilityState === "visible") {
        recordView({ duelId, viewerId: presenceId }).catch(() => {});
      }
    };
    record();
    document.addEventListener("visibilitychange", record);
    return () => document.removeEventListener("visibilitychange", record);
  }, [duelId, presenceId, recordView]);

  return null;
}

function DuelistAttendance({ duelId }: { duelId: Id<"duels"> }) {
  const markRead = useMutation(api.notifications.markDuelNotificationsRead);
  const noteLeft = useMutation(api.notifications.noteLeftDuel);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        markRead({ duelId }).catch(() => {});
      } else {
        noteLeft({ duelId }).catch(() => {});
      }
    };
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      // Navigating to another page in the app counts as stepping away too.
      noteLeft({ duelId }).catch(() => {});
    };
  }, [duelId, markRead, noteLeft]);

  return null;
}
