"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Sparkles, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SPELL_A =
  "A phoenix made of crystalline ice, diving from the storm clouds.";
const SPELLS_B = [
  {
    spell: "A wall of roaring flame, shaped like an enormous open umbrella.",
    narration:
      "The ice phoenix screams down through the thunderheads just as the flaming umbrella snaps open. Ice meets fire in a burst of steam, and the phoenix, half melted and wholly offended, skids across the arena into a very surprised wizard. Points to the umbrella. Dignity to nobody.",
    result: "Wizard B +3 points. Wizard A takes 2 damage.",
  },
  {
    spell: "A sleepy dragon who would honestly rather not be here.",
    narration:
      "The dragon yawns just as the phoenix dives, and the warm updraft carries the bird straight past him. Wizard A overshoots the arena, lands in a snowdrift of his own making, and the dragon goes back to sleep. Nobody has ever looked less threatened.",
    result: "Wizard A +2 points for style. Wizard B +1 for napping.",
  },
  {
    spell:
      "A thousand tiny mirrors that reflect every spell back at the caster.",
    narration:
      "The phoenix shrieks into the glittering field and meets itself a thousand times over. The reflected birds collide, shatter and rain down as glittering frost across both wizards. It is beautiful, and extremely cold for everyone.",
    result: "Both wizards take 1 damage. Wizard B +2 points.",
  },
] as const;

export default function RoundReplay() {
  const [revealed, setRevealed] = useState(false);
  const [choice, setChoice] = useState(0);
  const picked = SPELLS_B[choice];

  return (
    <div className="mx-auto grid max-w-5xl items-start gap-8 md:grid-cols-2">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Wizard A has already cast, in secret
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="italic">&ldquo;{SPELL_A}&rdquo;</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              You are Wizard B. Pick your spell, in secret
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              role="radiogroup"
              aria-label="Wizard B spell"
              className="space-y-2"
            >
              {SPELLS_B.map((option, i) => (
                <button
                  key={option.spell}
                  type="button"
                  role="radio"
                  aria-checked={choice === i}
                  onClick={() => {
                    setChoice(i);
                    setRevealed(false);
                  }}
                  className={`w-full rounded-md border px-3 py-2 text-left italic transition-colors ${
                    choice === i
                      ? "border-gold bg-secondary/60"
                      : "hover:bg-secondary/30"
                  }`}
                >
                  &ldquo;{option.spell}&rdquo;
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
        {!revealed && (
          <Button
            size="lg"
            variant="gold"
            className="w-full text-lg"
            onClick={() => setRevealed(true)}
          >
            <Sparkles aria-hidden="true" />
            Cast and reveal
          </Button>
        )}
      </div>

      <div aria-live="polite">
        {revealed ? (
          <Card className="overflow-hidden border-gold/60">
            <div className="relative h-56 md:h-64">
              <Image
                src="/images/ice-phoenix.jpeg"
                alt="A crystalline ice phoenix diving through storm clouds"
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="size-4 text-gold" aria-hidden="true" />
                The AI narrates both at once
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{picked.narration}</p>
              <p className="mt-3 rounded-md bg-secondary/50 px-3 py-2 text-sm font-semibold">
                Round result: {picked.result}
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Illustrative example. Every real duel is different.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button asChild variant="gold">
                  <Link href="/sign-up">Now write yours: sign up free</Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRevealed(false)}
                >
                  <RotateCcw aria-hidden="true" />
                  Replay
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex h-full min-h-64 items-center justify-center border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              Neither wizard sees the other&apos;s spell. Hit reveal to see what
              the AI makes of the collision.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
