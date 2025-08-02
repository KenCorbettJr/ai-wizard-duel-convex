"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wizard } from "@/types/wizard";
import Image from "next/image";

interface WizardCardProps {
  wizard: Wizard;
  onEdit?: (wizard: Wizard) => void;
  onDelete?: (wizardId: string) => void;
  onDuel?: (wizard: Wizard) => void;
}

export function WizardCard({ wizard, onEdit, onDelete, onDuel }: WizardCardProps) {
  const winRate = wizard.wins && wizard.losses 
    ? Math.round((wizard.wins / (wizard.wins + wizard.losses)) * 100)
    : 0;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {wizard.name}
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
          {wizard.illustrationURL && (
            <div className="ml-4 flex-shrink-0">
              <Image
                src={wizard.illustrationURL}
                alt={wizard.name}
                width={60}
                height={60}
                className="rounded-lg object-cover"
              />
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
        
        <div className="flex gap-2">
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