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
            className={`bg-linear-to-r from-warning to-gold text-gold-foreground font-semibold animate-relic-award shimmer-effect relative overflow-hidden ${className}`}
          >
            <Crown className="w-3 h-3 mr-1 animate-magical-sparkle" />
            Campaign Master
            <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="bg-linear-to-r from-warning/20 to-gold/10 border-warning/40">
          <div className="text-sm">
            <p className="font-semibold text-warning">
              🏆 Campaign Completion Relic
            </p>
            <p className="text-warning">Defeated all 10 campaign opponents</p>
            <p className="text-success">✨ +1 Luck Boost (Permanent)</p>
            {effectiveLuckScore && (
              <p className="text-warning font-medium">
                🎯 Effective Luck: {effectiveLuckScore}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
