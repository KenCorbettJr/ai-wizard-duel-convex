"use client";

import { useCallback, useEffect, useState } from "react";

const EVENT = "duelConclusionRevealed";
const keyFor = (duelId: string) => `duelConclusionRevealed:${duelId}`;

/**
 * Tracks whether the viewer has chosen to reveal a duel's conclusion. The
 * choice is remembered per duel in localStorage and shared between every
 * component that uses the hook, so the winner banner and the conclusion card
 * unlock together.
 */
export function useConclusionReveal(duelId: string) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const sync = () =>
      setRevealed(localStorage.getItem(keyFor(duelId)) === "true");
    sync();
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, [duelId]);

  const reveal = useCallback(() => {
    localStorage.setItem(keyFor(duelId), "true");
    window.dispatchEvent(new Event(EVENT));
  }, [duelId]);

  return { revealed, reveal };
}
