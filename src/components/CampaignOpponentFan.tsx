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
import useEmblaCarousel from "embla-carousel-react";
import { useEffect, useState } from "react";

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
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: "center",
    containScroll: "trimSnaps",
  });

  const getDifficultyConfig = (difficulty: string) => {
    switch (difficulty) {
      case "BEGINNER":
        return {
          color: "bg-success",
          icon: Shield,
        };
      case "INTERMEDIATE":
        return {
          color: "bg-warning",
          icon: Star,
        };
      case "ADVANCED":
        return {
          color: "bg-destructive",
          icon: Zap,
        };
      default:
        return {
          color: "bg-muted-foreground/60",
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
    (a, b) => (a.opponentNumber || 0) - (b.opponentNumber || 0),
  );

  // Scroll to current opponent on mount
  useEffect(() => {
    if (emblaApi && selectedWizardProgress) {
      const currentIndex = sortedOpponents.findIndex(
        (op) => op.opponentNumber === selectedWizardProgress.currentOpponent,
      );
      if (currentIndex !== -1) {
        emblaApi.scrollTo(currentIndex);
      }
    }
  }, [emblaApi, selectedWizardProgress, sortedOpponents]);

  return (
    <TooltipProvider>
      <div className={`w-full flex flex-col items-center ${className}`}>
        {/* Top Badge/Card - "Campaign Opponents" */}
        <div className="z-20 mb-6 relative">
          <div className="bg-card rounded-xl shadow-lg border border-primary/30 px-8 py-3 flex flex-col items-center justify-center min-w-[320px]">
            <div className="flex items-center gap-3 mb-1">
              <Star className="w-5 h-5 text-gold fill-warning" />
              <h2 className="text-xl font-bold text-primary">
                Campaign Opponents
              </h2>
              <Star className="w-5 h-5 text-gold fill-warning" />
            </div>
            <p className="text-sm text-primary font-medium">
              10 Legendary Challengers Await
            </p>
          </div>
        </div>

        {/* Embla Carousel Container */}
        <div className="h-96 m-12"></div>
        <div
          className="w-full overflow-hidden px-4 py-12 absolute left-0 right-0"
          ref={emblaRef}
        >
          <div className="flex touch-pan-y touch-pinch-zoom -ml-4">
            {sortedOpponents.map((opponent, index) => {
              if (!opponent.opponentNumber) return null;

              const status = getOpponentStatus(opponent.opponentNumber);
              const difficultyConfig = getDifficultyConfig(
                opponent.difficulty || "BEGINNER",
              );
              const DifficultyIcon = difficultyConfig.icon;

              // Card state styling
              const cardClasses =
                "transition-all duration-300 hover:scale-105 hover:-translate-y-2 relative group h-full";
              let opacity = "opacity-100";
              let borderClass = "border-transparent";

              if (status.isDefeated) {
                borderClass = "border-success/40";
              } else if (status.isCurrent) {
                borderClass = "border-primary";
              } else if (!status.isUnlocked) {
                opacity = "opacity-50 grayscale";
                borderClass = "border-border";
              }

              return (
                <div
                  className="pl-4 flex-[0_0_auto] min-w-0"
                  key={opponent._id}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={`${cardClasses} ${opacity}`}>
                        {/* Card Container */}
                        <div
                          className={`w-64 h-96 rounded-2xl overflow-hidden relative shadow-xl bg-card border-2 ${borderClass}`}
                        >
                          {/* Full Background Image */}
                          <div className="absolute inset-0">
                            {opponent.illustration ? (
                              <ConvexImage
                                storageId={opponent.illustration}
                                alt={opponent.name}
                                width={400}
                                height={600}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              />
                            ) : (
                              <div className="w-full h-full bg-linear-to-br from-primary to-card flex items-center justify-center">
                                <span className="text-6xl">🧙‍♂️</span>
                              </div>
                            )}
                            {/* Gradient Overlay for text readability */}
                            <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent" />
                          </div>

                          {/* Top Status Badge */}
                          <div className="absolute top-3 right-3 z-20">
                            {status.isDefeated && (
                              <div className="bg-success text-success-foreground p-1.5 rounded-full shadow-lg">
                                <CheckCircle className="w-5 h-5" />
                              </div>
                            )}
                            {!status.isUnlocked && (
                              <div className="bg-background/80 backdrop-blur-sm text-muted-foreground p-1.5 rounded-full">
                                <Lock className="w-5 h-5" />
                              </div>
                            )}
                            {status.isCurrent && (
                              <div className="bg-primary text-white p-1.5 rounded-full shadow-lg animate-pulse">
                                <Zap className="w-5 h-5" />
                              </div>
                            )}
                          </div>

                          {/* Opponent Number Badge */}
                          <div className="absolute top-3 left-3 z-20">
                            <div className="bg-black/60 backdrop-blur-md border border-white/20 text-white px-2.5 py-1 rounded-lg font-bold text-sm">
                              #{opponent.opponentNumber}
                            </div>
                          </div>

                          {/* Bottom Content */}
                          <div className="absolute bottom-0 left-0 right-0 p-5 z-20">
                            <h3 className="text-white font-bold text-xl leading-tight mb-2 drop-shadow-md">
                              {opponent.name}
                            </h3>

                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Badge
                                className={`${difficultyConfig.color} text-white border-none`}
                              >
                                {opponent.difficulty}
                              </Badge>
                              {opponent.luckModifier &&
                                opponent.luckModifier > 0 && (
                                  <Badge
                                    variant="outline"
                                    className="text-warning border-warning/50 bg-warning/10"
                                  >
                                    +{opponent.luckModifier} Luck
                                  </Badge>
                                )}
                            </div>
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
                        <div className="text-xs">
                          <strong>Style:</strong> {opponent.spellStyle}
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
