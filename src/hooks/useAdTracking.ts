import { useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../convex/_generated/api";
import { useAnonymousSession } from "./useAnonymousSession";

type AdPlacement = "WIZARD_PAGE" | "DUEL_PAGE" | "CREDIT_REWARD";
type AdType = "DISPLAY_BANNER" | "VIDEO_REWARD" | "INTERSTITIAL";
type AdAction = "IMPRESSION" | "CLICK" | "COMPLETION";

export function useAdTracking() {
  const { user } = useUser();
  const { sessionId } = useAnonymousSession();
  const trackAdInteraction = useMutation(api.adService.trackAdInteraction);

  // Check if ads should be shown
  const shouldShowAds = useQuery(api.adService.shouldShowAds, {
    userId: user?.id,
  });

  // Track an ad interaction
  const trackInteraction = useCallback(
    async (
      adType: AdType,
      placement: AdPlacement,
      action: AdAction,
      options?: {
        revenue?: number;
        metadata?: Record<string, string>;
      }
    ) => {
      if (!sessionId) {
        console.warn("Cannot track ad interaction: no session ID");
        return;
      }

      try {
        const interactionId = await trackAdInteraction({
          userId: user?.id,
          sessionId,
          adType,
          placement,
          action,
          adNetworkId: "google-adsense", // Default network
          revenue: options?.revenue,
          metadata: options?.metadata,
        });

        return interactionId;
      } catch (error) {
        console.error("Failed to track ad interaction:", error);
        throw error;
      }
    },
    [sessionId, user?.id, trackAdInteraction]
  );

  // Convenience methods for common interactions
  const trackImpression = useCallback(
    (adType: AdType, placement: AdPlacement) => {
      return trackInteraction(adType, placement, "IMPRESSION");
    },
    [trackInteraction]
  );

  const trackClick = useCallback(
    (adType: AdType, placement: AdPlacement, revenue?: number) => {
      return trackInteraction(adType, placement, "CLICK", { revenue });
    },
    [trackInteraction]
  );

  const trackCompletion = useCallback(
    (adType: AdType, placement: AdPlacement, revenue?: number) => {
      return trackInteraction(adType, placement, "COMPLETION", { revenue });
    },
    [trackInteraction]
  );

  return {
    shouldShowAds: shouldShowAds ?? false,
    sessionId,
    trackInteraction,
    trackImpression,
    trackClick,
    trackCompletion,
  };
}
