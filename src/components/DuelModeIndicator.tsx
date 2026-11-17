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
        className={`bg-success/15 text-success ${className}`}
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
      <Card className={`border-warning/40 bg-warning/10 ${className}`}>
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            {getReasonIcon(textOnlyReason)}
            <div>
              <div className="font-medium text-warning">Text-Only Mode</div>
              <div className="text-sm text-warning">
                {getReasonText(textOnlyReason)}
              </div>
              {textOnlyReason === "insufficient_credits" && (
                <div className="text-xs text-warning mt-1">
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
      className={`bg-warning/15 text-warning ${className}`}
    >
      {getReasonIcon(textOnlyReason)}
      Text Mode
    </Badge>
  );
}
