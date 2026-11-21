"use client";

import { useEffect, useState } from "react";
import {
  activePortraitStage,
  type PortraitStage,
  type PortraitStatusFields,
} from "../../convex/lib/portrait";

/**
 * The live stage of a wizard's portrait job ("sketching" → "painting"), or
 * null when nothing is running. Re-checks the clock every 30s so a job that
 * died without reporting back eventually stops animating.
 */
export function usePortraitStage(
  wizard: PortraitStatusFields | null | undefined,
): PortraitStage | null {
  const [now, setNow] = useState(() => Date.now());
  const running =
    !!wizard &&
    (wizard.illustrationStatus === "sketching" ||
      wizard.illustrationStatus === "painting");

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [running]);

  if (!wizard) return null;
  // A job requested after this component mounted is fresh by definition.
  return activePortraitStage(
    wizard,
    Math.max(now, wizard.illustrationRequestedAt ?? 0),
  );
}
