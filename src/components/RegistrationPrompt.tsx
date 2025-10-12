"use client";

import React from "react";
import { useUser, SignInButton, SignUpButton } from "@clerk/nextjs";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

interface RegistrationPromptProps {
  context?: "duel_access" | "ad_removal" | "premium_features";
  className?: string;
}

export function RegistrationPrompt({
  context = "ad_removal",
  className = "",
}: RegistrationPromptProps) {
  const { user } = useUser();

  // Don't show if user is already logged in
  if (user) {
    return null;
  }

  const getContextContent = () => {
    switch (context) {
      case "duel_access":
        return {
          title: "🎮 Join the Battle!",
          description:
            "Create an account to participate in wizard duels and challenge other players.",
          benefits: [
            "Participate in unlimited duels",
            "Create and customize your wizards",
            "Track your wins and losses",
            "Remove all advertisements",
          ],
        };

      case "ad_removal":
        return {
          title: "✨ Enjoy Ad-Free Experience",
          description:
            "Sign up now to remove all ads and unlock the full magical experience.",
          benefits: [
            "Complete ad-free browsing",
            "Access to all wizard features",
            "Participate in duels",
            "Track your magical journey",
          ],
        };

      case "premium_features":
        return {
          title: "🌟 Unlock Premium Features",
          description:
            "Create an account to access advanced wizard customization and premium content.",
          benefits: [
            "Advanced wizard customization",
            "Premium spell templates",
            "Exclusive magical items",
            "Ad-free experience",
          ],
        };

      default:
        return {
          title: "🎯 Join the Community",
          description:
            "Sign up to unlock all features and join the wizard dueling community.",
          benefits: [
            "Full access to all features",
            "Ad-free experience",
            "Community participation",
            "Progress tracking",
          ],
        };
    }
  };

  const content = getContextContent();

  return (
    <Card
      className={`p-6 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 border-purple-200 dark:border-purple-800 ${className}`}
    >
      <div className="text-center space-y-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {content.title}
        </h3>

        <p className="text-gray-600 dark:text-gray-400">
          {content.description}
        </p>

        <div className="space-y-2">
          {content.benefits.map((benefit, index) => (
            <div
              key={index}
              className="flex items-center justify-center space-x-2 text-sm text-gray-700 dark:text-gray-300"
            >
              <span className="text-green-500">✓</span>
              <span>{benefit}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <SignUpButton mode="modal">
            <Button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2">
              Sign Up Free
            </Button>
          </SignUpButton>

          <SignInButton mode="modal">
            <Button
              variant="outline"
              className="border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-600 dark:text-purple-300 dark:hover:bg-purple-950"
            >
              Sign In
            </Button>
          </SignInButton>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-500">
          Free forever • No credit card required • Join thousands of wizards
        </p>
      </div>
    </Card>
  );
}
