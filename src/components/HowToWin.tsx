import { Heart, Star, Skull, Trophy, Scale, Sparkles } from "lucide-react";
import { TO_THE_DEATH_MAX_ROUNDS } from "../../convex/lib/pricing";

const WAYS_TO_WIN = [
  {
    icon: Skull,
    title: "Knockout",
    text: "Drop your rival to 0 health and you win on the spot, whatever the points.",
  },
  {
    icon: Trophy,
    title: "Most points",
    text: "Both still standing after the last round? Most points wins, even with less health.",
  },
  {
    icon: Scale,
    title: "Tiebreaker",
    text: "Points exactly tied? More health wins. Tied on both? It's a draw.",
  },
];

const POINT_TIPS = [
  "Be specific: “a swarm of lightning bees” beats “I attack”",
  "React to your rival's last move",
  "Don't repeat the same spell",
  "Clever attacks outscore just blocking",
];

/**
 * The scoring rules in plain, playful language. Mirrors
 * checkDuelEndConditions in convex/duels.ts.
 */
export function HowToWin() {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-card/60 p-4">
          <h3 className="flex items-center gap-2 font-semibold">
            <Heart className="size-4 text-success" aria-hidden="true" />
            Health keeps you in the fight
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Everyone starts with 100. Hit 0 and you&apos;re knocked out.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card/60 p-4">
          <h3 className="flex items-center gap-2 font-semibold">
            <Star className="size-4 text-gold" aria-hidden="true" />
            Points win it
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Each round the judge awards 0 to 10 for clever, creative magic,
            with a dash of luck.
          </p>
        </div>
      </div>

      <ol className="space-y-3">
        {WAYS_TO_WIN.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Icon className="size-4" aria-hidden="true" />
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{title}.</span>{" "}
              {text}
            </p>
          </li>
        ))}
      </ol>

      <p className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-muted-foreground">
        <strong className="text-foreground">
          Yes, you can lose with more health!
        </strong>{" "}
        A wizard with 85 health and 31 points loses to one with 40 health and
        36 points. Tougher isn&apos;t the same as more impressive.
      </p>

      <div className="text-sm text-muted-foreground">
        <p className="mb-1 flex items-center gap-2 font-semibold text-foreground">
          <Sparkles className="size-4 text-gold" aria-hidden="true" />
          Score more points
        </p>
        <ul className="list-disc space-y-0.5 pl-5">
          {POINT_TIPS.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-muted-foreground">
        To the Death duels stop at {TO_THE_DEATH_MAX_ROUNDS} rounds. If nobody
        has fallen by then, points decide.
      </p>
    </div>
  );
}
