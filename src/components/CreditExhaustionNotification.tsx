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
    user?.id ? { userId: user.id } : "skip",
  );

  // Check if user has credits for duels
  const hasCreditsForDuel = useQuery(
    api.imageCreditService.hasImageCreditsForDuel,
    user?.id ? { userId: user.id } : "skip",
  );

  // Get user info to check if premium
  const userInfo = useQuery(
    api.users.getUserByClerkId,
    user?.id ? { clerkId: user.id } : "skip",
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
      // Navigate to Clerk checkout for the specific plan
      const checkoutUrl = `https://checkout.clerk.com/plan/cplan_30kNnUiaUJomHTdauIDaRMldR5F`;
      window.open(checkoutUrl, "_blank");
    }
  };

  // Don't show if user has credits or is premium
  if (!user || hasCreditsForDuel || isPremium) {
    return null;
  }

  const content = (
    <div className="flex items-start gap-3">
      <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
      <div className="space-y-3 flex-1">
        <div>
          <h4 className="font-semibold text-destructive mb-1">
            Out of Image Credits!
          </h4>
          <p className="text-sm text-destructive">
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
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
            >
              <Play className="h-4 w-4 mr-2" />
              Watch Ad (+1 Credit)
            </Button>
          )}
          <Button onClick={handleUpgrade} size="sm">
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
          className="text-destructive hover:text-destructive"
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
          className={`bg-linear-to-r from-destructive/20 to-warning/20 border-l-4 border-destructive p-4 ${className}`}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-md mx-4 bg-linear-to-r from-destructive/20 to-warning/20 border-destructive/40">
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
        className={`bg-linear-to-r from-destructive/20 to-warning/20 border-destructive/40 ${className}`}
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
