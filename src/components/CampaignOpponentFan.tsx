"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { CheckCircle, Lock, Star, Zap, Shield, Crown } from "lucide-react";
import { ConvexImage } from "@/components/ConvexImage";
import type { Doc } from "../../convex/_generated/dataModel";

interface CampaignOpponentFanProps {
  opponents: Doc<"wizards">[];
  selectedWizardProgress?: {
    defeatedOpponents: number[];
    currentOpponent: number;
    hasCompletionRelic: boolean;
  };
  className?: string;
}

export function CampaignOpponentFan({
  opponents,
  selectedWizardProgress,
  className = "",
}: CampaignOpponentFanProps) {
  const getDifficultyConfig = (difficulty: string) => {
    switch (difficulty) {
      case "BEGINNER":
        return {
          color: "bg-green-500",
          icon: Shield,
        };
      case "INTERMEDIATE":
        return {
          color: "bg-yellow-500",
          icon: Star,
        };
      case "ADVANCED":
        return {
          color: "bg-red-500",
          icon: Zap,
        };
      default:
        return {
          color: "bg-gray-500",
          icon: Star,
        };
    }
  };

  const getOpponentStatus = (opponentNumber: number) => {
    if (!selectedWizardProgress) {
      return {
        isUnlocked: opponentNumber === 1,
        isDefeated: false,
        isCurrent: opponentNumber === 1,
      };
    }

    const isDefeated =
      selectedWizardProgress.defeatedOpponents.includes(opponentNumber);
    const isCurrent = selectedWizardProgress.currentOpponent === opponentNumber;
    const isUnlocked = isCurrent || isDefeated;

    return { isUnlocked, isDefeated, isCurrent };
  };

  // Sort opponents by opponent number
  const sortedOpponents = [...opponents].sort(
    (a, b) => (a.opponentNumber || 0) - (b.opponentNumber || 0)
  );

  return (
    <TooltipProvider>
      <div className={`relative w-full overflow-hidden ${className}`}>
        {/* Background gradient */}
        <div className="absolute inset-0 bg-linear-to-b from-purple-50 to-transparent dark:from-purple-950/20 dark:to-transparent rounded-lg" />

        {/* Fan container */}
        <div className="relative flex items-center justify-center py-8 px-4">
          <div className="relative w-full max-w-6xl">
            {/* Cards arranged in a fan */}
            <div className="relative h-48 flex items-center justify-center">
              {sortedOpponents.map((opponent, index) => {
                if (!opponent.opponentNumber) return null;

                const status = getOpponentStatus(opponent.opponentNumber);
                const difficultyConfig = getDifficultyConfig(
                  opponent.difficulty || "BEGINNER"
                );
                const DifficultyIcon = difficultyConfig.icon;

                // Calculate fan positioning
                const totalCards = sortedOpponents.length;
                const centerIndex = (totalCards - 1) / 2;
                const offsetFromCenter = index - centerIndex;

                // Fan spread calculations
                const maxRotation = 25; // degrees
                const maxTranslateX = 120; // pixels
                const maxTranslateY = 30; // pixels

                const rotation = (offsetFromCenter / centerIndex) * maxRotation;
                const translateX =
                  (offsetFromCenter / centerIndex) * maxTranslateX;
                const translateY =
                  Math.abs(offsetFromCenter / centerIndex) * maxTranslateY;

                // Z-index for layering (center cards on top)
                const zIndex = totalCards - Math.abs(offsetFromCenter);

                // Card state styling
                let cardClasses =
                  "transition-all duration-300 hover:scale-110 hover:z-50 animate-fan-card-entrance animate-fan-card-float";
                let opacity = "opacity-100";

                if (status.isDefeated) {
                  cardClasses += " ring-2 ring-green-400 animate-fan-glow";
                } else if (status.isCurrent) {
                  cardClasses +=
                    " ring-2 ring-blue-400 animate-pulse animate-fan-glow";
                } else if (!status.isUnlocked) {
                  opacity = "opacity-40 grayscale";
                }

                // Add entrance delay based on position
                const entranceDelay = `${index * 0.1}s`;

                return (
                  <Tooltip key={opponent._id}>
                    <TooltipTrigger asChild>
                      <div
                        className={`absolute ${cardClasses} ${opacity}`}
                        style={{
                          transform: `translateX(${translateX}px) translateY(${translateY}px) rotate(${rotation}deg)`,
                          zIndex,
                          animationDelay: entranceDelay,
                          animationFillMode: "both",
                        }}
                      >
                        {/* Card - Made larger to accommodate bigger images */}
                        <div className="w-36 h-44 bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 border-gray-200 dark:border-gray-700 overflow-hidden relative">
                          {/* Magical sparkle overlay for special states */}
                          {(status.isDefeated || status.isCurrent) && (
                            <div className="absolute inset-0 pointer-events-none">
                              <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full animate-magical-sparkle opacity-60" />
                              <div
                                className="absolute bottom-2 left-2 w-1 h-1 bg-purple-400 rounded-full animate-magical-sparkle opacity-80"
                                style={{ animationDelay: "0.5s" }}
                              />
                              <div
                                className="absolute top-3 left-1 w-1.5 h-1.5 bg-blue-400 rounded-full animate-magical-sparkle opacity-70"
                                style={{ animationDelay: "1s" }}
                              />
                            </div>
                          )}
                          {/* Card header with opponent number */}
                          <div className="relative h-8 bg-linear-to-r from-purple-500 to-indigo-500 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">
                              #{opponent.opponentNumber}
                            </span>

                            {/* Status indicators */}
                            <div className="absolute right-1 top-1">
                              {status.isDefeated && (
                                <CheckCircle className="w-3 h-3 text-green-400" />
                              )}
                              {!status.isUnlocked && (
                                <Lock className="w-3 h-3 text-gray-400" />
                              )}
                            </div>
                          </div>

                          {/* Avatar - Made larger and more prominent */}
                          <div className="flex justify-center pt-1">
                            <Avatar className="w-16 h-16 rounded-lg border-2 border-purple-200 dark:border-purple-700">
                              {opponent.illustration ? (
                                <ConvexImage
                                  storageId={opponent.illustration}
                                  alt={opponent.name}
                                  width={64}
                                  height={64}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <AvatarFallback className="bg-linear-to-br from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-800 text-purple-600 dark:text-purple-400 text-lg font-bold rounded-lg">
                                  {opponent.name.charAt(0)}
                                </AvatarFallback>
                              )}
                            </Avatar>
                          </div>

                          {/* Name */}
                          <div className="px-2 pt-1">
                            <h3 className="text-xs font-semibold text-center truncate">
                              {opponent.name}
                            </h3>
                          </div>

                          {/* Difficulty badge */}
                          <div className="flex justify-center pt-1">
                            <div
                              className={`${difficultyConfig.color} rounded-full p-1`}
                            >
                              <DifficultyIcon className="w-3 h-3 text-white" />
                            </div>
                          </div>

                          {/* Bottom section */}
                          <div className="absolute bottom-1 left-1 right-1 flex justify-center">
                            {status.isDefeated &&
                              selectedWizardProgress?.hasCompletionRelic &&
                              index === sortedOpponents.length - 1 && (
                                <Crown className="w-4 h-4 text-yellow-500" />
                              )}
                          </div>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <div className="space-y-2">
                        <div className="font-semibold">{opponent.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {opponent.description}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={`${getDifficultyConfig(opponent.difficulty || "BEGINNER").color} text-white`}
                          >
                            <DifficultyIcon className="w-3 h-3 mr-1" />
                            {opponent.difficulty}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {opponent.luckModifier &&
                              opponent.luckModifier > 0 &&
                              "+"}
                            {opponent.luckModifier || 0} Luck
                          </Badge>
                        </div>
                        <div className="text-xs">
                          <strong>Style:</strong> {opponent.spellStyle}
                        </div>
                        {status.isDefeated && (
                          <div className="text-green-600 dark:text-green-400 text-xs font-medium">
                            ✓ Defeated
                          </div>
                        )}
                        {status.isCurrent && !status.isDefeated && (
                          <div className="text-blue-600 dark:text-blue-400 text-xs font-medium">
                            → Current Challenge
                          </div>
                        )}
                        {!status.isUnlocked && (
                          <div className="text-gray-500 text-xs">🔒 Locked</div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        </div>

        {/* Title overlay */}
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10">
          <div className="text-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-purple-200 dark:border-purple-700">
            <h2 className="text-lg font-bold text-purple-700 dark:text-purple-300 flex items-center gap-2 justify-center">
              <Star className="w-5 h-5 text-yellow-500" />
              Campaign Opponents
              <Star className="w-5 h-5 text-yellow-500" />
            </h2>
            <p className="text-sm text-purple-600 dark:text-purple-400">
              10 Legendary Challengers Await
            </p>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
