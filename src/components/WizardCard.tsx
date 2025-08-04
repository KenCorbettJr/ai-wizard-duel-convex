"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wizard } from "@/types/wizard";
import Image from "next/image";
import Link from "next/link";
import { ConvexImage } from "./ConvexImage";
import { Trophy, Skull, BarChart3, Bot } from "lucide-react";

interface WizardCardProps {
  wizard: Wizard;
}

export function WizardCard({ wizard }: WizardCardProps) {
  const winRate =
    wizard.wins && wizard.losses
      ? Math.round((wizard.wins / (wizard.wins + wizard.losses)) * 100)
      : 0;

  return (
    <Link href={`/wizards/${wizard._id}`} className="block">
      <Card className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer overflow-hidden p-0">
        {/* Large wizard image at the top */}
        {(wizard.illustrationURL || wizard.illustration) && (
          <div className="relative w-full h-56 overflow-hidden">
            {wizard.illustration ? (
              <ConvexImage
                storageId={wizard.illustration}
                alt={wizard.name}
                width={400}
                height={224}
                className="w-full h-full object-cover"
              />
            ) : wizard.illustrationURL ? (
              <Image
                src={wizard.illustrationURL}
                alt={wizard.name}
                width={400}
                height={224}
                className="w-full h-full object-cover"
              />
            ) : null}
          </div>
        )}

        <CardHeader className="pb-3 px-6 pt-6">
          <CardTitle className="text-lg flex items-center gap-2">
            {wizard.name}
            {wizard.isAIPowered && (
              <Badge
                variant="secondary"
                className="text-xs flex items-center gap-1"
              >
                <Bot className="w-3 h-3" />
                AI
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="mt-1">
            {wizard.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-0 px-6 pb-6">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Trophy className="w-4 h-4" />
              <span>{wizard.wins || 0} wins</span>
            </div>
            <div className="flex items-center gap-1">
              <Skull className="w-4 h-4" />
              <span>{wizard.losses || 0} losses</span>
            </div>
            {(wizard.wins || wizard.losses) && (
              <div className="flex items-center gap-1">
                <BarChart3 className="w-4 h-4" />
                <span>{winRate}% win rate</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
