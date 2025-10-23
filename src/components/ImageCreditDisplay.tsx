"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Coins,
  Play,
  Clock,
  Gift,
  AlertTriangle,
  Crown,
  TrendingUp,
} from "lucide-react";
import { RewardVideoAd } from "./RewardVideoAd";

interface ImageCreditDisplayProps {
  className?: string;
  showHistory?: boolean;
  showExhaustionNotification?: boolean;
  onUpgradeClick?: () => void;
}

export function ImageCreditDisplay({
  className = "",
  showHistory = false,
  showExhaustionNotification = true,
  onUpgradeClick,
}: ImageCreditDisplayProps) {
  const { user } = useUser();
  const [showRewardAd, setShowRewardAd] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [previousCredits, setPreviousCredits] = useState<number | null>(null);

  // Get user's current credit balance
  const credits = useQuery(
    api.imageCreditService.getUserImageCredits,
    user?.id ? { userId: user.id } : "skip"
  );

  // Check if user can earn credits from ads
  const adCooldown = useQuery(
    api.imageCreditService.canEarnCreditFromAd,
    user?.id ? { userId: user.id } : "skip"
  );

  // Get credit history if requested
  const creditHistory = useQuery(
    api.imageCreditService.getImageCreditHistory,
    showHistory && user?.id ? { userId: user.id, limit: 10 } : "skip"
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

  // Credit celebration effect
  useEffect(() => {
    if (
      credits !== undefined &&
      previousCredits !== null &&
      credits > previousCredits
    ) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 3000);
      return () => clearTimeout(timer);
    }
    if (credits !== undefined) {
      setPreviousCredits(credits);
    }
  }, [credits, previousCredits]);

  const handleWatchAd = () => {
    setShowRewardAd(true);
  };

  const handleAdCompleted = () => {
    setShowRewardAd(false);
    // Credits will be updated automatically via the mutation
  };

  const handleAdFailed = () => {
    setShowRewardAd(false);
  };

  if (!user) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            Sign in to view your image credits
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatTimeRemaining = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const isPremium =
    userInfo?.subscriptionTier === "PREMIUM" &&
    userInfo?.subscriptionStatus === "ACTIVE";

  const handleUpgrade = () => {
    if (onUpgradeClick) {
      onUpgradeClick();
    } else {
      // Navigate to Clerk checkout for the specific plan
      const checkoutUrl = `https://checkout.clerk.com/plan/cplan_30kNnUiaUJomHTdauIDaRMldR5F`;
      window.open(checkoutUrl, "_blank");
    }
  };

  return (
    <>
      <Card
        className={`${className} ${showCelebration ? "ring-2 ring-green-500 ring-opacity-50" : ""} transition-all duration-300`}
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            {isPremium ? (
              <Crown className="h-5 w-5 text-yellow-500" />
            ) : (
              <Coins
                className={`h-5 w-5 text-yellow-500 ${showCelebration ? "animate-bounce" : ""}`}
              />
            )}
            Image Credits
            {isPremium ? (
              <Badge
                variant="default"
                className="bg-gradient-to-r from-purple-500 to-blue-500"
              >
                <Crown className="h-3 w-3 mr-1" />
                Unlimited
              </Badge>
            ) : (
              <Badge
                variant={hasCreditsForDuel ? "default" : "destructive"}
                className={showCelebration ? "animate-pulse" : ""}
              >
                {credits ?? 0}
              </Badge>
            )}
            {showCelebration && (
              <div className="flex items-center gap-1 text-green-600 animate-fade-in">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-medium">+1</span>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Credit Status */}
          <div className="text-sm">
            {isPremium ? (
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                <Crown className="h-4 w-4" />
                <span className="font-medium">
                  Premium: Unlimited image generation
                </span>
              </div>
            ) : hasCreditsForDuel ? (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <Coins className="h-4 w-4" />
                <span>Ready for image generation</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">No credits remaining</span>
              </div>
            )}
          </div>

          {/* Credit Exhaustion Notification */}
          {!isPremium && !hasCreditsForDuel && showExhaustionNotification && (
            <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <h4 className="font-medium text-red-800 dark:text-red-200">
                    Out of Image Credits!
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    You&apos;ve used all your image generation credits. Your
                    duels will continue in text-only mode until you get more
                    credits.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 mt-3">
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
              </div>
            </div>
          )}

          {/* Watch Ad Button */}
          {!isPremium && adCooldown && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground font-medium">
                Earn Free Credits
              </div>
              {adCooldown.canEarn ? (
                <Button
                  onClick={handleWatchAd}
                  variant="outline"
                  size="sm"
                  className="w-full border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-950"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Watch Ad for 1 Credit
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled className="w-full">
                  <Clock className="h-4 w-4 mr-2" />
                  Next ad in {formatTimeRemaining(adCooldown.cooldownRemaining)}
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                Watch a short video to earn 1 image credit. Available every 5
                minutes.
              </p>
            </div>
          )}

          {/* Credit History */}
          {showHistory && creditHistory && creditHistory.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Recent Activity</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {creditHistory.map((transaction) => (
                  <div
                    key={transaction._id}
                    className="flex items-center justify-between text-xs p-2 bg-muted rounded"
                  >
                    <div className="flex items-center gap-2">
                      {transaction.type === "EARNED" && (
                        <Gift className="h-3 w-3 text-green-500" />
                      )}
                      {transaction.type === "CONSUMED" && (
                        <Coins className="h-3 w-3 text-blue-500" />
                      )}
                      {transaction.type === "GRANTED" && (
                        <Gift className="h-3 w-3 text-purple-500" />
                      )}
                      <span>
                        {transaction.type === "EARNED" && "+"}
                        {transaction.type === "CONSUMED" && "-"}
                        {transaction.type === "GRANTED" && "+"}
                        {transaction.amount}
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      {transaction.source === "AD_REWARD" && "Ad Reward"}
                      {transaction.source === "SIGNUP_BONUS" && "Welcome Bonus"}
                      {transaction.source === "ADMIN_GRANT" && "Admin Grant"}
                      {transaction.source === "PREMIUM_GRANT" && "Premium"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Premium Upgrade Prompt */}
          {!isPremium && hasCreditsForDuel && (
            <div className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 border border-purple-200 dark:border-purple-800 rounded-lg">
              <div className="flex items-start gap-2">
                <Crown className="h-4 w-4 text-purple-600 dark:text-purple-400 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm text-purple-700 dark:text-purple-300 font-medium">
                    Upgrade to Premium
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-400">
                    Get unlimited image generation, advanced wizard
                    customization, and exclusive features!
                  </p>
                  <Button
                    size="sm"
                    onClick={handleUpgrade}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade Now
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reward Ad Modal */}
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
