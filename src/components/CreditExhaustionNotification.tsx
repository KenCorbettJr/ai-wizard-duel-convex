"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { AlertTriangle, Play, Crown, X } from "lucide-react";
import { RewardVideoAd } from "./RewardVideoAd";

interface CreditExhaustionNotificationProps {
  className?: string;
  onUpgradeClick?: () => void;
  onDismiss?: () => void;
  showDismiss?: boolean;
  variant?: "banner" | "modal" | "inline";
}

export function CreditExhaustionNotification({
  className = "",
  onUpgradeClick,
  onDismiss,
  showDismiss = false,
  variant = "inline",
}: CreditExhaustionNotificationProps) {
  const { user } = useUser();
  const [showRewardAd, setShowRewardAd] = useState(false);

  // Check if user can earn credits from ads
  const adCooldown = useQuery(
    api.imageCreditService.canEarnCreditFromAd,
    user?.id ? { userId: user.id } : "skip"
  );

  // Check if user has credits for duels
  const hasCreditsForDuel = useQuery(
    api.imageCreditService.hasImageCreditsForDuel,
    user?.id ? { userId: user.id } : "skip"
  );

  // Get user info to check if premium
  const userInfo = useQuery(
    api.users.getUserByClerkId,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const isPremium =
    userInfo?.subscriptionTier === "PREMIUM" &&
    userInfo?.subscriptionStatus === "ACTIVE";

  const handleWatchAd = () => {
    setShowRewardAd(true);
  };

  const handleAdCompleted = () => {
    setShowRewardAd(false);
  };

  const handleAdFailed = () => {
    setShowRewardAd(false);
  };

  const handleUpgrade = () => {
    if (onUpgradeClick) {
      onUpgradeClick();
    } else {
      // Default upgrade action
      console.log("Navigate to upgrade page");
    }
  };

  // Don't show if user has credits or is premium
  if (!user || hasCreditsForDuel || isPremium) {
    return null;
  }

  const content = (
    <div className="flex items-start gap-3">
      <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
      <div className="space-y-3 flex-1">
        <div>
          <h4 className="font-semibold text-red-800 dark:text-red-200 mb-1">
            Out of Image Credits!
          </h4>
          <p className="text-sm text-red-700 dark:text-red-300">
            Your duels will continue in text-only mode until you get more
            credits.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          {adCooldown?.canEarn && (
            <Button
              onClick={handleWatchAd}
              size="sm"
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-950"
            >
              <Play className="h-4 w-4 mr-2" />
              Watch Ad (+1 Credit)
            </Button>
          )}
          <Button
            onClick={handleUpgrade}
            size="sm"
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            <Crown className="h-4 w-4 mr-2" />
            Upgrade to Premium
          </Button>
        </div>
      </div>

      {showDismiss && onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

  if (variant === "banner") {
    return (
      <>
        <div
          className={`bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950 border-l-4 border-red-500 p-4 ${className}`}
        >
          {content}
        </div>
        {showRewardAd && (
          <RewardVideoAd
            onAdCompleted={handleAdCompleted}
            onAdFailed={handleAdFailed}
            rewardType="IMAGE_CREDIT"
          />
        )}
      </>
    );
  }

  if (variant === "modal") {
    return (
      <>
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-md mx-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950 border-red-200 dark:border-red-800">
            <CardContent className="p-6">{content}</CardContent>
          </Card>
        </div>
        {showRewardAd && (
          <RewardVideoAd
            onAdCompleted={handleAdCompleted}
            onAdFailed={handleAdFailed}
            rewardType="IMAGE_CREDIT"
          />
        )}
      </>
    );
  }

  // Default inline variant
  return (
    <>
      <Card
        className={`bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950 border-red-200 dark:border-red-800 ${className}`}
      >
        <CardContent className="p-4">{content}</CardContent>
      </Card>
      {showRewardAd && (
        <RewardVideoAd
          onAdCompleted={handleAdCompleted}
          onAdFailed={handleAdFailed}
          rewardType="IMAGE_CREDIT"
        />
      )}
    </>
  );
}
