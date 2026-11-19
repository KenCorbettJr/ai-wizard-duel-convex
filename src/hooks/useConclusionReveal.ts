"use client";

import { useCallback, useEffect, useState } from "react";

const EVENT = "duelConclusionRevealed";
const keyFor = (duelId: string) => `duelConclusionRevealed:${duelId}`;

const memoryRevealed = new Set<string>();

function readRevealed(duelId: string): boolean {
  if (typeof window === "undefined") return false;
  if (memoryRevealed.has(duelId)) return true;
  try {
    return localStorage.getItem(keyFor(duelId)) === "true";
  } catch {
    return false;
  }
}

/**
 * Tracks whether the viewer has chosen to reveal a duel's conclusion. The
 * choice is remembered per duel in localStorage and shared between every
 * component that uses the hook, so the winner banner and the conclusion card
 * unlock together.
 */
export function useConclusionReveal(duelId: string) {
  // Read synchronously so returning viewers don't see a "hidden" flash. Only
  // used by components that render after client-side data has loaded.
  const [revealed, setRevealed] = useState(() => readRevealed(duelId));

  useEffect(() => {
    const sync = () => setRevealed(readRevealed(duelId));
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync); // other tabs
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [duelId]);

  const reveal = useCallback(() => {
    try {
      localStorage.setItem(keyFor(duelId), "true");
    } catch {
      // Storage can be unavailable (private mode). Reveal for this session only.
    }
    memoryRevealed.add(duelId);
    window.dispatchEvent(new Event(EVENT));
  }, [duelId]);

  return { revealed, reveal };
}
