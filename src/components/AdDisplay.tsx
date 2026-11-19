"use client";

import { Button } from "@/components/ui/button";
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
      { threshold: 0.5 },
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
          <div className="bg-arcane-soft p-4 rounded-lg border border-primary/30">
            <div className="text-center">
              <div className="text-sm text-foreground mb-2">Advertisement</div>
              <div className="bg-card p-6 rounded border-2 border-dashed border-border">
                <div className="text-lg font-semibold text-foreground mb-2">
                  🎮 Gaming Ad Placeholder
                </div>
                <div className="text-sm text-foreground mb-3">
                  Discover amazing games and magical adventures!
                </div>
                <Button size="sm" onClick={handleAdClick}>
                  Learn More
                </Button>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Sign up to remove ads and unlock premium features!
              </div>
            </div>
          </div>
        );

      case "VIDEO_REWARD":
        return (
          <div className="bg-linear-to-r from-success/20 to-success/5 p-4 rounded-lg border border-success/40">
            <div className="text-center">
              <div className="text-sm text-foreground mb-2">Reward Video</div>
              <div className="bg-card p-6 rounded border-2 border-dashed border-border">
                <div className="text-lg font-semibold text-foreground mb-2">
                  🎬 Watch & Earn
                </div>
                <div className="text-sm text-foreground mb-3">
                  Watch a short video to earn tokens!
                </div>
                <Button size="sm" onClick={handleAdClick}>
                  Watch Video (+1 Token)
                </Button>
              </div>
            </div>
          </div>
        );

      case "INTERSTITIAL":
        return (
          <div className="bg-linear-to-r from-warning/20 to-destructive/20 p-4 rounded-lg border border-warning/40">
            <div className="text-center">
              <div className="text-sm text-foreground mb-2">
                Sponsored Content
              </div>
              <div className="bg-card p-6 rounded border-2 border-dashed border-border">
                <div className="text-lg font-semibold text-foreground mb-2">
                  ⚡ Special Offer
                </div>
                <div className="text-sm text-foreground mb-3">
                  Limited time gaming deals and offers!
                </div>
                <Button size="sm" onClick={handleAdClick}>
                  View Offers
                </Button>
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
