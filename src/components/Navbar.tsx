"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
        "flex items-center justify-between p-6",
        transparent
          ? "bg-transparent"
          : "bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm",
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
              "hover:bg-white/20",
              transparent ? "text-white hover:text-white" : "",
            )}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        )}
        <Link href="/">
          <h1
            className={cn(
              "text-2xl font-bold",
              transparent ? "text-white" : "",
            )}
          >
            AI Wizard Duel
          </h1>
        </Link>
      </div>
      <div className="flex items-center gap-4">
        {/* Controls moved to sidebar - keeping this div for potential future use */}
      </div>
    </nav>
  );
}
