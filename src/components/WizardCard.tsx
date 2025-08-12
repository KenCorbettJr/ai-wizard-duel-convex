"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Star, Heart } from "lucide-react";
import { ConvexImage } from "@/components/ConvexImage";
import { Id } from "../../convex/_generated/dataModel";

interface WizardCardProps {
  wizard: {
    _id: Id<"wizards">;
    name: string;
    description: string;
    illustration?: string; // This is a storage ID string, not Id<"_storage">
  };
  points?: number;
  hitPoints?: number;
  maxHitPoints?: number;
  className?: string;
  isUserWizard?: boolean;
}

export function WizardCard({
  wizard,
  points,
  hitPoints,
  maxHitPoints = 100,
  className = "",
  isUserWizard = false,
}: WizardCardProps) {
  return (
    <Link
      href={`/wizards/${wizard._id}`}
      className={`flex flex-1 flex-col ${className}`}
    >
      <Card
        className={`overflow-hidden bg-card/90 dark:bg-card/95 backdrop-blur-sm shadow-lg dark:shadow-xl hover:shadow-xl dark:hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-[1.02] flex-1 pt-0 flex ${
          isUserWizard
            ? "border-2 border-blue-500/70 dark:border-blue-400/70 ring-2 ring-blue-500/20 dark:ring-blue-400/20"
            : "border-border/50 dark:border-border/30"
        }`}
      >
        <div className="relative">
          {wizard.illustration && (
            <div className="h-60 w-full overflow-hidden">
              <ConvexImage
                storageId={wizard.illustration}
                alt={wizard.name}
                width={400}
                height={192}
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              />
            </div>
          )}
          <div className="absolute top-4 right-4 flex gap-2">
            {isUserWizard && (
              <Badge
                variant="default"
                className="flex items-center gap-1 bg-blue-100/90 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border-blue-200/50 dark:border-blue-700/30 backdrop-blur-sm font-semibold"
              >
                Your Wizard
              </Badge>
            )}
          </div>
        </div>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-xl text-foreground dark:text-foreground/95">
              {wizard.name}
            </CardTitle>
            {points !== undefined && (
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex items-center gap-0.5">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {points}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  points
                </span>
              </div>
            )}
          </div>
          {hitPoints !== undefined && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Heart className="h-3 w-3 text-red-500" />
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
                    ? "[&>div]:bg-green-500"
                    : hitPoints / maxHitPoints > 0.3
                      ? "[&>div]:bg-yellow-500"
                      : "[&>div]:bg-red-500"
                }`}
              />
            </div>
          )}
        </CardHeader>
      </Card>
    </Link>
  );
}
