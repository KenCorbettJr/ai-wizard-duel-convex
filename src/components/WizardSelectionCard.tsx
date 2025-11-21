"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConvexImage } from "./ConvexImage";
import { CheckCircle, Circle, Lock } from "lucide-react";
import { Crown } from "@/components/ui/crown-icon";
import type { Doc } from "../../convex/_generated/dataModel";
import Image from "next/image";

interface WizardWithProgress {
  wizard: Doc<"wizards"> & { ownerSubscriptionTier?: "FREE" | "PREMIUM" };
  progress?: Doc<"wizardCampaignProgress">;
  effectiveLuckScore?: number;
}

interface WizardSelectionCardProps {
  wizardData: WizardWithProgress;
  isSelected: boolean;
  onSelect: (wizardId: string) => void;
  showCampaignProgress?: boolean;
  campaignOpponents?: Doc<"wizards">[];
  variant?: "compact" | "detailed";
}

export function WizardSelectionCard({
  wizardData,
  isSelected,
  onSelect,
  showCampaignProgress = false,
  campaignOpponents = [],
  variant = "compact",
}: WizardSelectionCardProps) {
  const { wizard, progress, effectiveLuckScore } = wizardData;

  const defeatedCount = progress?.defeatedOpponents.length || 0;
  const nextOpponent = progress?.currentOpponent || 1;
  const isCompleted = defeatedCount === 10;

  // Get next opponent info for campaign
  const nextOpponentData = campaignOpponents.find(
    (op) => op.opponentNumber === nextOpponent
  );

  const handleClick = () => {
    onSelect(wizard._id);
  };

  if (variant === "detailed" && showCampaignProgress) {
    return (
      <Card
        className={`cursor-pointer transition-all hover:shadow-md ${isSelected
            ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950"
            : wizard.ownerSubscriptionTier === "PREMIUM"
              ? "border-2 border-purple-500/70 dark:border-purple-400/70 shadow-purple-500/20"
              : "hover:border-muted-foreground"
          }`}
        onClick={handleClick}
      >
        <CardContent className="p-4 space-y-4">
          {/* Header with wizard info */}
          <div className="flex items-center gap-3">
            {/* Wizard Image */}
            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
              {wizard.illustration ? (
                <ConvexImage
                  storageId={wizard.illustration}
                  alt={wizard.name}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              ) : wizard.illustrationURL ? (
                <Image
                  src={wizard.illustrationURL}
                  alt={wizard.name}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-bold text-xl">
                  {wizard.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Wizard Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{wizard.name}</h3>
                  {wizard.ownerSubscriptionTier === "PREMIUM" && (
                    <Badge
                      variant="default"
                      className="flex items-center gap-1 bg-purple-100/90 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 border-purple-200/50 dark:border-purple-700/30 backdrop-blur-sm font-bold text-[10px] h-5 px-1.5"
                    >
                      <Crown className="h-2.5 w-2.5" />
                      Premium
                    </Badge>
                  )}
                </div>
                <Badge variant="outline">{defeatedCount}/10 Opponents</Badge>
              </div>
              <p className="text-sm text-muted-foreground truncate mb-2">
                {wizard.description}
              </p>

              {/* Current Status */}
              {isCompleted ? (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Campaign Completed!
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <Circle className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Next: {nextOpponentData?.name || `Opponent ${nextOpponent}`}
                  </span>
                </div>
              )}
            </div>

            {/* Selection Indicator */}
            {isSelected && (
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm">✓</span>
              </div>
            )}
          </div>

          {/* Campaign Progress */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Campaign Progress:</div>
            <div className="grid grid-cols-10 gap-1">
              {Array.from({ length: 10 }, (_, i) => {
                const opponentNumber = i + 1;
                const isDefeated =
                  progress?.defeatedOpponents.includes(opponentNumber) || false;
                const isCurrent =
                  opponentNumber === nextOpponent && !isCompleted;
                const isLocked = opponentNumber > nextOpponent;

                return (
                  <div
                    key={opponentNumber}
                    className={`
                      w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                      ${isDefeated
                        ? "bg-green-500 text-white"
                        : isCurrent
                          ? "bg-blue-500 text-white ring-2 ring-blue-300"
                          : isLocked
                            ? "bg-gray-200 text-gray-400 dark:bg-gray-700"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      }
                    `}
                    title={
                      isDefeated
                        ? `Defeated Opponent ${opponentNumber}`
                        : isCurrent
                          ? `Current Opponent ${opponentNumber}`
                          : isLocked
                            ? `Locked Opponent ${opponentNumber}`
                            : `Available Opponent ${opponentNumber}`
                    }
                  >
                    {isDefeated ? (
                      <CheckCircle className="w-3 h-3" />
                    ) : isLocked ? (
                      <Lock className="w-2 h-2" />
                    ) : (
                      opponentNumber
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stats */}
          <div className="flex justify-between text-sm text-muted-foreground pt-2 border-t">
            <span>Wins: {wizard.wins || 0}</span>
            <span>Losses: {wizard.losses || 0}</span>
            {effectiveLuckScore !== undefined && (
              <span>Luck: {effectiveLuckScore}</span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Compact variant (for duels and simple selection)
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${isSelected
          ? "ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-950/50"
          : wizard.ownerSubscriptionTier === "PREMIUM"
            ? "border-2 border-purple-500/70 dark:border-purple-400/70 shadow-purple-500/20"
            : "hover:border-muted-foreground"
        }`}
      onClick={handleClick}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {/* Wizard Image */}
          <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
            {wizard.illustration ? (
              <ConvexImage
                storageId={wizard.illustration}
                alt={wizard.name}
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            ) : wizard.illustrationURL ? (
              <Image
                src={wizard.illustrationURL}
                alt={wizard.name}
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                {wizard.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Wizard Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="font-medium text-foreground">{wizard.name}</h4>
              {wizard.ownerSubscriptionTier === "PREMIUM" && (
                <Crown className="h-3 w-3 text-purple-500 dark:text-purple-400" />
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {wizard.description}
            </p>
            {showCampaignProgress && !isCompleted && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Next: {nextOpponentData?.name || `Opponent ${nextOpponent}`}
              </p>
            )}
          </div>

          {/* Stats and Selection */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {showCampaignProgress ? (
              <Badge variant="outline" className="text-xs">
                {defeatedCount}/10
              </Badge>
            ) : wizard.wins || wizard.losses ? (
              <Badge variant="outline">
                {wizard.wins || 0}W - {wizard.losses || 0}L
              </Badge>
            ) : (
              <Badge variant="secondary">New</Badge>
            )}

            {isSelected && (
              <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
