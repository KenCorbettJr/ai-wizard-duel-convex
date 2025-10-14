"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Gift, Star, Users, ArrowRight } from "lucide-react";
import Link from "next/link";

interface MigrationPromptProps {
  context?: "wizard_creation" | "duel_participation" | "general";
  className?: string;
}

export function MigrationPrompt({
  context = "general",
  className = "",
}: MigrationPromptProps) {
  const getContextualContent = () => {
    switch (context) {
      case "wizard_creation":
        return {
          title: "Complete Your Profile to Create Wizards",
          description:
            "Set up your unique user ID to start creating magical wizards and join the community.",
          action: "Create wizards with your unique identity",
        };
      case "duel_participation":
        return {
          title: "Complete Your Profile to Join Duels",
          description:
            "Get your unique handle to participate in epic wizard battles and build your reputation.",
          action: "Join duels and compete with other wizards",
        };
      default:
        return {
          title: "Complete Your Wizard Profile",
          description:
            "Unlock the full AI Wizard Duel experience with your unique user identity.",
          action: "Access all features and build your reputation",
        };
    }
  };

  const content = getContextualContent();

  return (
    <Card
      className={`border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50 ${className}`}
    >
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
            <User className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">{content.title}</CardTitle>
            <CardDescription>{content.description}</CardDescription>
          </div>
          <Badge
            variant="secondary"
            className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
          >
            <Gift className="h-3 w-3 mr-1" />
            Free Setup
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h4 className="font-medium text-purple-900 dark:text-purple-100 flex items-center gap-2">
              <Star className="h-4 w-4" />
              What you'll get:
            </h4>
            <ul className="text-sm space-y-2 text-purple-700 dark:text-purple-300">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                Unique handle like @{"{username}"}
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                Public profile to showcase wizards
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                Recognition in the community
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                Easy sharing of achievements
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-purple-900 dark:text-purple-100 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Join thousands of wizards:
            </h4>
            <div className="text-sm text-purple-700 dark:text-purple-300 space-y-1">
              <p>✨ Create unlimited wizards</p>
              <p>🎮 Participate in epic duels</p>
              <p>🏆 Build your magical reputation</p>
              <p>🤝 Connect with other players</p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-purple-200 dark:border-purple-800">
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/profile/setup" className="flex-1">
              <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-200">
                Complete Profile Setup
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <div className="text-center sm:text-left">
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                Takes less than 2 minutes • Free forever
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
