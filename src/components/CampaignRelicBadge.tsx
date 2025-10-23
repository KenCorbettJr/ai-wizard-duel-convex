"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Crown } from "lucide-react";

interface CampaignRelicBadgeProps {
  hasRelic: boolean;
  effectiveLuckScore?: number;
  className?: string;
}

export function CampaignRelicBadge({
  hasRelic,
  effectiveLuckScore,
  className = "",
}: CampaignRelicBadgeProps) {
  if (!hasRelic) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="secondary"
            className={`bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-semibold animate-relic-award shimmer-effect relative overflow-hidden ${className}`}
          >
            <Crown className="w-3 h-3 mr-1 animate-magical-sparkle" />
            Campaign Master
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950 dark:to-amber-950 border-yellow-200 dark:border-yellow-800">
          <div className="text-sm">
            <p className="font-semibold text-amber-700 dark:text-amber-300">
              🏆 Campaign Completion Relic
            </p>
            <p className="text-amber-600 dark:text-amber-400">
              Defeated all 10 campaign opponents
            </p>
            <p className="text-green-600 dark:text-green-400">
              ✨ +1 Luck Boost (Permanent)
            </p>
            {effectiveLuckScore && (
              <p className="text-amber-500 dark:text-amber-400 font-medium">
                🎯 Effective Luck: {effectiveLuckScore}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
