"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Star, Heart, Award, Scroll, Swords } from "lucide-react";
import { Crown } from "@/components/ui/crown-icon";
import { ConvexImage } from "@/components/ConvexImage";
import { PortraitPainting } from "@/components/PortraitPainting";
import { usePortraitStage } from "@/hooks/usePortraitStage";
import { UserIdDisplay } from "@/components/UserIdDisplay";
import { Id } from "../../convex/_generated/dataModel";
import { memo } from "react";

interface WizardCardProps {
  wizard: {
    _id: Id<"wizards">;
    name: string;
    description: string;
    illustration?: string; // This is a storage ID string, not Id<"_storage">
    illustrationStatus?: "sketching" | "painting" | "failed";
    illustrationRequestedAt?: number;
    ownerUserId?: string;
    ownerDisplayName?: string;
    hasCompletionRelic?: boolean;
    effectiveLuckScore?: number;
  };
  points?: number;
  hitPoints?: number;
  maxHitPoints?: number;
  className?: string;
  isUserWizard?: boolean;
  isWinner?: boolean;
  showOwner?: boolean;
  showActions?: boolean;
}

export const WizardCard = memo(function WizardCard({
  wizard,
  points,
  hitPoints,
  maxHitPoints = 100,
  className = "",
  isUserWizard = false,
  isWinner = false,
  showOwner = false,
  showActions = false,
}: WizardCardProps) {
  const portraitStage = usePortraitStage(wizard);

  const getBorderClasses = () => {
    if (isWinner) {
      return "border-4 border-warning/40 ring-4 ring-warning/30 shadow-warning/20";
    }
    if (isUserWizard) {
      return "border-2 border-info/70 ring-2 ring-info/20";
    }
    return "border-border/50";
  };

  return (
    <div className={`flex flex-1 flex-col ${className}`}>
      <Card
        className={`overflow-hidden bg-card/90 backdrop-blur-sm shadow-lg dark:shadow-xl hover:shadow-xl dark:hover:shadow-2xl transition-all duration-300 group cursor-pointer hover:scale-[1.02] flex-1 pt-0 flex ${getBorderClasses()}`}
      >
        <Link
          href={`/wizards/${wizard._id}`}
          aria-label={`View ${wizard.name}`}
          className="absolute inset-0 z-10 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div className="relative">
          {portraitStage ? (
            <div className="h-96 w-full overflow-hidden">
              <PortraitPainting
                stage={portraitStage}
                name={wizard.name}
                backdropStorageId={wizard.illustration}
                compact
              />
            </div>
          ) : (
            wizard.illustration && (
              <div className="h-96 w-full overflow-hidden">
                <ConvexImage
                  storageId={wizard.illustration}
                  alt={wizard.name}
                  width={768}
                  height={480}
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            )
          )}
          <div className="absolute top-4 right-4 flex gap-2">
            {wizard.hasCompletionRelic && (
              <Badge
                variant="default"
                className="flex items-center gap-1 bg-primary text-primary-foreground border-primary/50 backdrop-blur-sm font-bold"
                title={`Campaign Relic (+1 Luck, Effective Luck: ${wizard.effectiveLuckScore || 11})`}
              >
                <Award className="h-3 w-3" />
                Relic
              </Badge>
            )}
            {isWinner && (
              <Badge
                variant="default"
                className="flex items-center gap-1 bg-warning/90 text-warning-foreground border-warning/50 backdrop-blur-sm font-bold"
              >
                <Crown className="h-3 w-3" />
                Winner
              </Badge>
            )}
            {isUserWizard && !isWinner && (
              <Badge
                variant="default"
                className="flex items-center gap-1 bg-info/90 text-info-foreground border-info/50 backdrop-blur-sm font-semibold"
              >
                Your Wizard
              </Badge>
            )}
          </div>
        </div>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl text-foreground">
                {wizard.name}
              </CardTitle>
              {isWinner && <Crown className="h-6 w-6 text-gold" />}
            </div>
            {points !== undefined && (
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex items-center gap-0.5">
                  <Star className="h-5 w-5 text-gold" />
                  <span className="text-2xl font-bold text-warning">
                    {points}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  points
                </span>
              </div>
            )}
          </div>
          {showOwner && wizard.ownerUserId && (
            <div className="relative z-20 mt-2">
              <UserIdDisplay
                userId={wizard.ownerUserId}
                displayName={wizard.ownerDisplayName}
                size="sm"
                showAvatar={false}
              />
            </div>
          )}
          {hitPoints !== undefined && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Heart className="h-3 w-3 text-destructive" />
                  Health
                </span>
                <span className="font-medium text-foreground">
                  {hitPoints}/{maxHitPoints}
                </span>
              </div>
              <Progress
                value={(hitPoints / maxHitPoints) * 100}
                className={`h-2 ${
                  hitPoints / maxHitPoints > 0.6
                    ? "[&>div]:bg-success"
                    : hitPoints / maxHitPoints > 0.3
                      ? "[&>div]:bg-warning"
                      : "[&>div]:bg-destructive"
                }`}
              />
            </div>
          )}
        </CardHeader>

        {/* Action Buttons for User's Wizards */}
        {showActions && isUserWizard && (
          <CardContent className="pt-0 pb-4">
            <div className="flex gap-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="relative z-20 flex-1"
              >
                <Link href={`/campaign/wizard/${wizard._id}`}>
                  <Scroll className="h-3 w-3 mr-1" aria-hidden="true" />
                  Campaign
                </Link>
              </Button>
              <Button asChild size="sm" className="relative z-20 flex-1">
                <Link href={`/duels/create?wizardId=${wizard._id}`}>
                  <Swords className="h-3 w-3 mr-1" aria-hidden="true" />
                  Duel
                </Link>
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
});
