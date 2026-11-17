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
import { RuneSpinner } from "@/components/ui/rune-spinner";

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
    <Card className="bg-card/95 backdrop-blur-md border-2 border-primary/50 shadow-2xl dark:shadow-3xl transition-all duration-300 ease-in-out gap-3 fixed -bottom-3 w-full z-50 max-w-4xl">
      <CardHeader className="gap-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-foreground text-lg">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            {wizardName}&apos;s Actions for Round {currentRound}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsModalCollapsed(!isModalCollapsed)}
            className="size-11 p-0 hover:bg-primary/20 text-primary"
            aria-label={
              isModalCollapsed ? "Expand spell panel" : "Collapse spell panel"
            }
            aria-expanded={!isModalCollapsed}
          >
            {isModalCollapsed ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
        {!isModalCollapsed && (
          <CardDescription className=" text-sm">
            Describe the magical spell {wizardName} will cast this round
          </CardDescription>
        )}
      </CardHeader>
      {!isModalCollapsed && (
        <CardContent className="pt-0">
          <div className="space-y-3">
            <textarea
              aria-label={`Describe what ${wizardName} will do in round ${currentRound}`}
              value={spellDescription}
              onChange={(e) => onSpellDescriptionChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`What will ${wizardName} do in round ${currentRound}?`}
              className="w-full p-3 border border-input/50 bg-background/50 text-foreground rounded-lg resize-none h-24 placeholder:text-muted-foreground/60 dark:placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all backdrop-blur-sm text-sm"
              disabled={isCasting}
            />
            <Button
              onClick={onCastSpell}
              disabled={!spellDescription.trim() || isCasting}
              className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCasting ? (
                <>
                  <RuneSpinner size="sm" label="Loading" />
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
