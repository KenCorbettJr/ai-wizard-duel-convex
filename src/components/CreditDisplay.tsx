"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Badge } from "./ui/badge";
import { Coins, Sparkles } from "lucide-react";
import { useSponsorship } from "./SponsorBanner";

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
    user?.id ? {} : "skip",
  );

  // Check if user has credits for duels
  const hasCreditsForDuel = useQuery(
    api.imageCreditService.hasImageCreditsForDuel,
    user?.id ? {} : "skip",
  );

  const sponsorship = useSponsorship();

  if (!user) {
    return null;
  }

  // Still loading: a quiet placeholder, never a red "0".
  if (credits === undefined && !sponsorship?.coversYou) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span
          aria-hidden="true"
          className="h-6 w-12 animate-pulse rounded-full bg-muted motion-reduce:animate-none"
        />
      </div>
    );
  }

  const sizeClasses = {
    sm: "text-sm px-2.5 py-1",
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
        <span className="text-sm text-muted-foreground">Tokens:</span>
      )}

      <Badge
        variant={hasCreditsForDuel === false ? "destructive" : "default"}
        className={`flex items-center gap-1 ${sizeClasses[size]}`}
      >
        {sponsorship?.coversYou ? (
          <>
            <Sparkles className={`${iconSizes[size]} text-gold`} />
            <span
              title={`Duels are free, sponsored by ${sponsorship.sponsorName}`}
            >
              Free
            </span>
          </>
        ) : (
          <>
            <Coins className={`${iconSizes[size]} text-gold`} />
            <span>{credits ?? 0}</span>
          </>
        )}
      </Badge>
    </div>
  );
}
