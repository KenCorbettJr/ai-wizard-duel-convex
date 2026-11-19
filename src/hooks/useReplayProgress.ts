"use client";

import { useCallback, useEffect, useState } from "react";

const keyFor = (duelId: string) => `duelReplayProgress:${duelId}`;

/**
 * Remembers, per duel, the last round this viewer has watched. Lets a shared
 * duel be replayed one round at a time and resumed later.
 *
 * `stored` is `undefined` until localStorage has been read, then the saved
 * round number or `null` when this viewer has no saved progress.
 */
export function useReplayProgress(duelId: string) {
  const [stored, setStored] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    let value: number | null = null;
    try {
      const raw = localStorage.getItem(keyFor(duelId));
      const n = raw === null ? NaN : Number(raw);
      value = Number.isFinite(n) && n >= 0 ? n : null;
    } catch {
      // Storage unavailable (private mode): start fresh each visit.
    }
    setStored(value);
  }, [duelId]);

  const save = useCallback(
    (roundNumber: number) => {
      try {
        localStorage.setItem(keyFor(duelId), String(roundNumber));
      } catch {
        // Ignore: progress is kept for this visit only.
      }
    },
    [duelId],
  );

  return { stored, save };
}
