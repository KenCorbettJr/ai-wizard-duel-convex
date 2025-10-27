"use client";

import { useEffect, useState } from "react";
import { Gift, Coins, Sparkles } from "lucide-react";

interface CreditCelebrationProps {
  show: boolean;
  creditsEarned: number;
  onComplete?: () => void;
  duration?: number;
}

export function CreditCelebration({
  show,
  creditsEarned,
  onComplete,
  duration = 3000,
}: CreditCelebrationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      // Use a timeout to avoid the setState in effect warning
      const showTimer = setTimeout(() => setIsVisible(true), 0);
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, duration);
      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [show, duration, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
      {/* Background overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-20 animate-fade-in" />

      {/* Main celebration */}
      <div className="relative animate-fade-in">
        {/* Sparkle effects */}
        <div className="absolute -top-8 -left-8 text-yellow-400 animate-bounce delay-100">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="absolute -top-6 -right-6 text-yellow-400 animate-bounce delay-300">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="absolute -bottom-4 -left-6 text-yellow-400 animate-bounce delay-500">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="absolute -bottom-6 -right-4 text-yellow-400 animate-bounce delay-700">
          <Sparkles className="h-4 w-4" />
        </div>

        {/* Main content */}
        <div className="bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 border-2 border-green-300 dark:border-green-600 rounded-2xl p-8 shadow-2xl transform animate-credit-pulse">
          <div className="text-center space-y-4">
            {/* Icon */}
            <div className="relative">
              <Gift className="h-16 w-16 mx-auto text-green-600 dark:text-green-400 animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 border-4 border-green-300 dark:border-green-600 rounded-full animate-ping opacity-30"></div>
              </div>
            </div>

            {/* Text */}
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-green-800 dark:text-green-200">
                Credit Earned!
              </h3>
              <div className="flex items-center justify-center gap-2 text-xl font-semibold text-green-700 dark:text-green-300">
                <Coins className="h-6 w-6 animate-spin" />
                <span className="animate-bounce">
                  +{creditsEarned} Image Credit{creditsEarned !== 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-sm text-green-600 dark:text-green-400">
                Ready for more magical duels!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-bounce"
            style={{
              left: `${20 + i * 10}%`,
              top: `${30 + (i % 3) * 20}%`,
              animationDelay: `${i * 200}ms`,
              animationDuration: "2s",
            }}
          >
            <Coins className="h-4 w-4 text-yellow-500 opacity-70" />
          </div>
        ))}
      </div>
    </div>
  );
}
