"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ImageIcon, FileTextIcon, CreditCardIcon } from "lucide-react";

interface DuelModeIndicatorProps {
  textOnlyMode?: boolean;
  textOnlyReason?: string;
  className?: string;
  showDetails?: boolean;
}

export function DuelModeIndicator({
  textOnlyMode = false,
  textOnlyReason,
  className = "",
  showDetails = false,
}: DuelModeIndicatorProps) {
  if (!textOnlyMode) {
    return (
      <Badge
        variant="default"
        className={`bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 ${className}`}
      >
        <ImageIcon className="w-3 h-3 mr-1" />
        Image Mode
      </Badge>
    );
  }

  const getReasonText = (reason?: string) => {
    switch (reason) {
      case "insufficient_credits":
        return "Insufficient image credits";
      case "credit_consumption_failed":
        return "Credit processing failed";
      case "image_generation_failed":
        return "Image generation failed";
      default:
        return "Text-only mode";
    }
  };

  const getReasonIcon = (reason?: string) => {
    switch (reason) {
      case "insufficient_credits":
      case "credit_consumption_failed":
        return <CreditCardIcon className="w-3 h-3 mr-1" />;
      default:
        return <FileTextIcon className="w-3 h-3 mr-1" />;
    }
  };

  if (showDetails) {
    return (
      <Card
        className={`border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/50 ${className}`}
      >
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            {getReasonIcon(textOnlyReason)}
            <div>
              <div className="font-medium text-orange-800 dark:text-orange-200">
                Text-Only Mode
              </div>
              <div className="text-sm text-orange-600 dark:text-orange-300">
                {getReasonText(textOnlyReason)}
              </div>
              {textOnlyReason === "insufficient_credits" && (
                <div className="text-xs text-orange-500 dark:text-orange-400 mt-1">
                  Watch ads or upgrade to premium for illustrated duels
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Badge
      variant="secondary"
      className={`bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 ${className}`}
    >
      {getReasonIcon(textOnlyReason)}
      Text Mode
    </Badge>
  );
}
