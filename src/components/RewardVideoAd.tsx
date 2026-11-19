"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../convex/_generated/api";
import { useAnonymousSession } from "../hooks/useAnonymousSession";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Play, Gift, X, Coins } from "lucide-react";
import { RuneSpinner } from "@/components/ui/rune-spinner";
import posthog from "posthog-js";

interface RewardVideoAdProps {
  onAdCompleted: () => void;
  onAdFailed: () => void;
  rewardType: "IMAGE_CREDIT";
}

export function RewardVideoAd({
  onAdCompleted,
  onAdFailed,
}: RewardVideoAdProps) {
  const { user } = useUser();
  const { sessionId } = useAnonymousSession();
  const [isWatching, setIsWatching] = useState(false);
  const [hasWatched, setHasWatched] = useState(false);
  const [rewardResult, setRewardResult] = useState<{
    success: boolean;
    creditsAwarded: number;
    message: string;
  } | null>(null);

  const trackAdInteraction = useMutation(api.adService.trackAdInteraction);
  const processAdReward = useMutation(
    api.imageCreditService.processAdRewardCredit,
  );

  const handleWatchVideo = async () => {
    if (!user?.id) {
      onAdFailed();
      return;
    }

    setIsWatching(true);

    try {
      // Track impression
      await trackAdInteraction({
        userId: user.id,
        sessionId: sessionId || `session_${Date.now()}`,
        adType: "VIDEO_REWARD",
        placement: "CREDIT_REWARD",
        action: "IMPRESSION",
        adNetworkId: "google-adsense",
      });

      // Simulate video watching (in real implementation, this would be handled by the ad network)
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Track completion
      const adInteractionId = await trackAdInteraction({
        userId: user.id,
        sessionId: sessionId || `session_${Date.now()}`,
        adType: "VIDEO_REWARD",
        placement: "CREDIT_REWARD",
        action: "COMPLETION",
        adNetworkId: "google-adsense",
        revenue: 50, // 50 cents revenue for completed video
      });

      // Process the reward
      const result = await processAdReward({
        userId: user.id,
        adInteractionId,
      });

      setRewardResult(result);
      setHasWatched(true);

      if (result.success) {
        posthog.capture("ad_reward_earned", {
          credits_awarded: result.creditsAwarded,
        });
        onAdCompleted();
      } else {
        onAdFailed();
      }
    } catch (error) {
      console.error("Failed to process reward video:", error);
      onAdFailed();
    } finally {
      setIsWatching(false);
    }
  };

  const handleClose = () => {
    onAdCompleted();
  };

  // Show result modal after watching
  if (hasWatched && rewardResult) {
    const isSuccess = rewardResult.success;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card
          className={`max-w-md mx-4 transform transition-all duration-500 scale-100 ${
            isSuccess
              ? "bg-linear-to-br from-success/20 via-success/20 to-success/5 border-success/40 shadow-lg shadow-success/50"
              : "bg-linear-to-r from-destructive/20 to-warning/20 border-destructive/40"
          }`}
        >
          <CardHeader className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-2"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
            <CardTitle className="text-center text-xl">
              {isSuccess ? (
                <div className="flex items-center justify-center gap-2">
                  <span>Reward Earned!</span>
                  <div className="text-2xl animate-bounce">🎉</div>
                </div>
              ) : (
                "Reward Failed 😞"
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="mb-4">
              {isSuccess ? (
                <div className="relative">
                  <Gift className="h-16 w-16 mx-auto text-success animate-pulse" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 border-4 border-success/40 rounded-full animate-ping opacity-20"></div>
                  </div>
                </div>
              ) : (
                <X className="h-12 w-12 mx-auto text-destructive" />
              )}
            </div>

            {isSuccess && (
              <div className="bg-card p-4 rounded-lg border-2 border-success/40 shimmer-effect">
                <div className="flex items-center justify-center gap-3 text-lg font-bold text-success">
                  <Coins className="h-6 w-6 animate-spin" />
                  <span className="animate-credit-pulse">
                    +{rewardResult.creditsAwarded} Token
                    {rewardResult.creditsAwarded !== 1 ? "s" : ""}
                  </span>
                </div>
                <p className="text-sm text-success mt-2">
                  Added to your account instantly!
                </p>
              </div>
            )}

            <p
              className={`text-sm ${
                isSuccess ? "text-success" : "text-destructive"
              }`}
            >
              {rewardResult.message}
            </p>

            <Button
              onClick={handleClose}
              className={`w-full ${isSuccess ? "" : ""}`}
            >
              {isSuccess ? "Awesome! Continue" : "Try Again Later"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show ad watching interface
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="max-w-md mx-4 bg-arcane-soft border-primary/30">
        <CardHeader className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-2"
            onClick={onAdFailed}
            disabled={isWatching}
          >
            <X className="h-4 w-4" />
          </Button>
          <CardTitle className="text-center flex items-center justify-center gap-2">
            <Play className="h-5 w-5" />
            Earn Free Tokens
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="bg-card p-6 rounded-lg border-2 border-dashed border-primary/50">
            <div className="text-4xl mb-2">🎬</div>
            <h3 className="text-lg font-semibold mb-2">Watch & Earn</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Watch a short video advertisement to earn 1 free image generation
              token!
            </p>

            <div className="flex items-center justify-center gap-2 text-sm text-success mb-4">
              <Gift className="h-4 w-4" />
              <span>+1 Token</span>
            </div>

            <Button
              onClick={handleWatchVideo}
              disabled={isWatching || !user}
              className="w-full"
            >
              {isWatching ? (
                <>
                  <RuneSpinner size="xs" label="Working…" className="mr-2" />
                  Watching Video...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Watch Video (30s)
                </>
              )}
            </Button>
          </div>

          {!user && (
            <p className="text-xs text-muted-foreground">
              Please sign in to earn tokens from watching ads.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
