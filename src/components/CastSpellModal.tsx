"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";

interface CastSpellModalProps {
  currentRound: number;
  wizardName: string;
  spellDescription: string;
  onSpellDescriptionChange: (value: string) => void;
  onCastSpell: () => void;
  isCasting: boolean;
}

export function CastSpellModal({
  currentRound,
  wizardName,
  spellDescription,
  onSpellDescriptionChange,
  onCastSpell,
  isCasting,
}: CastSpellModalProps) {
  const [isModalCollapsed, setIsModalCollapsed] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (!isCasting && spellDescription.trim()) {
        onCastSpell();
      }
    }
  };

  return (
    <Card className="bg-card/95 dark:bg-card/98 backdrop-blur-md border-2 border-purple-500/50 dark:border-purple-400/50 shadow-2xl dark:shadow-3xl transition-all duration-300 ease-in-out gap-3 fixed -bottom-3 w-full z-50 max-w-4xl">
      <CardHeader className="gap-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-foreground dark:text-foreground/95 text-lg">
            <Sparkles className="h-5 w-5 text-purple-500 dark:text-purple-400 animate-pulse" />
            {wizardName}&apos;s Actions for Round {currentRound}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsModalCollapsed(!isModalCollapsed)}
            className="h-8 w-8 p-0 hover:bg-purple-100/50 dark:hover:bg-purple-900/30 text-purple-600 dark:text-purple-400"
          >
            {isModalCollapsed ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
        {!isModalCollapsed && (
          <CardDescription className="dark:text-muted-foreground/80 text-sm">
            Describe the magical spell {wizardName} will cast this round
          </CardDescription>
        )}
      </CardHeader>
      {!isModalCollapsed && (
        <CardContent className="pt-0">
          <div className="space-y-3">
            <textarea
              value={spellDescription}
              onChange={(e) => onSpellDescriptionChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`What will ${wizardName} do in round ${currentRound}?`}
              className="w-full p-3 border border-input/50 dark:border-input/30 bg-background/50 dark:bg-background/30 text-foreground dark:text-foreground/95 rounded-lg resize-none h-24 placeholder:text-muted-foreground/60 dark:placeholder:text-muted-foreground/50 focus:border-purple-500/50 dark:focus:border-purple-400/50 focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20 transition-all backdrop-blur-sm text-sm"
              disabled={isCasting}
            />
            <Button
              onClick={onCastSpell}
              disabled={!spellDescription.trim() || isCasting}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 dark:from-purple-500 dark:to-pink-500 dark:hover:from-purple-600 dark:hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCasting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-2"></div>
                  Submitting Actions...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Submit {wizardName}&apos;s Actions for Round {currentRound}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
