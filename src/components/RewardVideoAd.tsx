"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../convex/_generated/api";
import { useAnonymousSession } from "../hooks/useAnonymousSession";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Play, Gift, Loader2 } from "lucide-react";

interface RewardVideoAdProps {
  onRewardEarned?: (credits: number) => void;
  className?: string;
}

export function RewardVideoAd({
  onRewardEarned,
  className = "",
}: RewardVideoAdProps) {
  const { user } = useUser();
  const { sessionId } = useAnonymousSession();
  const [isWatching, setIsWatching] = useState(false);
  const [hasWatched, setHasWatched] = useState(false);
  const trackAdInteraction = useMutation(api.adService.trackAdInteraction);

  // Don't show for logged-in users
  if (user) {
    return null;
  }

  const handleWatchVideo = async () => {
    if (!sessionId) return;

    setIsWatching(true);

    try {
      // Track impression
      await trackAdInteraction({
        sessionId,
        adType: "VIDEO_REWARD",
        placement: "CREDIT_REWARD",
        action: "IMPRESSION",
        adNetworkId: "google-adsense",
      });

      // Simulate video watching (in real implementation, this would be handled by the ad network)
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Track completion
      await trackAdInteraction({
        sessionId,
        adType: "VIDEO_REWARD",
        placement: "CREDIT_REWARD",
        action: "COMPLETION",
        adNetworkId: "google-adsense",
        revenue: 50, // 50 cents revenue for completed video
      });

      setHasWatched(true);
      onRewardEarned?.(1); // Award 1 credit
    } catch (error) {
      console.error("Failed to process reward video:", error);
    } finally {
      setIsWatching(false);
    }
  };

  if (hasWatched) {
    return (
      <Card
        className={`bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800 ${className}`}
      >
        <CardContent className="p-6 text-center">
          <div className="mb-4">
            <Gift className="h-12 w-12 mx-auto text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
            Reward Earned! 🎉
          </h3>
          <p className="text-green-600 dark:text-green-400 text-sm">
            You&apos;ve earned 1 image generation credit!
          </p>
          <p className="text-xs text-green-500 dark:text-green-500 mt-2">
            Sign up to keep your credits and unlock unlimited features!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 border-purple-200 dark:border-purple-800 ${className}`}
    >
      <CardHeader>
        <CardTitle className="text-center flex items-center justify-center gap-2">
          <Play className="h-5 w-5" />
          Earn Free Credits
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border-2 border-dashed border-purple-300 dark:border-purple-600">
          <div className="text-4xl mb-2">🎬</div>
          <h3 className="text-lg font-semibold mb-2">Watch & Earn</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Watch a short video advertisement to earn 1 free image generation
            credit!
          </p>

          <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400 mb-4">
            <Gift className="h-4 w-4" />
            <span>+1 Image Credit</span>
          </div>

          <Button
            onClick={handleWatchVideo}
            disabled={isWatching}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {isWatching ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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

        <p className="text-xs text-muted-foreground">
          Credits are temporary for anonymous users. Sign up to keep your
          credits forever!
        </p>
      </CardContent>
    </Card>
  );
}
