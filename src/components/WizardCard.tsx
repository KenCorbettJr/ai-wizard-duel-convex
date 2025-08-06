"use client";

import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  className?: string;
}

export function WizardCard({
  wizard,
  points,
  hitPoints,
  className = "",
}: WizardCardProps) {
  return (
    <Link
      href={`/wizards/${wizard._id}`}
      className={`flex flex-1 flex-col ${className}`}
    >
      <Card className="overflow-hidden bg-card/90 dark:bg-card/95 backdrop-blur-sm border-border/50 dark:border-border/30 shadow-lg dark:shadow-xl hover:shadow-xl dark:hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-[1.02] flex-1 pt-0 flex">
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
          {(points !== undefined || hitPoints !== undefined) && (
            <div className="absolute top-4 right-4 flex gap-2">
              {points !== undefined && (
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1 bg-yellow-100/90 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 border-yellow-200/50 dark:border-yellow-700/30 backdrop-blur-sm"
                >
                  <Star className="h-3 w-3" />
                  {points}
                </Badge>
              )}
              {hitPoints !== undefined && (
                <Badge
                  variant="destructive"
                  className="flex items-center gap-1 bg-red-100/90 dark:bg-red-900/50 text-red-800 dark:text-red-200 border-red-200/50 dark:border-red-700/30 backdrop-blur-sm"
                >
                  <Heart className="h-3 w-3" />
                  {hitPoints}
                </Badge>
              )}
            </div>
          )}
        </div>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl text-foreground dark:text-foreground/95">
            {wizard.name}
          </CardTitle>
          <CardDescription className="dark:text-muted-foreground/80">
            {wizard.description}
          </CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}
