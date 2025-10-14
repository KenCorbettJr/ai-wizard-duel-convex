"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Badge } from "./ui/badge";
import { Coins, Crown } from "lucide-react";

interface CreditDisplayProps {
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export function CreditDisplay({
  className = "",
  showLabel = true,
  size = "md",
}: CreditDisplayProps) {
  const { user } = useUser();

  // Get user's current credit balance
  const credits = useQuery(
    api.imageCreditService.getUserImageCredits,
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

  if (!user) {
    return null;
  }

  const isPremium =
    userInfo?.subscriptionTier === "PREMIUM" &&
    userInfo?.subscriptionStatus === "ACTIVE";

  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-2.5 py-1.5",
    lg: "text-base px-3 py-2",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabel && (
        <span className="text-sm text-muted-foreground">Credits:</span>
      )}

      <Badge
        variant={hasCreditsForDuel ? "default" : "destructive"}
        className={`flex items-center gap-1 ${sizeClasses[size]}`}
      >
        {isPremium ? (
          <>
            <Crown className={`${iconSizes[size]} text-yellow-500`} />
            <span>Unlimited</span>
          </>
        ) : (
          <>
            <Coins className={`${iconSizes[size]} text-yellow-500`} />
            <span>{credits ?? 0}</span>
          </>
        )}
      </Badge>
    </div>
  );
}
