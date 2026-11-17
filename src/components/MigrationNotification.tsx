"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, User, Gift } from "lucide-react";
import Link from "next/link";

interface MigrationNotificationProps {
  show: boolean;
  onDismiss: () => void;
}

export function MigrationNotification({
  show,
  onDismiss,
}: MigrationNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      // Delay showing the notification to avoid jarring transitions
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    } else {
      // Use a timeout to avoid the setState in effect warning
      const timer = setTimeout(() => setIsVisible(false), 0);
      return () => clearTimeout(timer);
    }
  }, [show]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm animate-in slide-in-from-right-full duration-300">
      <Card className="border-primary/30 bg-linear-to-r from-primary/15 to-gold/20 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-primary/12 rounded-lg">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-sm text-primary">
                  Complete Your Profile
                </h4>
                <Badge
                  variant="secondary"
                  className="bg-success/15 text-success text-xs"
                >
                  <Gift className="h-2.5 w-2.5 mr-1" />
                  Free
                </Badge>
              </div>
              <p className="text-xs text-primary mb-3">
                Get your unique @handle and unlock the full wizard experience!
              </p>
              <div className="flex gap-2">
                <Button asChild size="sm" className="text-xs h-7">
                  <Link href="/profile/setup">Set Up Now</Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDismiss}
                  className="text-xs h-7 text-primary hover:text-primary hover:bg-primary/12"
                >
                  Later
                </Button>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-6 w-6 p-0 text-primary hover:text-primary"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
