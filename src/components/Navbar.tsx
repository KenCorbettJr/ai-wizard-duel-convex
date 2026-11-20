"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft } from "lucide-react";

interface NavbarProps {
  transparent?: boolean;
  className?: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
}

export function Navbar({
  transparent = false,
  className,
  showBackButton = false,
  onBackClick,
}: NavbarProps) {
  return (
    <nav
      className={cn(
        "flex items-center justify-between p-4 sm:p-6",
        transparent ? "bg-transparent" : "bg-background/80 backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex items-center gap-4">
        {showBackButton && onBackClick && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBackClick}
            className={cn(
              "hover:bg-accent",
              transparent ? "text-white hover:text-white" : "",
            )}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        )}
        <Link href="/" className="inline-flex min-h-11 items-center">
          <span
            className={cn(
              "block text-lg sm:text-2xl font-bold font-display",
              transparent ? "text-white" : "",
            )}
          >
            AI Wizard Duel
          </span>
        </Link>
      </div>
      <div className="flex items-center gap-1 sm:gap-3">
        <Link
          href="/#pricing"
          className={cn(
            "rounded-lg px-3 py-2 text-sm font-semibold hover:underline underline-offset-4 min-h-11 inline-flex items-center",
            transparent ? "text-white" : "text-foreground",
          )}
        >
          Pricing
        </Link>
        <Link
          href="/leaderboard"
          className={cn(
            "rounded-lg px-3 py-2 text-sm font-semibold hover:underline underline-offset-4 min-h-11 inline-flex items-center",
            transparent ? "text-white" : "text-foreground",
          )}
        >
          Leaderboard
        </Link>
        <Link
          href="/duels/watch"
          className={cn(
            "hidden sm:inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold hover:underline underline-offset-4 min-h-11",
            transparent ? "text-white" : "text-foreground",
          )}
        >
          Watch Duels
        </Link>
        <ThemeToggle />
      </div>
    </nav>
  );
}
