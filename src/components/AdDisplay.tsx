"use client";

import React, { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../convex/_generated/api";
import { useAnonymousSession } from "../hooks/useAnonymousSession";

type AdPlacement = "WIZARD_PAGE" | "DUEL_PAGE" | "CREDIT_REWARD";
type AdType = "DISPLAY_BANNER" | "VIDEO_REWARD" | "INTERSTITIAL";

interface AdDisplayProps {
  placement: AdPlacement;
  className?: string;
  onAdInteraction?: (action: "IMPRESSION" | "CLICK" | "COMPLETION") => void;
}

export function AdDisplay({
  placement,
  className = "",
  onAdInteraction,
}: AdDisplayProps) {
  const { user } = useUser();
  const { sessionId } = useAnonymousSession();
  const [hasTrackedImpression, setHasTrackedImpression] = useState(false);
  const adRef = useRef<HTMLDivElement>(null);
  const trackAdInteraction = useMutation(api.adService.trackAdInteraction);

  // Get ad configuration
  const adConfig = useQuery(api.adService.getAdConfiguration, {
    placement,
    userId: user?.id,
  });

  // Track impression when ad becomes visible
  useEffect(() => {
    if (!adConfig?.shouldShow || !sessionId || hasTrackedImpression) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTrackedImpression) {
            setHasTrackedImpression(true);
            trackAdInteraction({
              userId: user?.id,
              sessionId,
              adType: adConfig.adType!,
              placement,
              action: "IMPRESSION",
              adNetworkId: adConfig.adNetworkId!,
            }).catch(console.error);

            onAdInteraction?.("IMPRESSION");
          }
        });
      },
      { threshold: 0.5 }
    );

    if (adRef.current) {
      observer.observe(adRef.current);
    }

    return () => observer.disconnect();
  }, [
    adConfig,
    sessionId,
    hasTrackedImpression,
    trackAdInteraction,
    user?.id,
    placement,
    onAdInteraction,
  ]);

  // Handle ad click
  const handleAdClick = async () => {
    if (!sessionId || !adConfig) return;

    try {
      await trackAdInteraction({
        userId: user?.id,
        sessionId,
        adType: adConfig.adType!,
        placement,
        action: "CLICK",
        adNetworkId: adConfig.adNetworkId!,
      });

      onAdInteraction?.("CLICK");
    } catch (error) {
      console.error("Failed to track ad click:", error);
    }
  };

  // Don't render if user is logged in or ad config says not to show
  if (!adConfig?.shouldShow) {
    return null;
  }

  // Render different ad types
  const renderAdContent = () => {
    const adType: AdType = adConfig.adType as AdType;
    switch (adType) {
      case "DISPLAY_BANNER":
        return (
          <div className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900 dark:to-blue-900 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
            <div className="text-center">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Advertisement
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded border-2 border-dashed border-gray-300 dark:border-gray-600">
                <div className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  🎮 Gaming Ad Placeholder
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Discover amazing games and magical adventures!
                </div>
                <button
                  onClick={handleAdClick}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm transition-colors"
                >
                  Learn More
                </button>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                Sign up to remove ads and unlock premium features!
              </div>
            </div>
          </div>
        );

      case "VIDEO_REWARD":
        return (
          <div className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 p-4 rounded-lg border border-green-200 dark:border-green-700">
            <div className="text-center">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Reward Video
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded border-2 border-dashed border-gray-300 dark:border-gray-600">
                <div className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  🎬 Watch & Earn
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Watch a short video to earn image credits!
                </div>
                <button
                  onClick={handleAdClick}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm transition-colors"
                >
                  Watch Video (+1 Credit)
                </button>
              </div>
            </div>
          </div>
        );

      case "INTERSTITIAL":
        return (
          <div className="bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900 dark:to-red-900 p-4 rounded-lg border border-orange-200 dark:border-orange-700">
            <div className="text-center">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Sponsored Content
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded border-2 border-dashed border-gray-300 dark:border-gray-600">
                <div className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  ⚡ Special Offer
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Limited time gaming deals and offers!
                </div>
                <button
                  onClick={handleAdClick}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded text-sm transition-colors"
                >
                  View Offers
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div ref={adRef} className={`ad-display ${className}`}>
      {renderAdContent()}
    </div>
  );
}
