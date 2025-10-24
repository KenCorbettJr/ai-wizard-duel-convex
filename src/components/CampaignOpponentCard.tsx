"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Lock, CheckCircle, Swords, Star, Zap, Shield } from "lucide-react";
import type { Doc } from "../../convex/_generated/dataModel";

interface CampaignOpponentCardProps {
  opponent: Doc<"wizards">;
  isUnlocked: boolean;
  isDefeated: boolean;
  isCurrent?: boolean;
  onSelectOpponent?: (opponentNumber: number) => void;
  className?: string;
}

export function CampaignOpponentCard({
  opponent,
  isUnlocked,
  isDefeated,
  isCurrent = false,
  onSelectOpponent,
  className = "",
}: CampaignOpponentCardProps) {
  const getDifficultyConfig = (difficulty: string) => {
    switch (difficulty) {
      case "BEGINNER":
        return {
          color:
            "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
          icon: Shield,
          description: "Easier opponent with reduced luck",
        };
      case "INTERMEDIATE":
        return {
          color:
            "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
          icon: Star,
          description: "Balanced opponent with standard luck",
        };
      case "ADVANCED":
        return {
          color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
          icon: Zap,
          description: "Challenging opponent with increased luck",
        };
      default:
        return {
          color:
            "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
          icon: Star,
          description: "Unknown difficulty",
        };
    }
  };

  const getLuckModifierDisplay = (modifier: number) => {
    if (modifier > 0)
      return { text: `+${modifier}`, color: "text-red-600 dark:text-red-400" };
    if (modifier < 0)
      return {
        text: `${modifier}`,
        color: "text-green-600 dark:text-green-400",
      };
    return { text: "±0", color: "text-gray-600 dark:text-gray-400" };
  };

  const difficultyConfig = getDifficultyConfig(
    opponent.difficulty || "BEGINNER"
  );
  const DifficultyIcon = difficultyConfig.icon;
  const luckDisplay = getLuckModifierDisplay(opponent.luckModifier || 0);

  const getCardState = () => {
    if (isDefeated) {
      return {
        className:
          "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 animate-fade-in",
        cursor: "cursor-default",
        opacity: "opacity-75",
      };
    }
    if (isCurrent && isUnlocked) {
      return {
        className:
          "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950 ring-2 ring-blue-300 animate-campaign-glow campaign-card-hover",
        cursor: "cursor-pointer",
        opacity: "opacity-100",
      };
    }
    if (isUnlocked) {
      return {
        className:
          "border-purple-200 hover:border-purple-300 dark:border-purple-700 dark:hover:border-purple-600 campaign-card-hover animate-campaign-unlock",
        cursor: "cursor-pointer",
        opacity: "opacity-100",
      };
    }
    return {
      className: "border-gray-200 dark:border-gray-700 grayscale",
      cursor: "cursor-not-allowed",
      opacity: "opacity-50",
    };
  };

  const cardState = getCardState();

  const handleClick = () => {
    if (isUnlocked && !isDefeated && onSelectOpponent) {
      onSelectOpponent(opponent.opponentNumber!);
    }
  };

  return (
    <TooltipProvider>
      <Card
        className={`
          transition-all duration-200 ${cardState.className} ${cardState.cursor} ${cardState.opacity} ${className}
        `}
        onClick={handleClick}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  #{opponent.opponentNumber}
                </span>
                {isDefeated && (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )}
                {!isUnlocked && <Lock className="w-4 h-4 text-gray-400" />}
              </div>
              <CardTitle className="text-lg leading-tight">
                {opponent.name}
              </CardTitle>
            </div>

            <div className="flex flex-col items-end gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    className={`${difficultyConfig.color} flex items-center gap-1`}
                  >
                    <DifficultyIcon className="w-3 h-3" />
                    {opponent.difficulty}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{difficultyConfig.description}</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs">
                    <span className={luckDisplay.color}>
                      {luckDisplay.text} Luck
                    </span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Luck modifier: {luckDisplay.text}</p>
                  <p className="text-xs text-muted-foreground">
                    {(opponent.luckModifier || 0) > 0 &&
                      "This opponent has increased luck"}
                    {(opponent.luckModifier || 0) < 0 &&
                      "This opponent has reduced luck"}
                    {opponent.luckModifier === 0 &&
                      "This opponent has standard luck"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-3">
            {opponent.description}
          </p>

          {/* Spell Style */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Spell Style
            </div>
            <Badge variant="secondary" className="text-xs">
              {opponent.spellStyle}
            </Badge>
          </div>

          {/* Personality Traits */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Personality
            </div>
            <div className="flex flex-wrap gap-1">
              {opponent.personalityTraits?.slice(0, 3).map((trait, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {trait}
                </Badge>
              ))}
              {(opponent.personalityTraits?.length || 0) > 3 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs cursor-help">
                      +{(opponent.personalityTraits?.length || 0) - 3} more
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1">
                      {opponent.personalityTraits
                        ?.slice(3)
                        ?.map((trait, index) => (
                          <div key={index} className="text-xs">
                            {trait}
                          </div>
                        ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            {isDefeated ? (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium">
                <CheckCircle className="w-4 h-4" />
                Defeated
              </div>
            ) : !isUnlocked ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Lock className="w-4 h-4" />
                Locked
              </div>
            ) : isCurrent ? (
              <Button size="sm" className="w-full">
                <Swords className="w-4 h-4 mr-2" />
                Challenge Now
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="w-full">
                View Details
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
