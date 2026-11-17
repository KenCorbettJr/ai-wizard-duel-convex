"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Scroll, Wand2, Target, Crown } from "lucide-react";

interface CampaignLoadingStateProps {
  type?: "opponents" | "wizards" | "battle" | "progress" | "general";
  message?: string;
  className?: string;
}

export function CampaignLoadingState({
  type = "general",
  message,
  className = "",
}: CampaignLoadingStateProps) {
  const getLoadingConfig = () => {
    switch (type) {
      case "opponents":
        return {
          icon: Target,
          title: "Loading Opponents",
          defaultMessage: "Preparing your campaign opponents...",
          color: "text-destructive",
        };
      case "wizards":
        return {
          icon: Wand2,
          title: "Loading Wizards",
          defaultMessage: "Gathering your wizard data...",
          color: "text-info",
        };
      case "battle":
        return {
          icon: Crown,
          title: "Starting Battle",
          defaultMessage: "Preparing for epic combat...",
          color: "text-warning",
        };
      case "progress":
        return {
          icon: Scroll,
          title: "Loading Progress",
          defaultMessage: "Calculating campaign progress...",
          color: "text-success",
        };
      default:
        return {
          icon: Scroll,
          title: "Loading Campaign",
          defaultMessage: "Preparing your campaign data...",
          color: "text-primary",
        };
    }
  };

  const config = getLoadingConfig();
  const Icon = config.icon;

  return (
    <Card className={`campaign-gradient-bg ${className}`}>
      <CardContent className="py-12 text-center">
        <div className="relative mb-6">
          <div className="campaign-loading rounded-full h-16 w-16 border-4 border-primary/30 border-t-purple-600 mx-auto"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon className={`h-6 w-6 ${config.color}`} />
          </div>
        </div>

        <h3 className="text-lg font-semibold mb-2 text-gold-gradient font-display">
          {config.title}
        </h3>

        <p className="text-muted-foreground mb-4">
          {message || config.defaultMessage}
        </p>

        <div className="flex justify-center">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
            <div
              className="w-2 h-2 bg-primary rounded-full animate-bounce"
              style={{ animationDelay: "0.1s" }}
            ></div>
            <div
              className="w-2 h-2 bg-primary rounded-full animate-bounce"
              style={{ animationDelay: "0.2s" }}
            ></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Skeleton loading components for different campaign elements
export function CampaignOpponentSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-16"></div>
            <div className="h-5 bg-muted rounded w-32"></div>
          </div>
          <div className="space-y-1">
            <div className="h-6 bg-muted rounded w-20"></div>
            <div className="h-4 bg-muted rounded w-16"></div>
          </div>
        </div>
        <div className="h-12 bg-muted rounded"></div>
        <div className="space-y-2">
          <div className="h-3 bg-muted rounded w-20"></div>
          <div className="h-6 bg-muted rounded w-24"></div>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-muted rounded w-24"></div>
          <div className="flex gap-1">
            <div className="h-5 bg-muted rounded w-16"></div>
            <div className="h-5 bg-muted rounded w-20"></div>
          </div>
        </div>
        <div className="h-8 bg-muted rounded"></div>
      </CardContent>
    </Card>
  );
}

export function CampaignWizardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-5 bg-muted rounded w-32"></div>
          <div className="h-6 bg-muted rounded w-20"></div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <div className="h-3 bg-muted rounded w-24"></div>
            <div className="h-3 bg-muted rounded w-12"></div>
          </div>
          <div className="h-2 bg-muted rounded"></div>
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded w-28"></div>
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="w-8 h-8 bg-muted rounded-full"></div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
