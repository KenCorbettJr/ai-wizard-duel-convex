"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Lock, CheckCircle, Swords, Star, Zap, Shield } from "lucide-react";
import { ConvexImage } from "@/components/ConvexImage";
import type { Doc } from "../../convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Id } from "../../convex/_generated/dataModel";

interface CampaignOpponentCardProps {
  opponent: Doc<"wizards">;
  isUnlocked: boolean;
  isDefeated: boolean;
  isCurrent?: boolean;
  onSelectOpponent?: (opponentNumber: number) => void;
  className?: string;
  wizardId?: string; // The player's wizard ID for starting battles
}

export function CampaignOpponentCard({
  opponent,
  isUnlocked,
  isDefeated,
  isCurrent = false,
  onSelectOpponent,
  className = "",
  wizardId,
}: CampaignOpponentCardProps) {
  const router = useRouter();
  const [isStartingBattle, setIsStartingBattle] = useState(false);
  const startCampaignBattle = useMutation(api.campaigns.startCampaignBattle);
  const getDifficultyConfig = (difficulty: string) => {
    switch (difficulty) {
      case "BEGINNER":
        return {
          color: "bg-success/15 text-success",
          icon: Shield,
          description: "Easier opponent with reduced luck",
        };
      case "INTERMEDIATE":
        return {
          color: "bg-warning/15 text-warning",
          icon: Star,
          description: "Balanced opponent with standard luck",
        };
      case "ADVANCED":
        return {
          color: "bg-destructive/15 text-destructive",
          icon: Zap,
          description: "Challenging opponent with increased luck",
        };
      default:
        return {
          color: "bg-muted text-foreground",
          icon: Star,
          description: "Unknown difficulty",
        };
    }
  };

  const getLuckModifierDisplay = (modifier: number) => {
    if (modifier > 0)
      return { text: `+${modifier}`, color: "text-destructive" };
    if (modifier < 0)
      return {
        text: `${modifier}`,
        color: "text-success",
      };
    return { text: "±0", color: "text-foreground" };
  };

  const difficultyConfig = getDifficultyConfig(
    opponent.difficulty || "BEGINNER",
  );
  const DifficultyIcon = difficultyConfig.icon;
  const luckDisplay = getLuckModifierDisplay(opponent.luckModifier || 0);

  const getCardState = () => {
    if (isDefeated) {
      return {
        className: "border-success/40 bg-success/10 animate-fade-in",
        cursor: "cursor-default",
        opacity: "opacity-75",
      };
    }
    if (isCurrent && isUnlocked) {
      return {
        className:
          "border-info/40 bg-info/10 ring-2 ring-info/40 animate-campaign-glow campaign-card-hover",
        cursor: "cursor-pointer",
        opacity: "opacity-100",
      };
    }
    if (isUnlocked) {
      return {
        className:
          "border-primary/30 hover:border-primary/50 campaign-card-hover animate-campaign-unlock",
        cursor: "cursor-pointer",
        opacity: "opacity-100",
      };
    }
    return {
      className: "border-border grayscale",
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

  const handleBattleNow = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click

    if (!wizardId || !opponent.opponentNumber) {
      toast.error("Missing wizard or opponent information");
      return;
    }

    setIsStartingBattle(true);
    try {
      const battleResult = await startCampaignBattle({
        wizardId: wizardId as Id<"wizards">,
        opponentNumber: opponent.opponentNumber,
      });

      // Navigate to the duel
      router.push(`/duels/${battleResult.duelId}`);
    } catch (error) {
      console.error("Failed to start campaign battle:", error);
      toast.error(
        error instanceof Error ? error.message : "An unexpected error occurred",
      );
    } finally {
      setIsStartingBattle(false);
    }
  };

  return (
    <TooltipProvider>
      <Card
        className={`
          transition-all duration-200 ${cardState.className} ${cardState.cursor} ${cardState.opacity} ${className}
        `}
        onClick={handleClick}
        role="button"
        tabIndex={isUnlocked ? 0 : -1}
        aria-disabled={!isUnlocked}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  #{opponent.opponentNumber}
                </span>
                {isDefeated && <CheckCircle className="w-4 h-4 text-success" />}
                {!isUnlocked && (
                  <Lock className="w-4 h-4 text-muted-foreground" />
                )}
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
          {/* Opponent Image */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-primary/30">
              {opponent.illustration ? (
                <ConvexImage
                  storageId={opponent.illustration}
                  alt={opponent.name}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-linear-to-br from-primary/15 to-gold/60 text-primary text-xl font-bold flex items-center justify-center">
                  {opponent.name.charAt(0)}
                </div>
              )}
            </div>
          </div>

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
              <div className="flex items-center gap-2 text-success text-sm font-medium">
                <CheckCircle className="w-4 h-4" />
                Defeated
              </div>
            ) : !isUnlocked ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Lock className="w-4 h-4" />
                Locked
              </div>
            ) : isCurrent ? (
              <Button
                size="sm"
                className="w-full"
                onClick={handleBattleNow}
                disabled={isStartingBattle || !wizardId}
              >
                <Swords className="w-4 h-4 mr-2" />
                {isStartingBattle ? "Starting..." : "Battle Now"}
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
