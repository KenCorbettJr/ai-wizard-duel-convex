"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

/** Starts a campaign battle and navigates to the duel. Shows errors as toasts. */
export function useStartCampaignBattle() {
  const router = useRouter();
  const startCampaignBattle = useMutation(api.campaigns.startCampaignBattle);
  const [startingKey, setStartingKey] = useState<string | null>(null);

  // Re-enable buttons when the page is restored from the back/forward cache
  useEffect(() => {
    const reset = () => setStartingKey(null);
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  const start = useCallback(
    async (wizardId: Id<"wizards">, opponentNumber: number) => {
      setStartingKey(`${wizardId}:${opponentNumber}`);
      try {
        const result = await startCampaignBattle({ wizardId, opponentNumber });
        router.push(`/duels/${result.duelId}`);
      } catch (error) {
        toast.error(
          error instanceof ConvexError && typeof error.data === "string"
            ? error.data
            : error instanceof Error
              ? error.message
              : "Could not start the battle. Please try again.",
        );
        setStartingKey(null);
      }
    },
    [router, startCampaignBattle],
  );

  return {
    start,
    isStarting: (wizardId: Id<"wizards">, opponentNumber: number) =>
      startingKey === `${wizardId}:${opponentNumber}`,
    isBusy: startingKey !== null,
  };
}
