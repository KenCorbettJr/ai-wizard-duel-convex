"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wizard } from "@/types/wizard";
import Image from "next/image";
import Link from "next/link";
import { ConvexImage } from "./ConvexImage";

interface WizardCardProps {
  wizard: Wizard;
  onEdit?: (wizard: Wizard) => void;
  onDelete?: (wizardId: string) => void;
  onDuel?: (wizard: Wizard) => void;
  onRegenerateIllustration?: (wizardId: string) => void;
}

export function WizardCard({ wizard, onEdit, onDelete, onDuel, onRegenerateIllustration }: WizardCardProps) {
  const winRate = wizard.wins && wizard.losses 
    ? Math.round((wizard.wins / (wizard.wins + wizard.losses)) * 100)
    : 0;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Link 
                href={`/wizards/${wizard._id}`}
                className="hover:text-blue-600 transition-colors"
              >
                {wizard.name}
              </Link>
              {wizard.isAIPowered && (
                <Badge variant="secondary" className="text-xs">
                  🤖 AI
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              {wizard.description}
            </CardDescription>
          </div>
          {(wizard.illustrationURL || wizard.illustration) && (
            <div className="ml-4 flex-shrink-0">
              {wizard.illustration ? (
                <ConvexImage
                  storageId={wizard.illustration}
                  alt={wizard.name}
                  width={60}
                  height={60}
                  className="rounded-lg object-cover"
                />
              ) : wizard.illustrationURL ? (
                <Image
                  src={wizard.illustrationURL}
                  alt={wizard.name}
                  width={60}
                  height={60}
                  className="rounded-lg object-cover"
                />
              ) : null}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
          <div className="flex gap-4">
            <span>🏆 {wizard.wins || 0} wins</span>
            <span>💀 {wizard.losses || 0} losses</span>
            {(wizard.wins || wizard.losses) && (
              <span>📊 {winRate}% win rate</span>
            )}
          </div>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Link href={`/wizards/${wizard._id}`}>
            <Button 
              size="sm" 
              variant="outline"
              className="flex-1"
            >
              👁️ View
            </Button>
          </Link>
          {onDuel && (
            <Button 
              size="sm" 
              onClick={() => onDuel(wizard)}
              className="flex-1"
            >
              ⚔️ Duel
            </Button>
          )}
          {onEdit && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => onEdit(wizard)}
            >
              ✏️ Edit
            </Button>
          )}
          {wizard.isAIPowered && onRegenerateIllustration && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => onRegenerateIllustration(wizard._id)}
              title="Regenerate AI illustration"
            >
              🎨
            </Button>
          )}
          {onDelete && (
            <Button 
              size="sm" 
              variant="destructive" 
              onClick={() => onDelete(wizard._id)}
            >
              🗑️
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}