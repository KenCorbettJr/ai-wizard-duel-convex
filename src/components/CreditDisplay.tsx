"use client";

import React from "react";
import { useUser } from "@clerk/nextjs";
import { useAnonymousCredits } from "../hooks/useAnonymousCredits";
import { Card, CardContent } from "./ui/card";
import { Coins, Infinity } from "lucide-react";

interface CreditDisplayProps {
  className?: string;
  showLabel?: boolean;
}

export function CreditDisplay({
  className = "",
  showLabel = true,
}: CreditDisplayProps) {
  const { user } = useUser();
  const { credits, isLoading } = useAnonymousCredits();

  if (user) {
    // Logged-in users have unlimited credits
    return (
      <Card className={`${className}`}>
        <CardContent className="p-3 flex items-center gap-2">
          <Infinity className="h-4 w-4 text-green-600 dark:text-green-400" />
          {showLabel && (
            <span className="text-sm font-medium text-green-600 dark:text-green-400">
              Unlimited Credits
            </span>
          )}
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-3 flex items-center gap-2">
          <div className="h-4 w-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse" />
          {showLabel && (
            <div className="h-4 w-16 bg-gray-300 dark:bg-gray-600 rounded animate-pulse" />
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`${className} ${credits === 0 ? "border-red-200 dark:border-red-800" : "border-blue-200 dark:border-blue-800"}`}
    >
      <CardContent className="p-3 flex items-center gap-2">
        <Coins
          className={`h-4 w-4 ${credits === 0 ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`}
        />
        {showLabel && (
          <span
            className={`text-sm font-medium ${credits === 0 ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`}
          >
            {credits} {credits === 1 ? "Credit" : "Credits"}
          </span>
        )}
        {!showLabel && (
          <span
            className={`text-sm font-medium ${credits === 0 ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`}
          >
            {credits}
          </span>
        )}
      </CardContent>
    </Card>
  );
}
