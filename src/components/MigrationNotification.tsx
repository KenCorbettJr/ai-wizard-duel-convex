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
      setIsVisible(false);
    }
  }, [show]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm animate-in slide-in-from-right-full duration-300">
      <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/90 dark:to-pink-950/90 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <User className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-sm text-purple-900 dark:text-purple-100">
                  Complete Your Profile
                </h4>
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs"
                >
                  <Gift className="h-2.5 w-2.5 mr-1" />
                  Free
                </Badge>
              </div>
              <p className="text-xs text-purple-700 dark:text-purple-300 mb-3">
                Get your unique @handle and unlock the full wizard experience!
              </p>
              <div className="flex gap-2">
                <Link href="/profile/setup">
                  <Button
                    size="sm"
                    className="text-xs h-7 bg-purple-600 hover:bg-purple-700"
                  >
                    Set Up Now
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDismiss}
                  className="text-xs h-7 text-purple-600 hover:text-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900"
                >
                  Later
                </Button>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-6 w-6 p-0 text-purple-400 hover:text-purple-600"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
